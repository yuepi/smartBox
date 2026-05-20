<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import { onMounted, reactive, ref } from 'vue';

import { ElMessage, ElMessageBox } from 'element-plus';

import { Search, Refresh, Delete, Plus, Edit, View } from '@element-plus/icons-vue';

import {
  getPlatRolePageApi,
  getPlatRoleDetailApi,
  addPlatRoleApi,
  editPlatRoleApi,
  deletePlatRoleApi,
  type Role,
  type RolePageParams,
} from '#/api/system/role';

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Role[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 表单弹窗控制
const formVisible = ref(false);
const formTitle = ref('');
const formData = ref<Partial<Role>>({});
const formSubmitting = ref(false);

// 状态选项
const statusOptions = [
  { label: '启用', value: 0 },
  { label: '禁用', value: 1 },
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
  return status === 0 ? '启用' : '禁用';
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
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

// --- 新增/编辑 ---
function handleAdd() {
  formTitle.value = '新增角色';
  formData.value = {
    status: 0,
    sort: 0,
  };
  formVisible.value = true;
}

async function handleEdit(row: Role) {
  try {
    formTitle.value = '编辑角色';
    const res = await getPlatRoleDetailApi(row.roleId);
    formData.value = res || {};
    formVisible.value = true;
  } catch {
    ElMessage.error('获取角色信息失败');
  }
}

async function handleSubmit() {
  if (!formData.value.roleName?.trim()) {
    ElMessage.warning('请输入角色名称');
    return;
  }
  if (!formData.value.roleCode?.trim()) {
    ElMessage.warning('请输入角色编码');
    return;
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.roleId ? editPlatRoleApi : addPlatRoleApi;
    await api(formData.value);
    ElMessage.success(formData.value.roleId ? '修改成功' : '新增成功');
    formVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error('操作失败');
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
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条角色吗？`,
      '提示',
      { type: 'warning' }
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
    <h1 class="text-2xl font-bold">商户角色管理</h1>
    <div class="p-4">
      <!-- 查询表单 -->
      <el-card shadow="never" class="mb-4">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="角色名称">
            <el-input v-model="queryParams.roleName" placeholder="请输入角色名称" clearable style="width: 180px"
              @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="角色编码">
            <el-input v-model="queryParams.roleCode" placeholder="请输入角色编码" clearable style="width: 180px"
              @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 100px">
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleQuery" v-access:code="['plat:role:page']">查询</el-button>
            <el-button :icon="Refresh" @click="resetQuery" v-access:code="['plat:role:page']">重置</el-button>
            <el-button type="primary" plain :icon="Plus" @click="handleAdd()" v-access:code="['plat:role:add']">新增</el-button>
            <el-button type="danger" plain :icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete()" v-access:code="['plat:role:del']">
              批量删除
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 -->
      <el-card shadow="never">
        <el-table v-loading="loading" :data="tableData" border style="width: 100%"
          @selection-change="handleSelectionChange">
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
              <el-button link type="primary" :icon="Edit" @click="handleEdit(row)" v-access:code="['plat:role:edit']">编辑</el-button>
              <el-button link type="danger" :icon="Delete" @click="handleDelete(row)" v-access:code="['plat:role:del']">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="flex justify-end mt-4">
          <el-pagination v-model:current-page="queryParams.pageNo" v-model:page-size="queryParams.pageSize"
            :total="total" :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadData" @current-change="loadData" />
        </div>
      </el-card>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="formTitle" width="500px" append-to-body>
      <el-form :model="formData" label-width="80px">
        <el-form-item label="角色名称" required>
          <el-input v-model="formData.roleName" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色编码" required>
          <el-input v-model="formData.roleCode" placeholder="请输入角色编码" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="formData.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="formData.status">
            <el-radio :value="0">启用</el-radio>
            <el-radio :value="1">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </Page>
</template>