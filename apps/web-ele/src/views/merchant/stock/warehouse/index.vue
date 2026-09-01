<script lang="ts" setup>
import type { Warehouse, WarehousePageParams } from '#/api/stock/warehouse';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { deleteWarehouseApi, getWarehousePageApi } from '#/api/stock/warehouse';
import {
  defaultWarehouseColumns,
  WAREHOUSE_STORAGE_KEY,
} from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

import LocationDialog from './LocationDialog.vue';
import WarehouseForm from './WarehouseForm.vue';

const { warehouse_type, default_status } = useDicts([
  'warehouse_type',
  'default_status',
]);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultWarehouseColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const warehouseFormRef = ref();
const locationDialogRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Warehouse[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

// 查询参数
const queryParams = reactive<WarehousePageParams>({
  pageNo: 1,
  pageSize: 10,
  warehouseName: undefined,
  warehouseType: undefined,
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
    const res = await getWarehousePageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

// --- 新增 ---
function handleAdd() {
  warehouseFormRef.value?.open();
}

// --- 编辑 ---
function handleEdit(row: Warehouse) {
  warehouseFormRef.value?.open(row);
}

// --- 货位管理 ---
function handleManageLocation(row: Warehouse) {
  locationDialogRef.value?.open(row);
}

// --- 删除 ---
async function handleDelete(row?: Warehouse) {
  let ids: number[] = [];
  if (row) {
    ids = [row.warehouseId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条仓库吗？`,
      '提示',
      { type: 'warning' },
    );
    for (const id of ids) {
      await deleteWarehouseApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条仓库`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: Warehouse[]) {
  selectedIds.value = selection.map((item) => item.warehouseId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.warehouseName = undefined;
  queryParams.warehouseType = undefined;
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
    <BaseTableLayout
      v-model:query-params="queryParams"
      v-model:more-params="moreParams"
      :loading="loading"
      :total="total"
      @search="loadData"
      @reset="resetQuery"
    >
      <!-- 📥 基础筛选项 -->
      <template #search-basic>
        <el-form-item>
          <el-input
            v-model="queryParams.warehouseName"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">仓库名称:</span>
            </template>
          </el-input>
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <template #search-advanced>
        <el-form-item>
          <el-select
            v-model="queryParams.warehouseType"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">仓库类型:</span>
            </template>
            <el-option
              v-for="item in warehouse_type"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select
            v-model="queryParams.status"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">状态:</span>
            </template>
            <el-option
              v-for="item in default_status"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </template>

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <el-button type="primary" plain icon="Plus" @click="handleAdd">
          新增仓库
        </el-button>
        <ExportButton
          :module-code="ModuleCodeMap.WAREHOUSE"
          :fields="visibleColumns"
          :find-cond="queryParams"
        />
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="selectedIds.length === 0"
          @click="handleDelete()"
        >
          批量删除
        </el-button>
        <transition name="el-fade-in">
          <span
            v-if="selectedIds.length > 0"
            class="selected-alert-badge ml-2 text-xs text-gray-400"
          >
            已选
            <span class="text-red-500 font-medium">{{
              selectedIds.length
            }}</span>
            项
          </span>
        </transition>
      </template>

      <!-- 📥 工具栏右侧 -->
      <template #toolbar-right>
        <ColumnSelector
          :storage-key="WAREHOUSE_STORAGE_KEY"
          :default-columns="defaultWarehouseColumns"
          @update:columns="handleColumnsUpdate"
        />
      </template>

      <!-- 📥 表格 -->
      <template #table>
        <el-table
          :data="tableData"
          border
          stripe
          style="width: 100%; height: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" align="center" />

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
              <template v-if="col.key === 'warehouseType'">
                <DictTag :options="warehouse_type" :value="row.warehouseType" />
              </template>
              <template v-else-if="col.key === 'status'">
                <DictTag :options="default_status" :value="row.status" />
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column
            label="操作"
            width="280"
            fixed="right"
            align="center"
          >
            <template #default="{ row }">
              <el-tooltip content="编辑" placement="top" :enterable="false">
                <el-button
                  link
                  type="primary"
                  icon="Edit"
                  @click="handleEdit(row)"
                />
              </el-tooltip>
              <el-tooltip content="货位管理" placement="top" :enterable="false">
                <el-button
                  link
                  type="primary"
                  icon="Grid"
                  @click="handleManageLocation(row)"
                />
              </el-tooltip>
              <el-tooltip content="删除" placement="top" :enterable="false">
                <el-button
                  link
                  type="danger"
                  icon="Delete"
                  @click="handleDelete(row)"
                />
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <!-- ===== 弹窗 ===== -->
    <WarehouseForm ref="warehouseFormRef" @success="handleQuery" />
    <LocationDialog ref="locationDialogRef" />
  </Page>
</template>

<style scoped>
.selected-alert-badge {
  display: inline-block;
}
</style>
