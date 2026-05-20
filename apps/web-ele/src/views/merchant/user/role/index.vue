<script lang="ts" setup>
import { nextTick, onMounted, reactive, ref } from "vue";

import { Page } from "@vben/common-ui";

import { Delete, Edit, Plus, Refresh, Search } from "@element-plus/icons-vue";
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
    nodeList.forEach(node => {
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
    nodeList.forEach(node => {
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
      const leafKeys = filterLeafIds(menuTreeData.value, formData.value.menuIds);
      menuTreeRef.value.setCheckedKeys(leafKeys);
      console.log('菜单叶子节点回显:', leafKeys);
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
      const leafKeys = filterLeafIds(deptTreeData.value, formData.value.deptIds);
      deptTreeRef.value.setCheckedKeys(leafKeys);
      console.log('部门叶子节点回显:', leafKeys);
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
    console.log('菜单权限已更新:', formData.value.menuIds);
  }
}

// --- 部门树勾选变化 ---
function handleDeptTreeCheck() {
  if (deptTreeRef.value) {
    const checkedKeys = deptTreeRef.value.getCheckedKeys();
    const halfCheckedKeys = deptTreeRef.value.getHalfCheckedKeys();
    formData.value.deptIds = [...checkedKeys, ...halfCheckedKeys];
    console.log('部门权限已更新:', formData.value.deptIds);
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
    const api = formData.value.roleId ? editMerchantRoleApi : addMerchantRoleApi;
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
    await ElMessageBox.confirm(`确定要删除选中的 ${ids.length} 条角色吗？`, "提示", { type: "warning" });

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
    <h1 class="text-2xl font-bold">商户角色管理</h1>
    <div class="p-4">
      <!-- 查询表单 -->
      <el-card shadow="never" class="mb-4">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="角色名称">
            <el-input
              v-model="queryParams.roleName"
              placeholder="请输入角色名称"
              clearable
              style="width: 180px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="角色编码">
            <el-input
              v-model="queryParams.roleCode"
              placeholder="请输入角色编码"
              clearable
              style="width: 180px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select
              v-model="queryParams.status"
              placeholder="全部"
              clearable
              style="width: 100px"
            >
              <el-option
                v-for="item in statusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleQuery" v-access:code="['merchant:role:page']">
              查询
            </el-button>
            <el-button :icon="Refresh" @click="resetQuery" v-access:code="['merchant:role:page']">重置</el-button>
            <el-button type="primary" plain :icon="Plus" @click="handleAdd" v-access:code="['merchant:role:add']">
              新增
            </el-button>
            <el-button
              type="danger"
              plain
              :icon="Delete"
              :disabled="selectedIds.length === 0"
              @click="handleDelete"
              v-access:code="['merchant:role:del']"
            >
              批量删除
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 -->
      <el-card shadow="never">
        <el-table
          v-loading="loading"
          :data="tableData"
          border
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" align="center" />
          <el-table-column prop="roleId" label="角色ID" width="80" align="center" />
          <el-table-column prop="roleName" label="角色名称" min-width="150" align="center" />
          <el-table-column prop="roleCode" label="角色编码" min-width="150" align="center" />
          <el-table-column prop="sort" label="排序" width="80" align="center" />
          <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 0 ? 'success' : 'danger'">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" :icon="Edit" @click="handleEdit(row)" v-access:code="['merchant:role:edit']">
                编辑
              </el-button>
              <el-button link type="danger" :icon="Delete" @click="handleDelete(row)" v-access:code="['merchant:role:del']">
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
            @size-change="loadData"
            @current-change="loadData"
          />
        </div>
      </el-card>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="formTitle" width="1200px" append-to-body>
      <el-tabs v-model="activeTab" type="border-card" @tab-click="handleTabClick">
        <!-- 基本信息 Tab -->
        <el-tab-pane label="基本信息" name="basic">
          <el-form ref="formRef" :model="formData" label-width="100px" label-position="right">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="角色名称" required>
                  <el-input v-model="formData.roleName" placeholder="请输入角色名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="角色编码" required>
                  <el-input v-model="formData.roleCode" placeholder="请输入角色编码" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="排序号">
                  <el-input-number v-model="formData.sort" :min="0" :max="999" controls-position="right" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="是否可用">
                  <el-switch v-model="formData.status" :active-value="0" :inactive-value="1" active-text="启用" inactive-text="禁用" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="包含成员">
              <MemberSelector style="width: 100%" v-model="formData.members" placeholder="点击选择成员" @change="handleMemberChange" />
            </el-form-item>

            <el-form-item label="备注">
              <el-input v-model="formData.remark" type="textarea" :rows="3" placeholder="请输入备注" />
            </el-form-item>

            <!-- 创建/更新信息 -->
            <div v-if="formData.createTime" class="bg-gray-50 p-3 rounded mt-2">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="创建人">
                    <span class="text-gray-600">{{ formData.createBy }}</span>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="创建时间">
                    <span class="text-gray-600">{{ formData.createTime }}</span>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="更新人">
                    <span class="text-gray-600">{{ formData.updateBy }}</span>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="更新时间">
                    <span class="text-gray-600">{{ formData.updateTime }}</span>
                  </el-form-item>
                </el-col>
              </el-row>
            </div>
          </el-form>
        </el-tab-pane>

        <!-- 菜单权限 Tab -->
        <el-tab-pane label="菜单权限" name="menu">
          <div class="menu-permission-wrapper" v-loading="menuLoading">
            <div class="menu-tip">
              提示：勾选下方菜单，设置角色可访问的菜单权限
            </div>
            <el-tree
              ref="menuTreeRef"
              :data="menuTreeData"
              show-checkbox
              node-key="menuId"
              :props="{ label: 'menuName', children: 'children' }"
              default-expand-all
              class="menu-tree"
              @check="handleMenuTreeCheck"
            />
            <el-empty v-if="!menuLoading && menuTreeData.length === 0" description="暂无菜单数据" :image-size="80" />
          </div>
        </el-tab-pane>

        <!-- 数据权限 Tab -->
        <el-tab-pane label="数据权限" name="dataScope">
          <div class="data-permission-wrapper">
            <el-form-item label="数据权限范围" label-width="120px">
              <el-select v-model="formData.scope" placeholder="请选择数据权限" style="width: 300px" @change="handleScopeChange">
                <el-option v-for="item in scopeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>

            <!-- 自定义数据权限：部门树 -->
            <div v-if="formData.scope === 2" class="custom-scope-wrapper" v-loading="deptLoading">
              <div class="dept-tip">
                提示：勾选下方部门，角色的数据权限将限制在这些部门范围内
              </div>
              <el-tree
                ref="deptTreeRef"
                :data="deptTreeData"
                show-checkbox
                node-key="deptId"
                :props="{ label: 'deptName', children: 'children' }"
                default-expand-all
                class="dept-tree"
                @check="handleDeptTreeCheck"
              />
              <el-empty v-if="!deptLoading && deptTreeData.length === 0" description="暂无部门数据" :image-size="80" />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting" @click="handleSubmit">
          确定
        </el-button>
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
