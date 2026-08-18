<script lang="ts" setup>
import type { StockCheck, StockCheckPageParams } from '#/api/stock/stockCheck';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from '@vben/common-ui';

import {
  confirmStockCheckApi,
  deleteStockCheckApi,
  executeStockCheckApi,
  getStockCheckPageApi,
} from '#/api/stock/stockCheck';
import { getWarehouseListApi } from '#/api/stock/warehouse';
import { defaultStockCheckColumns, STOCK_CHECK_STORAGE_KEY } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

import StockCheckDetail from './StockCheckDetail.vue';
import StockCheckForm from './StockCheckForm.vue';

const { stock_check_type, stock_check_status } = useDicts(['stock_check_type', 'stock_check_status']);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultStockCheckColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const stockCheckFormRef = ref();
const stockCheckDetailRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<StockCheck[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

// 执行盘点弹窗
const executeDialogVisible = ref(false);
const executeLoading = ref(false);
const currentCheck = ref<null | StockCheck>(null);
const executeItems = ref<{ evidenceUrl: string; itemId: number; realWeight: number; reason: string; }[]>([]);

// 确认盘点弹窗
const confirmDialogVisible = ref(false);
const confirmLoading = ref(false);
const confirmRemark = ref('');

// 下拉选项
const warehouseOptions = ref<{ label: string; value: number }[]>([]);

// 查询参数
const queryParams = reactive<StockCheckPageParams>({
  pageNo: 1,
  pageSize: 10,
  checkNo: undefined,
  warehouseId: undefined,
  checkType: undefined,
  checkStatus: undefined,
});

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
    const res = await getStockCheckPageApi(queryParams);
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
  stockCheckFormRef.value?.open();
}

// --- 编辑 ---
function handleEdit(row: StockCheck) {
  stockCheckFormRef.value?.open(row);
}

// --- 详情 ---
function handleView(row: StockCheck) {
  stockCheckDetailRef.value?.open(row);
}

// --- 打开执行盘点弹窗 ---
function handleOpenExecute(row: StockCheck) {
  currentCheck.value = row;
  // 从详情获取明细数据
  executeItems.value = (row.items || []).map((item) => ({
    itemId: item.stockCheckItemId,
    realWeight: item.realWeight || 0,
    reason: '',
    evidenceUrl: '',
  }));
  executeDialogVisible.value = true;
}

// --- 执行盘点 ---
async function handleExecute() {
  if (!currentCheck.value) return;

  // 验证是否所有明细都已录入实际重量
  const invalidItems = executeItems.value.filter((item) => item.realWeight < 0);
  if (invalidItems.length > 0) {
    ElMessage.warning('请确保所有明细的实际重量大于等于0');
    return;
  }

  executeLoading.value = true;
  try {
    await executeStockCheckApi({
      stockCheckId: currentCheck.value.stockCheckId,
      items: executeItems.value.map((item) => ({
        stockCheckItemId: item.itemId,
        realWeight: item.realWeight,
        reason: item.reason,
        evidenceUrl: item.evidenceUrl,
      })),
    });
    ElMessage.success('执行盘点成功');
    executeDialogVisible.value = false;
    loadData();
  } catch {
    ElMessage.error('执行盘点失败');
  } finally {
    executeLoading.value = false;
  }
}

// --- 打开确认盘点弹窗 ---
function handleOpenConfirm(row: StockCheck) {
  currentCheck.value = row;
  confirmRemark.value = '';
  confirmDialogVisible.value = true;
}

// --- 确认盘点 ---
async function handleConfirm() {
  if (!currentCheck.value) return;

  confirmLoading.value = true;
  try {
    await confirmStockCheckApi({
      stockCheckId: currentCheck.value.stockCheckId,
      reviewRemark: confirmRemark.value,
    });
    ElMessage.success('确认盘点成功');
    confirmDialogVisible.value = false;
    loadData();
  } catch {
    ElMessage.error('确认盘点失败');
  } finally {
    confirmLoading.value = false;
  }
}

