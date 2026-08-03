<script lang="ts" setup>
import type { RecycleOrder, RecycleOrderPageParams } from '#/api/operation/recycleOrder';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from '@vben/common-ui';

import { getDeviceListApi } from '#/api/device/device';
import {
  abnormalOrderApi,
  cancelOrderApi,
  deleteRecycleOrderApi,
  directCompleteOrderApi,
  getRecycleOrderPageApi,
} from '#/api/operation/recycleOrder';
import { getMerchantDeptListApi } from '#/api/system/dept';
import { defaultRecycleOrderColumns, RECYCLE_ORDER_STORAGE_KEY } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';
import { getRecentDays } from '#/utils/date';

import OrderDetail from './OrderDetail.vue';
import OrderRemark from './OrderRemark.vue';
import OrderWeight from './OrderWeight.vue';

const { order_status } = useDicts(['order_status']);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultRecycleOrderColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const orderDetailRef = ref();
const orderWeightRef = ref();
const orderRemarkRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<RecycleOrder[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);
const dateRange = ref<string[]>([]);

// 下拉选项
const deviceOptions = ref<Device[]>([]);
const deptOptions = ref<Dept[]>([]);

// 查询参数
const queryParams = reactive<RecycleOrderPageParams>({
  pageNo: 1,
  pageSize: 10,
  orderNo: undefined,
  deptId: undefined,
  deviceId: undefined,
  orderStatus: undefined,
  payStatus: undefined,
  memberId: undefined,
  memberPhone: undefined,
  startTime: undefined,
  endTime: undefined,
  deviceNo: undefined,
  deviceName: undefined,
});

// --- 初始化日期 ---
function initDateRange() {
  const { startTime, endTime } = getRecentDays(7);
  dateRange.value = [startTime, endTime];
  queryParams.startTime = startTime;
  queryParams.endTime = endTime;
}

watch(dateRange, (newVal) => {
  if (newVal?.length === 2) {
    queryParams.startTime = newVal[0];
    queryParams.endTime = newVal[1];
  } else {
    queryParams.startTime = undefined;
    queryParams.endTime = undefined;
  }
});

// --- 辅助函数 ---
function formatAmount(amount: number): string {
  if (amount === undefined || amount === null) return '¥ 0.00';
  return `¥ ${amount.toFixed(2)}`;
}

// --- 加载选项 ---
async function loadOptions() {
  try {
    const [deviceRes, deptRes] = await Promise.all([
      getDeviceListApi({ status: 0 }),
      getMerchantDeptListApi({ status: 0 }),
    ]);
    deviceOptions.value = deviceRes || [];
    deptOptions.value = deptRes || [];
  } catch (error) {
    console.error(error);
  }
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getRecycleOrderPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

// --- 详情 ---
function handleView(row: RecycleOrder) {
  orderDetailRef.value?.open(row);
}

// --- 异常订单 ---
async function handleAbnormal(row: RecycleOrder) {
  try {
    await ElMessageBox.confirm(`确定要将订单【${row.orderNo}】标记为异常吗？`, '异常订单', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });
    await abnormalOrderApi(row.recycleOrderId);
    ElMessage.success('已标记为异常');
    loadData();
  } catch {
    // 取消操作
  }
}

// --- 取消订单 ---
async function handleCancel(row: RecycleOrder) {
  try {
    await ElMessageBox.confirm(`确定要将订单【${row.orderNo}】标记为已取消吗？`, '取消订单', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });
    await cancelOrderApi(row.recycleOrderId);
    ElMessage.success('已标记为已取消');
    loadData();
  } catch {
    // 取消操作
  }
}



// --- 直接完成 ---
async function handleDirectComplete(row: RecycleOrder) {
  try {
    await directCompleteOrderApi(row.recycleOrderId);
    ElMessage.success('直接通过成功');
    loadData();
  } catch {
    ElMessage.error('直接通过失败');
  }
}

// --- 补重/扣重 ---
function handleWeight(row: RecycleOrder) {
  orderWeightRef.value?.open(row);
}

// --- 备注 ---
function handleRemark(row: RecycleOrder) {
  orderRemarkRef.value?.open(row);
}

// --- 删除 ---
async function handleDelete(row?: RecycleOrder) {
  let ids: number[] = [];
  if (row) {
    ids = [row.recycleOrderId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${ids.length} 条订单吗？`, '提示', { type: 'warning' });
    for (const id of ids) {
      await deleteRecycleOrderApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条订单`);
    selectedIds.value = [];
    loadData();
  } catch {
    // 取消删除
  }
}

function handleCommand(cmd: string, row: RecycleOrder) {
  switch (cmd) {
    case 'abnormal': {
      handleAbnormal(row);
      break;
    }
    case 'cancel': {
      handleCancel(row);
      break;
    }
    case 'directComplete': {
      handleDirectComplete(row);
      break;
    }
    case 'remark': {
      handleRemark(row);
      break;
    }
    case 'weight': {
      handleWeight(row);
      break;
    }
  }
}

