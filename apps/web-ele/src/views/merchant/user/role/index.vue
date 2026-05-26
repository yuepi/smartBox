<script lang="ts" setup>
import { computed, nextTick, onMounted, reactive, ref } from "vue";

import { Page } from "@vben/common-ui";

import {
  Delete,
  Edit,
  InfoFilled,
  Plus,
  Refresh,
  Search,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import { type Dept, getMerchantDeptListApi } from "#/api/system/dept";
import { getMerchantMenuListApi } from "#/api/system/menu";
import {
  addMerchantRoleApi,
  deleteMerchantRoleApi,
  editMerchantRoleApi,
  getMerchantRoleDetailApi,
  getMerchantRolePageApi,
  type Role,
  type RolePageParams,
} from "#/api/system/role";
import MemberSelector from "#/components/MemberSelector/index.vue";
import {
  defaultRoleColumns,
  ROLE_STORAGE_KEY,
  type TableColumnConfig,
} from "#/constants/tableColumns";
import { ModuleCodeMap } from "#/hooks/useExport";
// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultRoleColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});
// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Role[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 表单弹窗控制
const formVisible = ref(false);
const formTitle = ref("");
const formData = ref<Partial<Role>>({});
const formSubmitting = ref(false);
const formRef = ref();

// Tab 切换
const activeTab = ref("basic");

// 菜单树相关
const menuTreeRef = ref();
const menuTreeData = ref<any[]>([]);
const menuLoading = ref(false);

// 数据权限相关
const deptTreeRef = ref();
const deptTreeData = ref<Dept[]>([]);
const deptLoading = ref(false);

// 状态选项
const statusOptions = [
  { label: "启用", value: 0 },
  { label: "禁用", value: 1 },
];

// 数据权限选项
const scopeOptions = [
  { label: "全部数据权限", value: 1 },
  { label: "自定数据权限", value: 2 },
];

// 查询参数
const queryParams = reactive<RolePageParams>({
  pageNo: 1,
  pageSize: 10,
  roleName: undefined,
  roleCode: undefined,
  status: undefined,
});

// --- 辅助函数 ---
function getStatusText(status: number): string {
  return status === 0 ? "启用" : "禁用";
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getMerchantRolePageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error("加载数据失败");
  } finally {
    loading.value = false;
  }
}

// --- 构建菜单树 ---
function buildMenuTree(menuList: any[], parentId: number = 0): any[] {
  const tree: any[] = [];
  for (const menu of menuList) {
    if (menu.parentId === parentId) {
      const children = buildMenuTree(menuList, menu.menuId);
      if (children.length > 0) {
        menu.children = children;
      }
      tree.push(menu);
    }
  }
  return tree;
}

// --- 构建部门树 ---
function buildDeptTree(deptList: Dept[], parentId: number = 0): Dept[] {
  const tree: Dept[] = [];
  for (const dept of deptList) {
    if (dept.parentId === parentId) {
      const children = buildDeptTree(deptList, dept.deptId);
      if (children.length > 0) {
        dept.children = children;
      }
      tree.push(dept);
    }
  }
  tree.sort((a, b) => (a.sort || 0) - (b.sort || 0));
  return tree;
}

// --- 递归获取所有叶子节点ID ---
function getAllLeafIds(nodes: any[]): number[] {
  const leafIds: number[] = [];
  const findLeafIds = (nodeList: any[]) => {
    nodeList.forEach((node) => {
      if (!node.children || node.children.length === 0) {
        leafIds.push(node.menuId || node.deptId);
      } else {
        findLeafIds(node.children);
      }
    });
  };
  findLeafIds(nodes);
  return leafIds;
}

// --- 递归找出传入ID中的叶子节点 ---
function filterLeafIds(nodes: any[], checkedIds: number[]): number[] {
  const leafKeys: number[] = [];
  const findLeafIds = (nodeList: any[]) => {
    nodeList.forEach((node) => {
      if (!node.children || node.children.length === 0) {
        if (checkedIds.includes(node.menuId || node.deptId)) {
          leafKeys.push(node.menuId || node.deptId);
        }
      } else {
        findLeafIds(node.children);
      }
    });
  };
  findLeafIds(nodes);
  return leafKeys;
}

