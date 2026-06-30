<script lang="tsx" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';

import { Delete, Edit, Folder, HomeFilled, OfficeBuilding, Plus, Refresh, Search } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox, ElTooltip, ElButton, ElTag } from 'element-plus';

import { deletePlatDeptApi, getPlatDeptListApi } from '#/api/system/dept';
import type { Dept } from '#/api/system/dept';
import ColumnSelector from '#/components/ColumnSelector/index.vue';
import { defaultDeptColumns, DEPT_STORAGE_KEY } from '#/constants/tableColumns';
import type { TableColumnConfig } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

// 🌟 引入独立拆分出去的弹窗组件
import DeptModal from './DeptModal.vue';

const { hasAccessByCodes } = useAccess();

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultDeptColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Dept[]>([]);
const moreParams = ref(false); // 控制高级筛选展开

const deptModalRef = ref(); // 🌟 弹窗组件实例
const rowKey = 'deptId';

// 查询参数
const queryParams = reactive({
  deptName: undefined as string | undefined,
  deptType: undefined as number | undefined,
  status: undefined as number | undefined,
});

// 强制刷新表格的 key
const tableKey = ref(0);
watch(visibleColumns, () => {
  tableKey.value++;
});

// 转换为 el-table-v2 需要的 columns 格式（内部操作列已重构为“纯图标+Tooltip提示”）
const tableColumns = computed(() => {
  const cols = visibleColumns.value.length > 0 ? visibleColumns.value : defaultDeptColumns;

  const mappedColumns = cols.map((col) => ({
    key: col.key,
    title: col.label,
    width: col.width,
    align: col.align || 'left',
    cellRenderer: ({ rowData }: { rowData: Dept }) => {
      switch (col.key) {
        case 'deptName': {
          return (
            <div class="flex w-full items-center gap-1 overflow-hidden">
              {rowData.deptType === 0 && <HomeFilled class="text-primary size-4 shrink-0" />}
              {rowData.deptType === 1 && <OfficeBuilding class="text-success size-4 shrink-0" />}
              {rowData.deptType === 2 && <Folder class="text-info size-4 shrink-0" />}
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
          return <ElTag size="small" type={config.type}>{config.text}</ElTag>;
        }
        case 'status': {
          return (
            <ElTag effect="light" round size="small" type={rowData.status === 0 ? 'success' : 'danger'}>
              {rowData.status === 0 ? '启用' : '禁用'}
            </ElTag>
          );
        }
        default: {
          const text = (rowData as any)[col.key] ?? '-';
          return <span>{text}</span>;
        }
      }
    },
  }));

  return [
    ...mappedColumns,
    {
      key: 'operate',
      title: '操作',
      width: 120, // 🌟 换成纯图标后，操作列宽度从 280 完美缩减至 120！
      align: 'center',
      fixed: 'right' as const,
      cellRenderer: ({ rowData }: { rowData: Dept }) => (
        <div class="flex w-full justify-center gap-1">
          {/* 1. 新增子项按钮 */}
          {hasAccessByCodes(['plat:dept:add']) && (
            <ElTooltip content="新增下级" placement="top" enterable={false}>
              <ElButton icon={Plus} link onClick={() => handleOpenModal({ parentId: rowData.deptId, deptType: 1, status: 0, sort: 0 })} type="primary" />
            </ElTooltip>
          )}
          {/* 2. 修改按钮 */}
          {hasAccessByCodes(['plat:dept:edit']) && (
            <ElTooltip content="修改" placement="top" enterable={false}>
              <ElButton icon={Edit} link onClick={() => handleOpenModal(rowData)} type="primary" />
            </ElTooltip>
          )}
          {/* 3. 删除按钮：这里移除了 text-danger，使其放置时视觉降噪，体验极其统一 */}
          {hasAccessByCodes(['plat:dept:del']) && (
            <ElTooltip content="删除" placement="top" enterable={false}>
              <ElButton icon={Delete} link onClick={() => handleDelete(rowData)} type="primary" />
            </ElTooltip>
          )}
        </div>
      ),
    },
  ];
});

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getPlatDeptListApi(queryParams);
    tableData.value = res || [];
  } catch (error) {
    console.error(error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

// 🌟 打开弹窗
function handleOpenModal(row?: Partial<Dept> | Dept) {
  deptModalRef.value?.open(row);
}

// --- 删除 ---
async function handleDelete(row: Dept) {
  try {
    await ElMessageBox.confirm(
      `确定要删除部门"${row.deptName}"吗？删除后可能导致子部门也被删除。`,
      '提示',
      { type: 'warning' }
    );
    await deletePlatDeptApi(row.deptId);
    ElMessage.success(`成功删除部门`);
    loadData();
  } catch {
    // 取消删除
  }
}

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
    <BaseTableLayout
      v-model:queryParams="queryParams"
      v-model:moreParams="moreParams"
      :loading="loading"
      :is-virtual-table="true"
      @search="loadData"
      @reset="resetQuery"
    >
      <template #search-basic>
        <el-form-item>
          <el-input v-model="queryParams.deptName" placeholder="请输入" clearable style="width: 200px" @keyup.enter="handleQuery">
            <template #prefix><span class="text-xs text-gray-400 mr-0.5">部门名称:</span></template>
          </el-input>
        </el-form-item>
      </template>

      <template #search-advanced>
        <el-form-item>
          <el-select v-model="queryParams.deptType" clearable style="width: 200px" placeholder="请选择">
            <template #prefix><span class="text-xs text-gray-400 mr-0.5">部门类型:</span></template>
            <el-option v-for="item in [ { label: '顶级部门', value: 0 }, { label: '部门', value: 1 }, { label: '小区', value: 2 } ]" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.status" clearable style="width: 200px" placeholder="请选择">
            <template #prefix><span class="text-xs text-gray-400 mr-0.5">状态:</span></template>
            <el-option v-for="item in [ { label: '启用', value: 0 }, { label: '禁用', value: 1 } ]" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </template>

      <template #toolbar-left>
        <el-button type="primary" plain :icon="Plus" @click="handleOpenModal()" v-access:code="['plat:dept:add']">
          新增部门
        </el-button>
        <ExportButton :module-code="ModuleCodeMap.DEPT" :fields="visibleColumns" :find-cond="queryParams" />
      </template>

      <template #toolbar-right>
        <ColumnSelector :storage-key="DEPT_STORAGE_KEY" :default-columns="defaultDeptColumns" @update:columns="handleColumnsUpdate" />
      </template>

      <template #table>
        <div :style="{ height: 'calc(100% - 1px)' }">
          <el-auto-resizer>
            <template #default="{ height, width }">
              <el-table-v2
                :key="tableKey"
                :columns="tableColumns"
                :data="tableData"
                :width="width"
                :height="height"
                :row-key="rowKey"
                expand-column-key="deptName"
                fixed
              />
            </template>
          </el-auto-resizer>
        </div>
      </template>
    </BaseTableLayout>

    <DeptModal ref="deptModalRef" @success="loadData" />
  </Page>
</template>

<style scoped>
</style>
