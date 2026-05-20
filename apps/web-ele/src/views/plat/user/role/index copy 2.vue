<script lang="ts" setup>
import { computed, nextTick, onMounted, reactive, ref } from "vue";

import { Page } from "@vben/common-ui";

import { Delete, Edit, Plus, Refresh, Search } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import { getPlatMenuListApi } from "#/api/system/menu";


import {
  addPlatRoleApi,
  deletePlatRoleApi,
  editPlatRoleApi,
  getPlatRoleDetailApi,
  getPlatRolePageApi,
  type Role,
  type RolePageParams,
} from "#/api/system/role";

import MemberSelector from '#/components/MemberSelector/index.vue';

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

// 成员选择弹窗控制
const memberDialogVisible = ref(false);
const memberList = ref<any[]>([]);
const selectedMembers = ref<any[]>([]);
const memberLoading = ref(false);

// 状态选项
const statusOptions = [
  { label: "启用", value: 0 },
  { label: "禁用", value: 1 },
];

// 角色类型选项
const roleTypeOptions = [
  { label: "综合角色", value: 1 },
  { label: "数据权限角色", value: 2 },
  { label: "菜单角色", value: 3 },
  { label: "接口角色", value: 4 },
  { label: "菜单与接口角色", value: 5 },
];

// 数据权限选项
const scopeOptions = [
  { label: "全部数据权限", value: 1 },
  { label: "自定数据权限", value: 2 },
  { label: "本部门数据权限", value: 3 },
  { label: "本部门及以下数据权限", value: 4 },
  { label: "仅本人数据权限", value: 5 },
  { label: "部门及以下或本人数据权限", value: 6 },
];

// 查询参数
const queryParams = reactive<RolePageParams>({
  pageNo: 1,
  pageSize: 10,
  roleName: undefined,
  roleCode: undefined,
  status: undefined,
});

// 成员名称显示
const memberNames = computed(() => {
  if (!formData.value.members || formData.value.members.length === 0) return "";
  return formData.value.members
    .map((m: any) => m.name || m.userName)
    .join("；");
});

// --- 辅助函数 ---
function getStatusText(status: number): string {
  return status === 0 ? "启用" : "禁用";
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getPlatRolePageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error("加载数据失败");
  } finally {
    loading.value = false;
  }
}

// --- 加载菜单树 ---
async function loadMenuTree() {
  try {
    menuLoading.value = true;
    const res = await getPlatMenuListApi();
    // 将平级列表转换为树形结构
    menuTreeData.value = buildMenuTree(res || []);
  } catch (error) {
    console.error("加载菜单失败：", error);
    ElMessage.error("加载菜单权限失败");
  } finally {
    menuLoading.value = false;
  }
}

// 构建菜单树
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

// --- Tab 点击事件 ---
const handleTabClick = async (tab: any) => {
  if (tab.paneName === "menu" && menuTreeData.value.length === 0) {
    await loadMenuTree();
    // 编辑场景：回显已选中的菜单权限
    if (formData.value.menuIds?.length && menuTreeRef.value) {
      await nextTick();
      menuTreeRef.value.setCheckedKeys(formData.value.menuIds);
    }
  }
};

// --- 成员选择相关 ---
async function openMemberSelector() {
  memberDialogVisible.value = true;
  // 加载成员列表（用户列表）
  await loadMemberList();
  // 设置已选中的成员
  selectedMembers.value = formData.value.members || [];
}

async function loadMemberList() {
  try {
    memberLoading.value = true;
    // 调用用户列表接口，根据你的实际接口调整
    const res = await requestClient.get("/sys/user/list", {
      params: { pageSize: 100 },
    });
    memberList.value = res.records || [];
  } catch (error) {
    console.error("加载成员列表失败：", error);
    ElMessage.error("加载成员列表失败");
  } finally {
    memberLoading.value = false;
  }
}

function handleMemberSelectionChange(selection: any[]) {
  selectedMembers.value = selection;
}

function confirmMemberSelect() {
  formData.value.members = selectedMembers.value;
  memberDialogVisible.value = false;
}

// --- 新增/编辑 ---
function handleAdd() {
  formTitle.value = "新增角色";
  activeTab.value = "basic";
  formData.value = {
    status: 0,
    sort: 0,
    type: 1,
    scope: 1,
    members: [],
    menuIds: [],
  };
  menuTreeData.value = []; // 清空菜单数据
  formVisible.value = true;
}

