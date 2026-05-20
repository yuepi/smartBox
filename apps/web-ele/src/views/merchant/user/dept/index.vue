<script lang="tsx" setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, Delete, Plus, Edit, Folder, OfficeBuilding, HomeFilled } from '@element-plus/icons-vue';
import { Page } from '@vben/common-ui';

import {
  getMerchantDeptDetailApi,
  addMerchantDeptApi,
  editMerchantDeptApi,
  deleteMerchantDeptApi,
  getMerchantDeptListApi,
  type Dept,
} from '#/api/system/dept';
import { useAccess } from '@vben/access';


const { hasAccessByCodes } = useAccess();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Dept[]>([]);

// 表单弹窗控制
const formVisible = ref(false);
const formTitle = ref('');
const formData = ref<Partial<Dept>>({});
const formSubmitting = ref(false);

// 父级部门选项
const parentDeptOptions = ref<Dept[]>([]);

// 部门类型选项
const deptTypeOptions = [
  { label: '顶级部门', value: 0 },
  { label: '部门', value: 1 },
  { label: '小区', value: 2 },
];

// 状态选项
const statusOptions = [
  { label: '启用', value: 0 },
  { label: '禁用', value: 1 },
];

// 查询参数
const queryParams = reactive({
  deptName: undefined as string | undefined,
  deptType: undefined as number | undefined,
  status: undefined as number | undefined,
});

const expandedRowKeys = ref([]);
const rowKey = 'deptId';

// 表格列配置
const columns = ref([
  {
    key: 'deptId',
    title: '部门ID',
    width: 150,
    align: 'center' as const,
    cellRenderer: ({ rowData }: any) => rowData.deptId,
  },
  {
    key: 'deptName',
    title: '部门名称',
    width: 600,
    cellRenderer: ({ rowData }: any) => (
      <div class="flex items-center gap-1">
        {rowData.deptType === 0 && <HomeFilled class="w-4 h-4 text-primary" />}
        {rowData.deptType === 1 && <OfficeBuilding class="w-4 h-4 text-success" />}
        {rowData.deptType === 2 && <Folder class="w-4 h-4 text-info" />}
        <span>{rowData.deptName}</span>
      </div>
    ),
  },
  {
    key: 'deptType',
    title: '部门类型',
    width: 200,
    align: 'center' as const,
    cellRenderer: ({ rowData }: any) => {
      const typeMap: Record<number, { text: string; type: string }> = {
        0: { text: '顶级部门', type: 'primary' },
        1: { text: '部门', type: 'success' },
        2: { text: '小区', type: 'info' },
      };
      const config = typeMap[rowData.deptType] || { text: '未知', type: 'danger' };
      return <el-tag type={config.type} size="small">{config.text}</el-tag>;
    },
  },
  {
    key: 'sort',
    title: '排序',
    width: 150,
    align: 'center' as const,
    cellRenderer: ({ rowData }: any) => rowData.sort,
  },
  {
    key: 'status',
    title: '状态',
    width: 150,
    align: 'center' as const,
    cellRenderer: ({ rowData }: any) => (
      <el-tag type={rowData.status === 0 ? 'success' : 'danger'} size="small">
        {rowData.status === 0 ? '启用' : '禁用'}
      </el-tag>
    ),
  },
  {
    key: 'createTime',
    title: '创建时间',
    width: 300,
    align: 'center' as const,
    cellRenderer: ({ rowData }: any) => rowData.createTime || '-',
  },
  {
    key: 'operate',
    title: '操作',
    width: 300,
    fixed: 'right' as const,
    align: 'center' as const,
    cellRenderer: ({ rowData }: any) => (
      <div class="flex justify-center gap-1">
        {hasAccessByCodes(['merchant:dept:add']) && (
          <el-button icon={Plus} link type="primary" onClick={() => handleAdd(rowData.deptId)}>
            新增
          </el-button>
        )}
        {hasAccessByCodes(['merchant:dept:edit']) && (
          <el-button icon={Edit} link type="primary" onClick={() => handleEdit(rowData)}>
            编辑
          </el-button>
        )}
        {hasAccessByCodes(['merchant:dept:del']) && (
          <el-button icon={Delete} link type="danger" onClick={() => handleDelete(rowData)}>
            删除
          </el-button>
        )}
      </div>
    ),
  },
]);