function handleSelectionChange(selection: RecycleOrder[]) {
  selectedIds.value = selection.map((item) => item.recycleOrderId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.orderNo = undefined;
  queryParams.memberId = undefined;
  queryParams.deptId = undefined;
  queryParams.deviceId = undefined;
  queryParams.orderStatus = undefined;
  queryParams.payStatus = undefined;
  queryParams.memberPhone = undefined;
  queryParams.startTime = undefined;
  queryParams.endTime = undefined;
  queryParams.deviceNo = undefined;
  queryParams.deviceName = undefined;
  queryParams.pageNo = 1;
  loadData();
}

onMounted(() => {
  initDateRange();
  loadOptions();
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <BaseTableLayout
v-model:query-params="queryParams" v-model:more-params="moreParams" :loading="loading"
      :total="total" @search="loadData" @reset="resetQuery"
>
      <!-- 📥 基础筛选项 -->
      <template #search-basic>
        <el-form-item>
          <el-input
v-model="queryParams.orderNo" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">订单编号:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
v-model="queryParams.memberId" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">会员ID:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
v-model="queryParams.memberPhone" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">手机号:</span>
            </template>
          </el-input>
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <template #search-advanced>
        <el-form-item>
          <el-tree-select
v-model="queryParams.deptId" :data="deptOptions" :props="{
            value: 'deptId',
            label: 'deptName',
            children: 'children',
          }" placeholder="请选择" clearable check-strictly style="width: 200px" class="tree-prefix-dept"
/>
        </el-form-item>

        <el-form-item>
          <el-input
v-model="queryParams.deviceNo" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">设备编号:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
v-model="queryParams.deviceName" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">设备名称:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.orderStatus" clearable style="width: 200px">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">订单状态:</span>
            </template>
            <el-option v-for="item in order_status" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-date-picker
v-model="dateRange" type="datetimerange" range-separator="至" start-placeholder="开始时间"
            end-placeholder="结束时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 360px"
/>
        </el-form-item>
      </template>

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <ExportButton :module-code="ModuleCodeMap.RECYCLE_ORDER" :fields="visibleColumns" :find-cond="queryParams" />
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
:storage-key="RECYCLE_ORDER_STORAGE_KEY" :default-columns="defaultRecycleOrderColumns"
          @update:columns="handleColumnsUpdate"
/>
      </template>

      <!-- 📥 表格 -->
      <template #table>
        <el-table
:data="tableData" border stripe style="width: 100%; height: 100%"
          @selection-change="handleSelectionChange"
>
          <el-table-column type="selection" width="50" align="center" />

          <el-table-column
v-for="col in visibleColumns" :key="col.key" :prop="col.key" :label="col.label"
            :width="typeof col.width === 'number' ? col.width : undefined" :min-width="col.minWidth" :align="col.align"
            :show-overflow-tooltip="col.showOverflowTooltip || false"
>
            <template #default="{ row }">
              <template v-if="col.key === 'orderStatus'">
                <DictTag :options="order_status" :value="row.orderStatus" />
              </template>
              <template v-else-if="col.key === 'weight'">
                {{ row.weight?.toFixed(2) || 0 }} kg
              </template>
              <template v-else-if="col.key === 'realAmount'">
                <span class="font-medium text-primary">{{ formatAmount(row.realAmount) }}</span>
              </template>
              <template v-else-if="col.key === 'beforeAfterWeight'">
                <span>{{ (row.beforeWeight || 0).toFixed(2) }} → {{ (row.afterWeight || 0).toFixed(2) }} kg</span>
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="150" fixed="right" align="center">
            <template #default="{ row }">
              <div class="action-buttons">
              <el-tooltip content="详情" placement="top" :enterable="false">
                <el-button link type="primary" icon="View" @click="handleView(row)" />
              </el-tooltip>
              <el-dropdown @command="(cmd: string) => handleCommand(cmd, row)">
                <el-button link type="primary" icon="More" />
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="abnormal" icon="Warning">异常订单</el-dropdown-item>
                    <el-dropdown-item command="cancel" icon="Close">取消异常</el-dropdown-item>
                    <el-dropdown-item command="weight" icon="ScaleToOriginal">补重/扣重</el-dropdown-item>
                    <el-dropdown-item command="remark" icon="ChatDotRound">添加备注</el-dropdown-item>
                    <el-dropdown-item command="directComplete" icon="Check">直接完成</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <!-- ===== 弹窗 ===== -->
    <OrderDetail ref="orderDetailRef" />
    <OrderWeight ref="orderWeightRef" @success="handleQuery" />
    <OrderRemark ref="orderRemarkRef" @success="handleQuery" />
  </Page>
</template>

<style scoped lang="scss">
.action-buttons {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;

  .el-button {
    margin-right: 0;
    margin-left: 0;
  }
}

.tree-prefix-dept :deep(.el-select__wrapper) {
  position: relative;
  padding-left: 45px !important;
}

.tree-prefix-dept :deep(.el-select__wrapper)::before {
  position: absolute;
  top: 50%;
  left: 12px;
  font-size: 12px;
  font-weight: 400;
  color: #909399;
  pointer-events: none;
  content: "部门:";
  transform: translateY(-50%);
}
</style>