async function handleEdit(row: Role) {
  try {
    formTitle.value = "编辑角色";
    activeTab.value = "basic";
    const res = await getPlatRoleDetailApi(row.roleId);
    formData.value = res || {};
    formData.value.menuIds = res.menuIds || [];
    formData.value.members = res.members || [];
    menuTreeData.value = []; // 清空，等切换tab时再加载
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

  // 获取选中的菜单权限ID
  if (menuTreeRef.value && menuTreeData.value.length > 0) {
    const checkedKeys = menuTreeRef.value.getCheckedKeys();
    const halfCheckedKeys = menuTreeRef.value.getHalfCheckedKeys();
    formData.value.menuIds = [...checkedKeys, ...halfCheckedKeys];
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.roleId ? editPlatRoleApi : addPlatRoleApi;
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
      await deletePlatRoleApi(id);
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
            <el-button type="primary" :icon="Search" @click="handleQuery">
查询
</el-button>
            <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
            <el-button type="primary" plain :icon="Plus" @click="handleAdd">
新增
</el-button>
            <el-button
              type="danger"
              plain
              :icon="Delete"
              :disabled="selectedIds.length === 0"
              @click="handleDelete"
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
          <el-table-column
            prop="roleId"
            label="角色ID"
            width="80"
            align="center"
          />
          <el-table-column
            prop="roleName"
            label="角色名称"
            min-width="150"
            align="center"
          />
          <el-table-column
            prop="roleCode"
            label="角色编码"
            min-width="150"
            align="center"
          />
          <el-table-column prop="sort" label="排序" width="80" align="center" />
          <el-table-column
            prop="status"
            label="状态"
            width="100"
            align="center"
          >
            <template #default="{ row }">
              <el-tag :type="row.status === 0 ? 'success' : 'danger'">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
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
                >
编辑
</el-button>
              <el-button
                link
                type="danger"
                :icon="Delete"
                @click="handleDelete(row)"
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
      width="1200px"
      append-to-body
    >
      <el-tabs
        v-model="activeTab"
        type="border-card"
        @tab-click="handleTabClick"
      >
        <!-- 基本信息 Tab -->
        <el-tab-pane label="基本信息" name="basic">
          <el-form
            ref="formRef"
            :model="formData"
            label-width="100px"
            label-position="right"
          >
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="角色名称" required>
                  <el-input
                    v-model="formData.roleName"
                    placeholder="请输入角色名称"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="角色编码" required>
                  <el-input
                    v-model="formData.roleCode"
                    placeholder="请输入角色编码"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="排序号">
                  <el-input-number
                    v-model="formData.sort"
                    :min="0"
                    :max="999"
                    controls-position="right"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="是否可用">
                  <el-switch
                    v-model="formData.status"
                    :active-value="0"
                    :inactive-value="1"
                    active-text="启用"
                    inactive-text="禁用"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="包含成员">
              <el-input
                type="textarea"
                placeholder="这里可以选择用户"
                :rows="4"
                :model-value="memberNames"
                readonly
                @click="openMemberSelector"
              />
              <div class="text-gray-400 text-xs mt-1">
                点击输入框选择成员，支持用户
              </div>
            </el-form-item>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="角色类型">
                  <el-select
                    v-model="formData.type"
                    placeholder="请选择"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in roleTypeOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="数据权限">
                  <el-select
                    v-model="formData.scope"
                    placeholder="请选择"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in scopeOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="备注">
              <el-input
                v-model="formData.remark"
                type="textarea"
                :rows="3"
                placeholder="请输入备注"
              />
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

        <!-- 权限分配 Tab -->
        <el-tab-pane label="权限分配" name="menu">
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
            />
            <el-empty
              v-if="!menuLoading && menuTreeData.length === 0"
              description="暂无菜单数据"
              :image-size="80"
            />
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="formSubmitting"
          @click="handleSubmit"
          >
确定
</el-button>
      </template>
    </el-dialog>

    <!-- 成员选择弹窗 -->
    <el-dialog
      v-model="memberDialogVisible"
      title="选择成员"
      width="800px"
      append-to-body
    >
      <el-table
        :data="memberList"
        v-loading="memberLoading"
        @selection-change="handleMemberSelectionChange"
        row-key="userId"
      >
        <el-table-column type="selection" width="55" align="center" />
        <el-table-column prop="userName" label="用户名" min-width="120" />
        <el-table-column prop="nickName" label="昵称" min-width="120" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'success' : 'danger'">
              {{ row.status === 0 ? "启用" : "禁用" }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="memberDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmMemberSelect">确定</el-button>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped>
.menu-permission-wrapper {
  min-height: 400px;
  padding: 16px;
}

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
</style>
