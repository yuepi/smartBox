<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

import { Page } from "@vben/common-ui";

import { Delete, Edit, Plus, Refresh, Search } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import { type Dept, getMerchantDeptListApi } from "#/api/system/dept";
import { getMerchantRoleListApi } from "#/api/system/role";
import {
  addMerchantUserApi,
  deleteMerchantUserApi,
  editMerchantUserApi,
  getMerchantUserDetailApi,
  getMerchantUserPageApi,
  type User,
  type UserPageParams,
} from "#/api/system/user";

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<User[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 表单弹窗控制
const formVisible = ref(false);
const formTitle = ref("");
const formData = ref<Partial<User>>({});
const formSubmitting = ref(false);

// 部门树相关
const deptTreeData = ref<Dept[]>([]);
const deptLoading = ref(false);

// 角色相关
const roleOptions = ref<any[]>([]);
const roleLoading = ref(false);

// 性别选项
const sexOptions = [
  { label: "未知", value: 0 },
  { label: "男", value: 1 },
  { label: "女", value: 2 },
];

// 身份标识选项
const identifyOptions = [
  { label: "普通用户", value: "0" },
  { label: "清运人员", value: "1" },
  { label: "分拣人员", value: "2" },
  { label: "回收员", value: "3" },
  { label: "设备管理员", value: "4" },
];

// 状态选项
const statusOptions = [
  { label: "启用", value: 0 },
  { label: "禁用", value: 1 },
];

// 查询参数
const queryParams = reactive<UserPageParams>({
  pageNo: 1,
  pageSize: 10,
  nickName: undefined,
  email: undefined,
  sex: undefined,
  status: undefined,
});

// 添加计算属性
const identifyArray = computed({
  get: () => {
    const val = formData.value.identify;
    return val ? val.split(",") : [];
  },
  set: (val: string[]) => {
    formData.value.identify = val.join(",");
  },
});

// --- 辅助函数 ---
function getSexText(sex: number): string {
  const map: Record<number, string> = { 0: "未知", 1: "男", 2: "女" };
  return map[sex] || "未知";
}

function getIdentifyText(identify: string): string {
  if (!identify) return "普通用户";
  const map: Record<string, string> = {
    "0": "普通用户",
    "1": "清运人员",
    "2": "分拣人员",
    "3": "回收员",
    "4": "设备管理员",
  };
  const ids = identify.split(",");
  return ids.map((id) => map[id] || "未知").join(",");
}

function getStatusText(status: number): string {
  return status === 0 ? "启用" : "禁用";
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

// --- 加载部门树 ---
async function loadDeptTree() {
  try {
    deptLoading.value = true;
    const res = await getMerchantDeptListApi({ status: 0 });
    deptTreeData.value = buildDeptTree(res || []);
  } catch (error) {
    console.error("加载部门树失败：", error);
    ElMessage.error("加载部门树失败");
  } finally {
    deptLoading.value = false;
  }
}

// 部门选择变化
function handleDeptChange(values: number[]) {
  formData.value.deptIds = values;
  console.log("已选部门ID:", values);
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getMerchantUserPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error("加载数据失败");
  } finally {
    loading.value = false;
  }
}

// --- 加载角色列表 ---
async function loadRoleList() {
  try {
    roleLoading.value = true;
    const res = await getMerchantRoleListApi({ status: 0, pageSize: 100 });
    roleOptions.value = (res.records || res || []).map((item: any) => ({
      roleId: item.roleId,
      roleName: item.roleName,
      roleCode: item.roleCode,
    }));
  } catch (error) {
    console.error("加载角色列表失败：", error);
    ElMessage.error("加载角色列表失败");
  } finally {
    roleLoading.value = false;
  }
}

// --- 新增/编辑 ---
function handleAdd() {
  formTitle.value = "新增用户";
  formData.value = {
    userName: "",
    nickName: "",
    password: "",
    sex: 0,
    status: 0,
    superAdminFlag: 0,
    roleIds: [],
    deptIds: [],
  };
  formVisible.value = true;
}

async function handleEdit(row: User) {
  try {
    formTitle.value = "编辑用户";
    const res = await getMerchantUserDetailApi(row.userId);
    formData.value = res || {};
    formData.value.roles = res.roles || [];
    formData.value.deptIds = res.deptIds || []; // 直接赋值，自动回显
    await loadRoleList();
    formVisible.value = true;
  } catch {
    ElMessage.error("获取用户信息失败");
  }
}

async function handleSubmit() {
  if (!formData.value.userName?.trim()) {
    ElMessage.warning("请输入账号");
    return;
  }
  if (!formData.value.nickName?.trim()) {
    ElMessage.warning("请输入昵称");
    return;
  }

  // 如果没有填写密码，设置默认密码 123456
  if (!formData.value.password) {
    formData.value.password = "123456";
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.userId
      ? editMerchantUserApi
      : addMerchantUserApi;
    await api(formData.value);
    ElMessage.success(formData.value.userId ? "修改成功" : "新增成功");
    formVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    formSubmitting.value = false;
  }
}

// --- 删除 ---
async function handleDelete(row?: User) {
  let ids: number[] = [];

  if (row) {
    ids = [row.userId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning("请选择要删除的记录");
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条用户吗？`,
      "提示",
      { type: "warning" }
    );

    for (const id of ids) {
      await deleteMerchantUserApi(id);
    }

    ElMessage.success(`成功删除 ${ids.length} 条用户`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

// 表格选中变化
function handleSelectionChange(selection: User[]) {
  selectedIds.value = selection.map((item) => item.userId);
}

// 搜索与重置
function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.nickName = undefined;
  queryParams.email = undefined;
  queryParams.sex = undefined;
  queryParams.status = undefined;
  queryParams.pageNo = 1;
  loadData();
}

onMounted(() => {
  loadData();
  loadRoleList();
  loadDeptTree();
});
</script>

<template>
  <Page auto-content-height>
    <h1 class="text-2xl font-bold">商户用户管理</h1>
    <div class="p-4">
      <!-- 查询表单 -->
      <el-card shadow="never" class="mb-4">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="昵称">
            <el-input
              v-model="queryParams.nickName"
              placeholder="请输入昵称"
              clearable
              style="width: 180px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input
              v-model="queryParams.email"
              placeholder="请输入邮箱"
              clearable
              style="width: 180px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="性别">
            <el-select
              v-model="queryParams.sex"
              placeholder="全部"
              clearable
              style="width: 100px"
            >
              <el-option
                v-for="item in sexOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
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
            <el-button
              type="primary"
              :icon="Search"
              @click="handleQuery"
              v-access:code="['merchant:user:page']"
            >
              查询
            </el-button>
            <el-button
              :icon="Refresh"
              @click="resetQuery"
              v-access:code="['merchant:user:page']"
            >
              重置
            </el-button>
            <el-button
              type="primary"
              plain
              :icon="Plus"
              @click="handleAdd()"
              v-access:code="['merchant:user:add']"
            >
              新增
            </el-button>
            <el-button
              type="danger"
              plain
              :icon="Delete"
              :disabled="selectedIds.length === 0"
              @click="handleDelete()"
              v-access:code="['merchant:user:del']"
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
            prop="userId"
            label="用户ID"
            width="80"
            align="center"
          />
           <el-table-column
            prop="userName"
            label="账号"
            min-width="120"
            align="center"
          />
          <el-table-column
            prop="nickName"
            label="昵称"
            min-width="120"
            align="center"
          >
            <template #default="{ row }">
              <div class="flex items-center justify-center gap-2">
                <el-avatar :size="24" :src="row.avatar" />
                <span>{{ row.nickName }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="email"
            label="邮箱"
            width="180"
            align="center"
            show-overflow-tooltip
          />
          <el-table-column prop="sex" label="性别" width="80" align="center">
            <template #default="{ row }">
              {{ getSexText(row.sex) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="identify"
            label="身份标识"
            min-width="150"
            align="center"
          >
            <template #default="{ row }">
              <el-tag size="small" type="info">
                {{ getIdentifyText(row.identify) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="角色" min-width="150" align="center">
            <template #default="{ row }">
              <div class="flex flex-wrap justify-center gap-1">
                <el-tag
                  v-for="role in row.roles || []"
                  :key="role.roleId"
                  size="small"
                  type="info"
                >
                  {{ role.roleName || role }}
                </el-tag>
                <span v-if="!row.roles?.length" class="text-gray-400">-</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="所属部门" min-width="150" align="center">
            <template #default="{ row }">
              <div class="flex flex-wrap justify-center gap-1">
                <el-tag
                  v-for="dept in row.depts || []"
                  :key="dept.deptId"
                  size="small"
                  type="success"
                >
                  {{ dept.deptName }}
                </el-tag>
                <span v-if="!row.depts?.length" class="text-gray-400">-</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="superAdminFlag"
            label="超管标识"
            width="100"
            align="center"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.superAdminFlag === 1 ? 'danger' : 'info'"
                size="small"
              >
                {{ row.superAdminFlag === 1 ? "是" : "否" }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="80" align="center">
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
                v-access:code="['merchant:user:edit']"
              >
                编辑
              </el-button>
              <el-button
                link
                type="danger"
                :icon="Delete"
                @click="handleDelete(row)"
                v-access:code="['merchant:user:del']"
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
    <!-- 新增/编辑弹窗（两列布局） -->
    <el-dialog
      v-model="formVisible"
      :title="formTitle"
      width="800px"
      append-to-body
    >
      <el-row :gutter="20">
        <!-- 左侧列 -->
        <el-col :span="12">
          <el-form :model="formData" label-width="100px">
            <el-form-item label="账号" required>
              <el-input v-model="formData.userName" placeholder="请输入账号" />
            </el-form-item>
            <el-form-item label="昵称" required>
              <el-input v-model="formData.nickName" placeholder="请输入昵称" />
            </el-form-item>
            <el-form-item label="密码">
              <el-input
                v-model="formData.password"
                type="password"
                placeholder="不填则默认为123456"
                show-password
              />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="formData.email" placeholder="请输入邮箱" />
            </el-form-item>
            <el-form-item label="头像">
              <el-input v-model="formData.avatar" placeholder="请输入头像URL" />
            </el-form-item>
            <el-form-item label="性别">
              <el-radio-group v-model="formData.sex">
                <el-radio
                  v-for="item in sexOptions"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="身份标识">
              <el-checkbox-group v-model="identifyArray">
                <el-checkbox
                  v-for="item in identifyOptions"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-form>
        </el-col>

        <!-- 右侧列 -->
        <el-col :span="12">
          <el-form :model="formData" label-width="100px">
            <el-form-item label="角色">
              <el-select
                v-model="formData.roles"
                multiple
                filterable
                placeholder="请选择角色"
                style="width: 100%"
                :loading="roleLoading"
              >
                <el-option
                  v-for="item in roleOptions"
                  :key="item.roleId"
                  :label="item.roleName"
                  :value="item.roleId"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="所属部门">
              <el-tree-select
                v-model="formData.deptIds"
                :data="deptTreeData"
                multiple
                clearable
                filterable
                check-strictly
                :props="{
                  value: 'deptId',
                  label: 'deptName',
                  children: 'children',
                }"
                :default-expand-level="1"
                placeholder="请选择部门"
                style="width: 100%"
                @change="handleDeptChange"
              />
            </el-form-item>

            <el-form-item label="超管标识">
              <el-radio-group v-model="formData.superAdminFlag">
                <el-radio :value="0">否</el-radio>
                <el-radio :value="1">是</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="状态">
              <el-radio-group v-model="formData.status">
                <el-radio :value="0">启用</el-radio>
                <el-radio :value="1">禁用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
        </el-col>
      </el-row>

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
  </Page>
</template>

<style scoped lang="scss">
.dept-tree-wrapper {
  max-height: 300px;
  padding: 8px;
  overflow-y: auto;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.dept-tree {
  width: 100%;
}
</style>
