<script lang="tsx" setup>
import { computed, onMounted, reactive, ref,watch } from 'vue';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';

import { Delete, Edit, Folder, HomeFilled, OfficeBuilding, Plus, Refresh, Search } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  addMerchantDeptApi,
  deleteMerchantDeptApi,
  type Dept,
  editMerchantDeptApi,
  getMerchantDeptDetailApi,
  getMerchantDeptListApi,
} from '#/api/system/dept';
import ColumnSelector from '#/components/ColumnSelector/index.vue';
import {
  defaultDeptColumns,
  DEPT_STORAGE_KEY,
  type TableColumnConfig,
} from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

const { hasAccessByCodes } = useAccess();

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultDeptColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// 转换为 el-table-v2 需要的 columns 格式
const tableColumns = computed(() => {
  // 1. 获取当前用户自定义勾选显示的动态列
  const cols = visibleColumns.value.length > 0 ? visibleColumns.value : defaultDeptColumns;

  // 2. 将动态列映射为相应的渲染格式
  const mappedColumns = cols.map((col) => ({
    key: col.key,
    title: col.label,
    width: col.width,
    align: col.align || 'left',
    cellRenderer: ({ rowData }: { rowData: Dept }) => {
      switch (col.key) {
        case 'deptName': {
          return (
            <div class="flex items-center gap-1 w-full overflow-hidden">
              {rowData.deptType === 0 && <HomeFilled class="w-4 h-4 text-primary shrink-0" />}
              {rowData.deptType === 1 && <OfficeBuilding class="w-4 h-4 text-success shrink-0" />}
              {rowData.deptType === 2 && <Folder class="w-4 h-4 text-info shrink-0" />}
              <span class="truncate">{rowData.deptName}</span>
            </div>
          );
        }
        case 'deptType': {
          const typeMap: Record<number, { text: string; type: string }> = {
            0: { text: '顶级部门', type: 'primary' },
            1: { text: '部门', type: 'success' },
            2: { text: '小区', type: 'info' },
          };
          const config = typeMap[rowData.deptType] || { text: '未知', type: 'danger' };
          return <el-tag size="small" type={config.type}>{config.text}</el-tag>;
        }
        case 'status': {
          return (
            <el-tag effect="light" round size="small" type={rowData.status === 0 ? 'success' : 'danger'}>
              {rowData.status === 0 ? '启用' : '禁用'}
            </el-tag>
          );
        }
        default: {
          const text = (rowData as any)[col.key] ?? '-';
          return <span>{text}</span>;
        }
      }
    },
  }));

  // 3. 动态列 + 固定操作列
  return [
    ...mappedColumns,
    {
      key: 'operate',
      title: '操作',
      width: 280,
      align: 'center',
      fixed: 'right' as const,
      cellRenderer: ({ rowData }: { rowData: Dept }) => (
        <div class="flex justify-center gap-1 w-full">
          {hasAccessByCodes(['plat:dept:add']) && (
            <el-button icon={Plus} link onClick={() => handleAdd(rowData.deptId)} type="primary">
              新增
            </el-button>
          )}
          {hasAccessByCodes(['plat:dept:edit']) && (
            <el-button icon={Edit} link onClick={() => handleEdit(rowData)} type="primary">
              编辑
            </el-button>
          )}
          {hasAccessByCodes(['plat:dept:del']) && (
            <el-button icon={Delete} link onClick={() => handleDelete(rowData)} type="danger">
              删除
            </el-button>
          )}
        </div>
      ),
    },
  ];
});

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

// 强制刷新表格的 key
const tableKey = ref(0);
watch(visibleColumns, () => {
  tableKey.value++;
});

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

  const sortTree = (nodes: Dept[]) => {
    nodes.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
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
    if (node.children && node.children.length > 0) {
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
      { type: 'warning' }
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
    <div class="p-0">
      <!-- 查询表单 -->
      <el-card shadow="never" class="border-none mb-4 !p-2">
        <el-form :inline="true" :model="queryParams" class="flex flex-wrap gap-x-2 gap-y-2 items-center">
          <el-form-item class="!mb-0 !mr-2">
            <el-input v-model="queryParams.deptName" placeholder="请输入" clearable style="width: 200px" @keyup.enter="handleQuery">
              <template #prefix><span class="text-xs text-gray-400 mr-0.5">部门名称:</span></template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select v-model="queryParams.deptType" clearable style="width: 200px">
              <template #prefix><span class="text-xs text-gray-400 mr-0.5">部门类型:</span></template>
              <el-option v-for="item in deptTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select v-model="queryParams.status" clearable style="width: 200px">
              <template #prefix><span class="text-xs text-gray-400 mr-0.5">状态:</span></template>
              <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-0 md:ml-auto flex items-center gap-1">
            <el-tooltip content="查询" placement="top">
              <el-button type="primary" :icon="Search" circle @click="handleQuery" />
            </el-tooltip>
            <el-tooltip content="重置" placement="top">
              <el-button :icon="Refresh" circle @click="resetQuery" />
            </el-tooltip>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 -->
      <el-card shadow="never">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <el-button type="primary" plain :icon="Plus" @click="handleAdd()" v-access:code="['plat:dept:add']">
              新增部门
            </el-button>
            <ExportButton :module-code="ModuleCodeMap.DEPT" :fields="visibleColumns" :find-cond="queryParams" />
          </div>
          <div class="flex items-center">
            <ColumnSelector :storage-key="DEPT_STORAGE_KEY" :default-columns="defaultDeptColumns" @update:columns="handleColumnsUpdate" />
          </div>
        </div>
        <div class="table-container">
          <el-auto-resizer>
            <template #default="{ height, width }">
              <el-table-v2
                :key="tableKey"
                :columns="tableColumns"
                :data="tableData"
                :width="width"
                :height="height"
                :row-key="rowKey"
                :expanded-row-keys="expandedRowKeys"
                expand-column-key="deptName"
                fixed
              />
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
            <el-option v-for="item in parentDeptOptions" :key="item.deptId" :label="item.deptName" :value="item.deptId" />
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
  width: 100%;
  height: calc(100vh - 320px);
  min-height: 500px;
}

:deep(.el-table-v2__row-cell) {
  display: flex;
  align-items: center;
}

:deep(.el-table-v2__header-cell) {
  font-weight: 600;
  background-color: var(--el-fill-color-light);
}
</style>