// --- 删除 ---
async function handleDelete(row?: StockCheck) {
  let ids: number[] = [];
  if (row) {
    ids = [row.stockCheckId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${ids.length} 条盘点单吗？`, '提示', { type: 'warning' });
    for (const id of ids) {
      await deleteStockCheckApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条盘点单`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: StockCheck[]) {
  selectedIds.value = selection.map((item) => item.stockCheckId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.checkNo = undefined;
  queryParams.warehouseId = undefined;
  queryParams.checkType = undefined;
  queryParams.checkStatus = undefined;
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
            v-model="queryParams.checkNo"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">盘点单号:</span>
            </template>
          </el-input>
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <template #search-advanced>
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
          <el-select v-model="queryParams.checkType" clearable style="width: 200px">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">盘点类型:</span>
            </template>
            <el-option
              v-for="item in stock_check_type"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.checkStatus" clearable style="width: 200px">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">盘点状态:</span>
            </template>
            <el-option
              v-for="item in stock_check_status"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </template>

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <el-button type="primary" plain icon="Plus" @click="handleAdd">新增盘点单</el-button>
        <ExportButton :module-code="ModuleCodeMap.STOCK_CHECK" :fields="visibleColumns" :find-cond="queryParams" />
        <el-button type="danger" plain icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete()">
          批量删除
        </el-button>
        <transition name="el-fade-in">
          <span v-if="selectedIds.length > 0" class="selected-alert-badge ml-2 text-xs text-gray-400">
            已选 <span class="text-red-500 font-medium">{{ selectedIds.length }}</span> 项
          </span>
        </transition>
      </template>

      <!-- 📥 工具栏右侧 -->
      <template #toolbar-right>
        <ColumnSelector
          :storage-key="STOCK_CHECK_STORAGE_KEY"
          :default-columns="defaultStockCheckColumns"
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
              <template v-if="col.key === 'checkType'">
                <DictTag :options="stock_check_type" :value="row.checkType" />
              </template>
              <template v-else-if="col.key === 'checkStatus'">
                <DictTag :options="stock_check_status" :value="row.checkStatus" />
              </template>
              <template v-else-if="col.key === 'totalProfitWeight'">
                {{ row.totalProfitWeight?.toFixed(2) || 0 }}
              </template>
              <template v-else-if="col.key === 'totalLossWeight'">
                {{ row.totalLossWeight?.toFixed(2) || 0 }}
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="400" fixed="right" align="center">
            <template #default="{ row }">
              <el-tooltip content="详情" placement="top" :enterable="false">
                <el-button link type="primary" icon="View" @click="handleView(row)" />
              </el-tooltip>
              <el-tooltip content="编辑" placement="top" :enterable="false">
                <el-button link type="primary" icon="Edit" @click="handleEdit(row)" />
              </el-tooltip>
              <el-tooltip
                v-if="row.checkStatus === 0"
                content="执行盘点"
                placement="top"
                :enterable="false"
              >
                <el-button link type="success" icon="EditPen" @click="handleOpenExecute(row)" />
              </el-tooltip>
              <el-tooltip
                v-if="row.checkStatus === 0"
                content="确认盘点"
                placement="top"
                :enterable="false"
              >
                <el-button link type="primary" icon="Check" @click="handleOpenConfirm(row)" />
              </el-tooltip>
              <el-tooltip content="删除" placement="top" :enterable="false">
                <el-button link type="danger" icon="Delete" @click="handleDelete(row)" />
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <StockCheckForm ref="stockCheckFormRef" @success="handleQuery" />
    <StockCheckDetail ref="stockCheckDetailRef" />

    <!-- 执行盘点弹窗 -->
    <el-dialog
      v-model="executeDialogVisible"
      title="执行盘点"
      width="700px"
      append-to-body
    >
      <div v-if="currentCheck">
        <div class="text-sm text-gray-400 mb-3">
          盘点单号：{{ currentCheck.checkNo }} | 盘点类型：{{ currentCheck.checkType === 0 ? '全盘' : '抽盘' }}
        </div>
        <el-table :data="executeItems" border stripe>
          <el-table-column prop="itemId" label="明细ID" width="100" align="center" />
          <el-table-column label="品类" width="120" align="center">
            <template #default="{ row }">
              {{ row.packageType || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="账面重量(kg)" width="140" align="center">
            <template #default="{ row }">
              {{ row.stockWeight?.toFixed(2) || 0 }}
            </template>
          </el-table-column>
          <el-table-column label="实际重量(kg)" width="160" align="center">
            <template #default="{ row, $index }">
              <el-input-number
                v-model="executeItems[$index].realWeight"
                :min="0"
                :precision="2"
                :controls="false"
                size="small"
                style="width: 100%"
              />
            </template>
          </el-table-column>
          <el-table-column label="差异原因" min-width="150">
            <template #default="{ row, $index }">
              <el-input
                v-model="executeItems[$index].reason"
                placeholder="请输入差异原因"
                size="small"
              />
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="executeDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="executeLoading" @click="handleExecute">确定执行</el-button>
      </template>
    </el-dialog>

    <!-- 确认盘点弹窗 -->
    <el-dialog
      v-model="confirmDialogVisible"
      title="确认盘点"
      width="450px"
      append-to-body
    >
      <el-form>
        <el-form-item label="确认备注">
          <el-input
            v-model="confirmRemark"
            type="textarea"
            :rows="3"
            placeholder="请输入确认备注（可选）"
          />
        </el-form-item>
        <div class="text-yellow-600 text-sm bg-yellow-50 p-3 rounded-lg">
          <el-icon class="mr-1"><Warning /></el-icon>
          确认后盘点将完成，数据将影响实时库存，请确认无误后再操作。
        </div>
      </el-form>
      <template #footer>
        <el-button @click="confirmDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="confirmLoading" @click="handleConfirm">确认盘点</el-button>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped>
.selected-alert-badge {
  display: inline-block;
}
</style>