// 递归构建树形结构
function buildTree(depts: Dept[]): Dept[] {
  const deptMap = new Map<number, Dept>();
  const tree: Dept[] = [];

  depts.forEach((dept) => {
    deptMap.set(dept.deptId, { ...dept, children: [] });
  });

  depts.forEach((dept) => {
    const node = deptMap.get(dept.deptId);
    if (node) {
      if (dept.parentId === 0 || !deptMap.has(dept.parentId)) {
        tree.push(node);
      } else {
        const parent = deptMap.get(dept.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      }
    }
  });

  // 排序
  const sortTree = (nodes: Dept[]) => {
    nodes.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    nodes.forEach(node => {
      if (node.children && node.children.length) {
        sortTree(node.children);
      }
    });
  };
  sortTree(tree);

  return tree;
}

// 加载父级部门选项（用于下拉选择）
async function loadParentDeptOptions() {
  try {
    const res = await getMerchantDeptListApi({ status: 0 });
    const depts = res || [];
    // 递归扁平化树形结构用于下拉选择
    const flatDepts = flattenTree(depts);
    parentDeptOptions.value = [
      { deptId: 0, deptName: '顶级部门', parentId: 0, merchantId: 0, deptType: 0, sort: 0, status: 0 } as Dept,
      ...flatDepts
    ];
  } catch (error) {
    console.error(error);
  }
}

// 递归扁平化树形结构
function flattenTree(nodes: Dept[]): Dept[] {
  let result: Dept[] = [];
  nodes.forEach(node => {
    result.push(node);
    if (node.children && node.children.length) {
      result = result.concat(flattenTree(node.children));
    }
  });
  return result;
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getMerchantDeptListApi(queryParams);
    tableData.value = res;
  } catch (error) {
    console.error(error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

// --- 新增/编辑 ---
function handleAdd(parentId?: number) {
  formTitle.value = '新增部门';
  formData.value = {
    parentId: parentId || 0,
    deptType: 1,
    status: 0,
    sort: 0,
  };
  loadParentDeptOptions();
  formVisible.value = true;
}

async function handleEdit(row: Dept) {
  try {
    formTitle.value = '编辑部门';
    const res = await getMerchantDeptDetailApi(row.deptId);
    formData.value = res || {};
    await loadParentDeptOptions();
    formVisible.value = true;
  } catch {
    ElMessage.error('获取部门信息失败');
  }
}

async function handleSubmit() {
  if (!formData.value.deptName?.trim()) {
    ElMessage.warning('请输入部门名称');
    return;
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.deptId ? editMerchantDeptApi : addMerchantDeptApi;
    await api(formData.value);
    ElMessage.success(formData.value.deptId ? '修改成功' : '新增成功');
    formVisible.value = false;
    handleQuery();

  } catch {
    ElMessage.error('操作失败');
  } finally {
    formSubmitting.value = false;
  }
}

// --- 删除 ---
async function handleDelete(row?: Dept) {
  let ids: number[] = [];
  let deleteName = '';

  if (row) {
    ids = [row.deptId];
    deleteName = row.deptName || '';
  }

  try {
    await ElMessageBox.confirm(
      row ? `确定要删除部门"${deleteName}"吗？删除后可能导致子部门也被删除。` : `确定要删除选中的部门吗？`,
      '提示',
      {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      }
    );

    for (const id of ids) {
      await deleteMerchantDeptApi(id);
    }

    ElMessage.success(`成功删除 ${ids.length} 条部门`);
    handleQuery();
  } catch {
    // 取消删除
  }
}

// 搜索与重置
function handleQuery() {
  loadData();
}

function resetQuery() {
  queryParams.deptName = undefined;
  queryParams.deptType = undefined;
  queryParams.status = undefined;
  loadData();
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <h1 class="text-2xl font-bold">商户部门管理</h1>
    <div class="p-4">
      <!-- 查询表单 -->
      <el-card shadow="never" class="mb-4">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="部门名称">
            <el-input v-model="queryParams.deptName" placeholder="请输入部门名称" clearable style="width: 180px"
              @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="部门类型">
            <el-select v-model="queryParams.deptType" placeholder="全部" clearable style="width: 120px">
              <el-option v-for="item in deptTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 100px">
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleQuery" v-access:code="['merchant:dept:page']">查询</el-button>
            <el-button :icon="Refresh" @click="resetQuery" v-access:code="['merchant:dept:page']">重置</el-button>
            <el-button type="primary" plain :icon="Plus" @click="handleAdd()" v-access:code="['merchant:dept:add']">新增部门</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 - 使用 el-table-v2 -->
      <el-card shadow="never">
        <div class="table-container">
          <el-auto-resizer>
            <template #default="{ height, width }">
              <el-table-v2 :columns="columns" :data="tableData" :width="width" :height="height" :row-key="rowKey"
                :expanded-row-keys="expandedRowKeys" expand-column-key="deptName" fixed />
            </template>
          </el-auto-resizer>
        </div>
      </el-card>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="formTitle" width="500px" append-to-body>
      <el-form :model="formData" label-width="100px">
        <el-form-item label="上级部门">
          <el-select v-model="formData.parentId" placeholder="请选择上级部门" clearable style="width: 100%">
            <el-option v-for="item in parentDeptOptions" :key="item.deptId" :label="item.deptName"
              :value="item.deptId" />
          </el-select>
        </el-form-item>
        <el-form-item label="部门名称" required>
          <el-input v-model="formData.deptName" placeholder="请输入部门名称" />
        </el-form-item>
        <el-form-item label="部门类型">
          <el-radio-group v-model="formData.deptType">
            <el-radio v-for="item in deptTypeOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </el-radio>
          </el-radio-group>
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

<style scoped>
.table-container {
  min-height: 500px;
  height: calc(100vh - 280px);
  width: 100%;
}

:deep(.el-table-v2__row-cell) {
  display: flex;
  align-items: center;
}

:deep(.el-table-v2__header-cell) {
  background-color: var(--el-fill-color-light);
  font-weight: 600;
}
</style>