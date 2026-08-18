<script lang="ts" setup>
import type { Stock, StockPageParams } from '#/api/stock/stock';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from '@vben/common-ui';

import {
  getStockPageApi,
  getWarehouseStockSummaryApi,
} from '#/api/stock/stock';
import { getWarehouseListApi } from '#/api/stock/warehouse';
import { defaultStockCurrentColumns, STOCK_CURRENT_STORAGE_KEY } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

const { stock_package_type } = useDicts(['stock_package_type']);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultStockCurrentColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Stock[]>([]);
const total = ref(0);
const moreParams = ref(false);

// 汇总数据
const summaryLoading = ref(false);
const summaryData = ref<Stock[]>([]);

// 下拉选项
const warehouseOptions = ref<{ label: string; value: number }[]>([]);

// 查询参数
const queryParams = reactive<StockPageParams>({
  pageNo: 1,
  pageSize: 10,
  warehouseId: undefined,
  packageType: undefined,
});

// 是否显示汇总
const showSummary = ref(false);

// --- 加载选项 ---
async function loadOptions() {
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
    const res = await getStockPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

// --- 加载汇总数据 ---
async function loadSummary() {
  if (!queryParams.warehouseId) {
    ElMessage.warning('请先选择仓库');
    return;
  }
  summaryLoading.value = true;
  try {
    const res = await getWarehouseStockSummaryApi(queryParams.warehouseId);
    summaryData.value = res || [];
    showSummary.value = true;
  } catch {
    ElMessage.error('加载汇总数据失败');
  } finally {
    summaryLoading.value = false;
  }
}

function handleQuery() {
  queryParams.pageNo = 1;
  showSummary.value = false;
  loadData();
}

function resetQuery() {
  queryParams.warehouseId = undefined;
  queryParams.packageType = undefined;
  queryParams.pageNo = 1;
  showSummary.value = false;
  loadData();
}

onMounted(() => {
  loadOptions();
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
          <el-select v-model="queryParams.warehouseId" clearable style="width: 200px">
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

        <el-form-item>
          <el-select v-model="queryParams.packageType" clearable style="width: 200px">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">品类:</span>
            </template>
            <el-option
              v-for="item in stock_package_type"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </template>

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <ExportButton :module-code="ModuleCodeMap.STOCK_CURRENT" :fields="visibleColumns" :find-cond="queryParams" />
        <el-button type="primary" plain :loading="summaryLoading" @click="loadSummary">
          按仓库汇总
        </el-button>
        <el-button v-if="showSummary" @click="showSummary = false">返回列表</el-button>
      </template>

      <!-- 📥 工具栏右侧 -->
      <template #toolbar-right>
        <ColumnSelector
          :storage-key="STOCK_CURRENT_STORAGE_KEY"
          :default-columns="defaultStockCurrentColumns"
          @update:columns="handleColumnsUpdate"
        />
      </template>

      <!-- 📥 表格 -->
      <template #table>
        <!-- 汇总视图 -->
        <div v-if="showSummary" v-loading="summaryLoading">
          <el-table :data="summaryData" border stripe style="width: 100%">
            <el-table-column prop="packageType" label="品类" width="150" align="center">
              <template #default="{ row }">
                <DictTag :options="stock_package_type" :value="row.packageType" />
              </template>
            </el-table-column>
            <el-table-column prop="stockWeight" label="库存重量(kg)" width="180" align="center">
              <template #default="{ row }">
                {{ row.stockWeight?.toFixed(2) || 0 }}
              </template>
            </el-table-column>
            <el-table-column prop="stockCostAmount" label="库存成本(元)" width="180" align="center">
              <template #default="{ row }">
                {{ row.stockCostAmount?.toFixed(2) || 0 }}
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!summaryLoading && summaryData.length === 0" description="暂无汇总数据" />
        </div>

        <!-- 列表视图 -->
        <el-table v-else :data="tableData" border stripe style="width: 100%; height: 100%">
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
              <template v-if="col.key === 'packageType'">
                <DictTag :options="stock_package_type" :value="row.packageType" />
              </template>
              <template v-else-if="col.key === 'stockWeight' || col.key === 'lockedWeight'">
                {{ (row as any)[col.key]?.toFixed(2) || 0 }}
              </template>
              <template v-else-if="col.key === 'stockCostAmount'">
                {{ (row as any)[col.key]?.toFixed(2) || 0 }}
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>
  </Page>
</template>

<style scoped>
.selected-alert-badge {
  display: inline-block;
}
</style>