// --- 加载菜单树 ---
async function loadMenuTree() {
  try {
    menuLoading.value = true;
    const res = await getMerchantMenuListApi();
    menuTreeData.value = buildMenuTree(res || []);

    await nextTick();

    if (menuTreeRef.value && formData.value.menuIds?.length) {
      // 只传叶子节点
      const leafKeys = filterLeafIds(
        menuTreeData.value,
        formData.value.menuIds
      );
      menuTreeRef.value.setCheckedKeys(leafKeys);
      console.log("菜单叶子节点回显:", leafKeys);
    }
  } catch (error) {
    console.error("加载菜单失败：", error);
    ElMessage.error("加载菜单权限失败");
  } finally {
    menuLoading.value = false;
  }
}

// --- 加载部门树 ---
async function loadDeptTree() {
  try {
    deptLoading.value = true;
    const res = await getMerchantDeptListApi({ status: 0 });
    deptTreeData.value = buildDeptTree(res || []);

    await nextTick();

    if (deptTreeRef.value && formData.value.deptIds?.length) {
      // 只传叶子节点
      const leafKeys = filterLeafIds(
        deptTreeData.value,
        formData.value.deptIds
      );
      deptTreeRef.value.setCheckedKeys(leafKeys);
      console.log("部门叶子节点回显:", leafKeys);
    }
  } catch (error) {
    console.error("加载部门树失败：", error);
    ElMessage.error("加载部门树失败");
  } finally {
    deptLoading.value = false;
  }
}

// --- 菜单树勾选变化 ---
function handleMenuTreeCheck() {
  if (menuTreeRef.value) {
    const checkedKeys = menuTreeRef.value.getCheckedKeys();
    const halfCheckedKeys = menuTreeRef.value.getHalfCheckedKeys();
    formData.value.menuIds = [...checkedKeys, ...halfCheckedKeys];
    console.log("菜单权限已更新:", formData.value.menuIds);
  }
}

// --- 部门树勾选变化 ---
function handleDeptTreeCheck() {
  if (deptTreeRef.value) {
    const checkedKeys = deptTreeRef.value.getCheckedKeys();
    const halfCheckedKeys = deptTreeRef.value.getHalfCheckedKeys();
    formData.value.deptIds = [...checkedKeys, ...halfCheckedKeys];
    console.log("部门权限已更新:", formData.value.deptIds);
  }
}

// --- 数据权限变化 ---
function handleScopeChange(scope: number) {
  if (scope !== 2) {
    // 不是自定义权限，清空已选部门
    formData.value.deptIds = [];
    if (deptTreeRef.value) {
      deptTreeRef.value.setCheckedKeys([]);
    }
  }
}

// --- Tab 点击事件 ---
const handleTabClick = async (tab: any) => {
  if (tab.paneName === "menu" && menuTreeData.value.length === 0) {
    await loadMenuTree();
  }
  if (tab.paneName === "dataScope" && deptTreeData.value.length === 0) {
    await loadDeptTree();
  }
};

// 成员选择变化
function handleMemberChange(members: any[]) {
  formData.value.members = members;
}

// --- 新增/编辑 ---
function handleAdd() {
  formTitle.value = "新增角色";
  activeTab.value = "basic";
  formData.value = {
    status: 0,
    sort: 0,
    scope: 1,
    members: [],
    menuIds: [],
    deptIds: [],
  };
  menuTreeData.value = [];
  deptTreeData.value = [];
  formVisible.value = true;
}

async function handleEdit(row: Role) {
  try {
    formTitle.value = "编辑角色";
    activeTab.value = "basic";
    const res = await getMerchantRoleDetailApi(row.roleId);
    formData.value = res || {};
    formData.value.menuIds = res.menuIds || [];
    formData.value.members = res.members || [];
    formData.value.deptIds = res.deptIds || [];
    menuTreeData.value = [];
    deptTreeData.value = [];
    formVisible.value = true;
  } catch {
    ElMessage.error("获取角色信息失败");
  }
}

