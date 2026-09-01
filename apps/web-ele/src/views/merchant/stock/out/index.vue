<script lang="ts" setup>
import type { StockOut, StockOutPageParams } from '#/api/stock/stockOut';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { getCustomerListApi } from '#/api/stock/customer';
import {
  cancelStockOutApi,
  deleteStockOutApi,
  getStockOutPageApi,
  submitStockOutApi,
} from '#/api/stock/stockOut';
import { getWarehouseListApi } from '#/api/stock/warehouse';
import {
  defaultStockOutColumns,
  STOCK_OUT_STORAGE_KEY,
} from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

import StockOutDetail from './StockOutDetail.vue';
import StockOutForm from './StockOutForm.vue';

const { stock_out_status } = useDicts(['stock_out_status']);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultStockOutColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const stockOutFormRef = ref();
const stockOutDetailRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<StockOut[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

// 下拉选项
const warehouseOptions = ref<{ label: string; value: number }[]>([]);
const customerOptions = ref<{ label: string; value: number }[]>([]);

// 查询参数
const queryParams = reactive<StockOutPageParams>({
  pageNo: 1,
  pageSize: 10,
  outNo: undefined,
  warehouseId: undefined,
  customerId: undefined,
  outStatus: undefined,
});

// --- 加载选项 ---
async function loadOptions() {
  try {
    const [warehouseRes, customerRes] = await Promise.all([
      getWarehouseListApi({ status: 0 }),
      getCustomerListApi({ status: 0 }),
    ]);
    warehouseOptions.value = (warehouseRes || []).map((item) => ({
      label: item.warehouseName,
      value: item.warehouseId,
    }));
    customerOptions.value = (customerRes || []).map((item) => ({
      label: item.customerName,
      value: item.customerId,
    }));
  } catch {
    console.error('加载选项失败');
  }
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getStockOutPageApi(queryParams);
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
  stockOutFormRef.value?.open();
}

// --- 编辑 ---
function handleEdit(row: StockOut) {
  stockOutFormRef.value?.open(row);
}

// --- 详情 ---
function handleView(row: StockOut) {
  stockOutDetailRef.value?.open(row);
}

// --- 提交出库 ---
async function handleSubmitOut(row: StockOut) {
  try {
    await ElMessageBox.confirm(`确定要提交出库单【${row.outNo}】吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await submitStockOutApi({ stockOutId: row.stockOutId });
    ElMessage.success('提交出库成功');
    loadData();
  } catch {
    // 取消操作
  }
}

// --- 取消出库 ---
async function handleCancelOut(row: StockOut) {
  try {
    await ElMessageBox.confirm(`确定要取消出库单【${row.outNo}】吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await cancelStockOutApi({ stockOutId: row.stockOutId });
    ElMessage.success('取消出库成功');
    loadData();
  } catch {
    // 取消操作
  }
}

// --- 删除 ---
async function handleDelete(row?: StockOut) {
  let ids: number[] = [];
  if (row) {
    ids = [row.stockOutId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条出库单吗？`,
      '提示',
      { type: 'warning' },
    );
    for (const id of ids) {
      await deleteStockOutApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条出库单`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: StockOut[]) {
  selectedIds.value = selection.map((item) => item.stockOutId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.outNo = undefined;
  queryParams.warehouseId = undefined;
  queryParams.customerId = undefined;
  queryParams.outStatus = undefined;
  queryParams.pageNo = 1;
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
          <el-input
            v-model="queryParams.outNo"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">出库单号:</span>
            </template>
          </el-input>
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <template #search-advanced>
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

        <el-form-item>
          <el-select
            v-model="queryParams.customerId"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">回收商:</span>
            </template>
            <el-option
              v-for="item in customerOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select
            v-model="queryParams.outStatus"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">出库状态:</span>
            </template>
            <el-option
              v-for="item in stock_out_status"
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
          新增出库单
        </el-button>
        <ExportButton
          :module-code="ModuleCodeMap.STOCK_OUT"
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
          :storage-key="STOCK_OUT_STORAGE_KEY"
          :default-columns="defaultStockOutColumns"
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
              <template v-if="col.key === 'outStatus'">
                <DictTag :options="stock_out_status" :value="row.outStatus" />
              </template>
              <template v-else-if="col.key === 'totalOutWeight'">
                {{ row.totalOutWeight?.toFixed(2) || 0 }}
              </template>
              <template v-else-if="col.key === 'totalSaleAmount'">
                {{ row.totalSaleAmount?.toFixed(2) || 0 }}
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column
            label="操作"
            width="340"
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
                v-if="row.outStatus === 0"
                content="提交出库"
                placement="top"
                :enterable="false"
              >
                <el-button
                  link
                  type="success"
                  icon="Check"
                  @click="handleSubmitOut(row)"
                />
              </el-tooltip>
              <el-tooltip
                v-if="row.outStatus === 0"
                content="取消出库"
                placement="top"
                :enterable="false"
              >
                <el-button
                  link
                  type="warning"
                  icon="Close"
                  @click="handleCancelOut(row)"
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

    <StockOutForm ref="stockOutFormRef" @success="handleQuery" />
    <StockOutDetail ref="stockOutDetailRef" />
  </Page>
</template>

<style scoped>
.selected-alert-badge {
  display: inline-block;
}
</style>
