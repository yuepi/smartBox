<script lang="ts" setup>
import type { StockIn, StockInPageParams } from '#/api/stock/stockIn';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  deleteStockInApi,
  getStockInPageApi,
  submitStockInApi,
} from '#/api/stock/stockIn';
import { getWarehouseListApi } from '#/api/stock/warehouse';
import {
  defaultStockInColumns,
  STOCK_IN_STORAGE_KEY,
} from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

import StockInDetail from './StockInDetail.vue';
import StockInForm from './StockInForm.vue';

const { stock_in_status } = useDicts(['stock_in_status']);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultStockInColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const stockInFormRef = ref();
const stockInDetailRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<StockIn[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

// 下拉选项
const warehouseOptions = ref<{ label: string; value: number }[]>([]);

// 查询参数
const queryParams = reactive<StockInPageParams>({
  pageNo: 1,
  pageSize: 10,
  inNo: undefined,
  warehouseId: undefined,
  inStatus: undefined,
});

// --- 加载仓库选项 ---
async function loadWarehouseOptions() {
  try {
    const res = await getWarehouseListApi({ status: 0 });
    warehouseOptions.value = (res || []).map((item) => ({
      label: item.warehouseName,
      value: item.warehouseId,
    }));
  } catch {
    console.error('加载仓库列表失败');
  }
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getStockInPageApi(queryParams);
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
  stockInFormRef.value?.open();
}

// --- 编辑 ---
function handleEdit(row: StockIn) {
  stockInFormRef.value?.open(row);
}

// --- 详情 ---
function handleView(row: StockIn) {
  stockInDetailRef.value?.open(row);
}

// --- 提交入库 ---
async function handleSubmitIn(row: StockIn) {
  try {
    await ElMessageBox.confirm(`确定要提交入库单【${row.inNo}】吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await submitStockInApi({ stockInId: row.stockInId });
    ElMessage.success('提交入库成功');
    loadData();
  } catch {
    // 取消操作
  }
}

// --- 删除 ---
async function handleDelete(row?: StockIn) {
  let ids: number[] = [];
  if (row) {
    ids = [row.stockInId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条入库单吗？`,
      '提示',
      { type: 'warning' },
    );
    for (const id of ids) {
      await deleteStockInApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条入库单`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: StockIn[]) {
  selectedIds.value = selection.map((item) => item.stockInId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.inNo = undefined;
  queryParams.warehouseId = undefined;
  queryParams.inStatus = undefined;
  queryParams.pageNo = 1;
  loadData();
}

onMounted(() => {
  loadWarehouseOptions();
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
            v-model="queryParams.inNo"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">入库单号:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-select
            v-model="queryParams.warehouseId"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">仓库:</span>
            </template>
            <el-option
              v-for="item in warehouseOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <template #search-advanced>
        <el-form-item>
          <el-select
            v-model="queryParams.inStatus"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">入库状态:</span>
            </template>
            <el-option
              v-for="item in stock_in_status"
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
          新增入库单
        </el-button>
        <ExportButton
          :module-code="ModuleCodeMap.STOCK_IN"
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
          :storage-key="STOCK_IN_STORAGE_KEY"
          :default-columns="defaultStockInColumns"
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
              <template v-if="col.key === 'inStatus'">
                <DictTag :options="stock_in_status" :value="row.inStatus" />
              </template>
              <template v-else-if="col.key === 'totalWeight'">
                {{ row.totalWeight?.toFixed(2) || 0 }}
              </template>
              <template v-else-if="col.key === 'totalCostAmount'">
                {{ row.totalCostAmount?.toFixed(2) || 0 }}
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
              <el-tooltip content="详情" placement="top" :enterable="false">
                <el-button
                  link
                  type="primary"
                  icon="View"
                  @click="handleView(row)"
                />
              </el-tooltip>
              <el-tooltip content="编辑" placement="top" :enterable="false">
                <el-button
                  link
                  type="primary"
                  icon="Edit"
                  @click="handleEdit(row)"
                />
              </el-tooltip>
              <el-tooltip
                v-if="row.inStatus === 0"
                content="提交入库"
                placement="top"
                :enterable="false"
              >
                <el-button
                  link
                  type="success"
                  icon="Check"
                  @click="handleSubmitIn(row)"
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

    <StockInForm ref="stockInFormRef" @success="handleQuery" />
    <StockInDetail ref="stockInDetailRef" />
  </Page>
</template>

<style scoped>
.selected-alert-badge {
  display: inline-block;
}
</style>