async function handleSubmit() {
  if (!formData.value.roleName?.trim()) {
    ElMessage.warning("请输入角色名称");
    return;
  }
  if (!formData.value.roleCode?.trim()) {
    ElMessage.warning("请输入角色编码");
    return;
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.roleId
      ? editMerchantRoleApi
      : addMerchantRoleApi;
    await api(formData.value);
    ElMessage.success(formData.value.roleId ? "修改成功" : "新增成功");
    formVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    formSubmitting.value = false;
  }
}

// --- 删除 ---
async function handleDelete(row?: Role) {
  let ids: number[] = [];

  if (row) {
    ids = [row.roleId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning("请选择要删除的记录");
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条角色吗？`,
      "提示",
      { type: "warning" }
    );

    for (const id of ids) {
      await deleteMerchantRoleApi(id);
    }

    ElMessage.success(`成功删除 ${ids.length} 条角色`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

// 表格选中变化
function handleSelectionChange(selection: Role[]) {
  selectedIds.value = selection.map((item) => item.roleId);
}

// 搜索与重置
function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.roleName = undefined;
  queryParams.roleCode = undefined;
  queryParams.status = undefined;
  queryParams.pageNo = 1;
  loadData();
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-0">
      <!-- 查询表单 -->
      <el-card shadow="never" class="border-none mb-4 !p-2">
        <el-form
          :inline="true"
          :model="queryParams"
          class="flex flex-wrap gap-x-2 gap-y-2 items-center"
        >
          <el-form-item class="!mb-0 !mr-2">
            <el-input
              v-model="queryParams.roleName"
              placeholder="请输入"
              clearable
              style="width: 200px"
              @keyup.enter="handleQuery"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">角色名称:</span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-input
              v-model="queryParams.roleCode"
              placeholder="请输入"
              clearable
              style="width: 200px"
              @keyup.enter="handleQuery"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">角色编码:</span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select
              v-model="queryParams.status"
              clearable
              style="width: 200px"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">状态:</span>
              </template>
              <el-option
                v-for="item in statusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-0 md:ml-auto flex items-center gap-1">
            <el-tooltip content="查询" placement="top">
              <el-button
                type="primary"
                :icon="Search"
                circle
                @click="handleQuery"
              />
            </el-tooltip>
            <el-tooltip content="重置" placement="top">
              <el-button :icon="Refresh" circle @click="resetQuery" />
            </el-tooltip>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 -->
      <el-card shadow="never" class="border-none !p-2">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <el-button
              type="primary"
              plain
              :icon="Plus"
              @click="handleAdd"
              v-access:code="['plat:role:add']"
            >
              新增角色
            </el-button>
            <ExportButton
              :module-code="ModuleCodeMap.ROLE"
              :fields="visibleColumns"
              :find-cond="queryParams"
            />
            <el-button
              type="danger"
              plain
              :icon="Delete"
              :disabled="selectedIds.length === 0"
              @click="handleDelete"
              v-access:code="['plat:role:del']"
            >
              批量删除
            </el-button>
            <span
              v-if="selectedIds.length > 0"
              class="text-xs text-gray-400 ml-2"
            >
              已选
              <span class="text-red-500 font-medium">{{
                selectedIds.length
              }}</span>
              项
            </span>
          </div>

          <div class="flex items-center">
            <ColumnSelector
              :storage-key="ROLE_STORAGE_KEY"
              :default-columns="defaultRoleColumns"
              @update:columns="handleColumnsUpdate"
            />
          </div>
        </div>

        <el-table
          v-loading="loading"
          :data="tableData"
          border
          stripe
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <!-- 选择列固定写死 -->
          <el-table-column type="selection" width="50" align="center" />

          <!-- 动态数据列 -->
          <el-table-column
            v-for="col in visibleColumns"
            :key="col.key"
            :prop="col.key"
            :label="col.label"
            :width="typeof col.width === 'number' ? col.width : undefined"
            :min-width="col.minWidth"
            :align="col.align"
            :show-overflow-tooltip="col.showOverflowTooltip || false"
          >
            <template #default="{ row }">
              <!-- 状态 -->
              <template v-if="col.key === 'status'">
                <el-tag
                  :type="row.status === 0 ? 'success' : 'danger'"
                  size="small"
                  round
                  effect="light"
                >
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
              <!-- 排序 -->
              <template v-else-if="col.key === 'sort'">
                {{ row.sort || 0 }}
              </template>
              <!-- 普通字段 -->
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <!-- 操作列固定写死 -->
          <el-table-column
            label="操作"
            width="150"
            fixed="right"
            align="center"
          >
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                :icon="Edit"
                @click="handleEdit(row)"
                v-access:code="['plat:role:edit']"
              >
                编辑
              </el-button>
              <el-button
                link
                type="danger"
                :icon="Delete"
                @click="handleDelete(row)"
                v-access:code="['plat:role:del']"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="flex justify-end mt-4">
          <el-pagination
            v-model:current-page="queryParams.pageNo"
            v-model:page-size="queryParams.pageSize"
            :total="total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="loadData"
            @current-change="loadData"
          />
        </div>
      </el-card>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="formVisible"
      :title="formTitle"
      width="900px"
      append-to-body
      class="rounded-xl overflow-hidden shadow-2xl"
    >
      <el-tabs
        v-model="activeTab"
        type="border-card"
        class="border-none shadow-none !bg-transparent"
        @tab-click="handleTabClick"
      >
        <el-tab-pane
          label="基本信息"
          name="basic"
          class="p-4 bg-white dark:bg-[#18181c]"
        >
          <el-form ref="formRef" :model="formData" label-position="top">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              <el-form-item
                label="角色名称"
                required
                class="font-medium text-gray-700 dark:text-gray-300"
              >
                <el-input
                  v-model="formData.roleName"
                  placeholder="请输入角色名称"
                  class="!h-10"
                />
              </el-form-item>

              <el-form-item
                label="角色编码"
                required
                class="font-medium text-gray-700 dark:text-gray-300"
              >
                <el-input
                  v-model="formData.roleCode"
                  placeholder="请输入角色编码"
                  class="!h-10"
                />
              </el-form-item>

              <el-form-item
                label="排序号"
                class="font-medium text-gray-700 dark:text-gray-300"
              >
                <el-input-number
                  v-model="formData.sort"
                  :min="0"
                  :max="999"
                  controls-position="right"
                  class="!w-full !line-height-[38px]"
                />
              </el-form-item>

              <el-form-item
                label="是否可用"
                class="font-medium text-gray-700 dark:text-gray-300"
              >
                <div class="h-10 flex items-center">
                  <el-switch
                    v-model="formData.status"
                    :active-value="0"
                    :inactive-value="1"
                    active-text="启用"
                    inactive-text="禁用"
                    inline-prompt
                  />
                </div>
              </el-form-item>
            </div>

            <el-form-item
              label="包含成员"
              class="mt-2 font-medium text-gray-700 dark:text-gray-300"
            >
              <MemberSelector
                style="width: 100%"
                v-model="formData.members"
                placeholder="点击选择成员"
                @change="handleMemberChange"
              />
            </el-form-item>

            <el-form-item
              label="备注"
              class="font-medium text-gray-700 dark:text-gray-300"
            >
              <el-input
                v-model="formData.remark"
                type="textarea"
                :rows="3"
                placeholder="请输入备注说明（可选）"
                class="rounded-lg"
              />
            </el-form-item>

            <div
              v-if="formData.createTime"
              class="mt-6 p-4 bg-slate-50 dark:bg-zinc-900 rounded-xl grid grid-cols-2 gap-4 text-xs text-gray-500"
            >
              <div class="flex items-center gap-2">
                <span class="font-semibold text-gray-400 w-16">创建人:</span>
                <span class="text-gray-700 dark:text-gray-300 font-medium">{{
                  formData.createBy || "-"
                }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-semibold text-gray-400 w-16">创建时间:</span>
                <span class="text-gray-700 dark:text-gray-300 font-mono">{{
                  formData.createTime
                }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-semibold text-gray-400 w-16">更新人:</span>
                <span class="text-gray-700 dark:text-gray-300 font-medium">{{
                  formData.updateBy || "-"
                }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-semibold text-gray-400 w-16">更新时间:</span>
                <span class="text-gray-700 dark:text-gray-300 font-mono">{{
                  formData.updateTime
                }}</span>
              </div>
            </div>
          </el-form>
        </el-tab-pane>

        <el-tab-pane
          label="菜单权限"
          name="menu"
          class="p-4 bg-white dark:bg-[#18181c]"
        >
          <div class="min-h-[400px] flex flex-col" v-loading="menuLoading">
            <div
              class="flex items-center gap-2 px-4 py-2.5 mb-4 text-xs text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40 rounded-lg"
            >
              <el-icon class="text-base"><InfoFilled /></el-icon>
              <span>提示：勾选下方菜单，设置角色可访问的菜单页面及按钮权限</span>
            </div>

            <div
              class="flex-1 max-h-[420px] overflow-y-auto p-3 border border-slate-100 dark:border-zinc-800 rounded-xl shadow-inner bg-slate-50/50 dark:bg-zinc-900/30"
            >
              <el-tree
                ref="menuTreeRef"
                :data="menuTreeData"
                show-checkbox
                node-key="menuId"
                :props="{ label: 'menuName', children: 'children' }"
                default-expand-all
                class="!bg-transparent text-gray-700 dark:text-gray-300"
                @check="handleMenuTreeCheck"
              />
              <el-empty
                v-if="!menuLoading && menuTreeData.length === 0"
                description="暂无菜单权限数据"
                :image-size="80"
              />
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane
          label="数据权限"
          name="dataScope"
          class="p-4 bg-white dark:bg-[#18181c]"
        >
          <div class="min-h-[400px] flex flex-col">
            <el-form-item
              label="数据权限范围"
              label-width="110px"
              class="font-medium !mb-4"
            >
              <el-select
                v-model="formData.scope"
                placeholder="请选择数据权限"
                class="!w-72"
                @change="handleScopeChange"
              >
                <el-option
                  v-for="item in scopeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>

            <div
              v-if="formData.scope === 2"
              class="flex-1 flex flex-col mt-2"
              v-loading="deptLoading"
            >
              <div
                class="flex items-center gap-2 px-4 py-2.5 mb-4 text-xs text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40 rounded-lg"
              >
                <el-icon class="text-base"><InfoFilled /></el-icon>
                <span>提示：勾选下方组织架构部门，角色的数据查看权限将严格限制在所选范围内</span>
              </div>

              <div
                class="flex-1 max-h-[350px] overflow-y-auto p-3 border border-slate-100 dark:border-zinc-800 rounded-xl shadow-inner bg-slate-50/50 dark:bg-zinc-900/30"
              >
                <el-tree
                  ref="deptTreeRef"
                  :data="deptTreeData"
                  show-checkbox
                  node-key="deptId"
                  :props="{ label: 'deptName', children: 'children' }"
                  default-expand-all
                  class="!bg-transparent text-gray-700 dark:text-gray-300"
                  @check="handleDeptTreeCheck"
                />
                <el-empty
                  v-if="!deptLoading && deptTreeData.length === 0"
                  description="暂无组织架构数据"
                  :image-size="80"
                />
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <div
          class="flex justify-end gap-2 px-2 pt-2 border-t border-gray-100 dark:border-zinc-800"
        >
          <el-button class="rounded-lg px-5" @click="formVisible = false">
            取消
          </el-button>
          <el-button
            type="primary"
            class="rounded-lg px-5 shadow-sm"
            :loading="formSubmitting"
            @click="handleSubmit"
          >
            保存提交
          </el-button>
        </div>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped lang="scss">
.menu-permission-wrapper {
  min-height: 400px;
  padding: 16px;

  .menu-tip {
    padding: 8px 12px;
    margin-bottom: 16px;
    font-size: 12px;
    color: #909399;
    background-color: #f5f7fa;
    border-radius: 4px;
  }

  .menu-tree {
    max-height: 450px;
    padding: 12px;
    overflow-y: auto;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
  }
}

.data-permission-wrapper {
  min-height: 400px;
  padding: 16px;

  .custom-scope-wrapper {
    margin-top: 20px;
  }

  .dept-tip {
    padding: 8px 12px;
    margin-bottom: 16px;
    font-size: 12px;
    color: #909399;
    background-color: #f5f7fa;
    border-radius: 4px;
  }

  .dept-tree {
    max-height: 400px;
    padding: 12px;
    overflow-y: auto;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
  }
}
</style>
