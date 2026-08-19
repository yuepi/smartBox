<script setup lang="ts">
import type { MerchantRecharge, MerchantRechargePageParams } from '#/api/system/merchant';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { refundByMerchantApi } from '#/api/common/pay';
import { getMerchantRechargePageApi } from '#/api/system/merchant';
import { defaultMerchantRechargeColumns, MERCHANT_RECHARGE_STORAGE_KEY } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

const props = defineProps<{ merchantId: number }>();

const emit = defineEmits(['refresh']);

const { pay_status, refund_status } = useDicts(['pay_status', 'refund_status']);

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultMerchantRechargeColumns]);
const visibleColumns = computed(() => columnConfig.value.filter((col) => col.visible));

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

// 查询参数
const queryParams = reactive<MerchantRechargePageParams>({
  pageNo: 1,
  pageSize: 10,
  merchantId: props.merchantId,
  rechargeNo: undefined,
  status: undefined,
  refundStatus: undefined,
  startTime: undefined,
  endTime: undefined,
});

const dateRange = ref<string[]>([]);
const loading = ref(false);
const tableData = ref<MerchantRecharge[]>([]);
const total = ref(0);

// 详情
const detailVisible = ref(false);
const detailData = ref<MerchantRecharge | null>(null);

// 退款
const refundVisible = ref(false);
const currentOrder = ref<MerchantRecharge | null>(null);
const refundAmount = ref(0);
const refundSubmitting = ref(false);

// 监听时间范围
watch(dateRange, (newVal) => {
  if (newVal?.length === 2) {
    queryParams.startTime = newVal[0];
    queryParams.endTime = newVal[1];
  } else {
    queryParams.startTime = undefined;
    queryParams.endTime = undefined;
  }
});

// 监听 merchantId 变化
watch(
  () => props.merchantId,
  (newId) => {
    queryParams.merchantId = newId;
    loadData();
  },
  { immediate: true }
);

function formatAmount(amount: number): string {
  return `¥ ${(amount || 0).toFixed(2)}`;
}

async function loadData() {
  if (!queryParams.merchantId) return;
  loading.value = true;
  try {
    const res = await getMerchantRechargePageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch {
    ElMessage.error('加载充值订单失败');
  } finally {
    loading.value = false;
  }
}

function handleView(row: MerchantRecharge) {
  detailData.value = row;
  detailVisible.value = true;
}

function handleRefund(row: MerchantRecharge) {
  if (row.status !== 2) {
    ElMessage.warning('只有已支付的订单才能退款');
    return;
  }
  if (row.refundStatus === 2) {
    ElMessage.warning('该订单已完成退款');
    return;
  }
  currentOrder.value = row;
  refundAmount.value = 0;
  refundVisible.value = true;
}

async function confirmRefund() {
  if (refundAmount.value <= 0) {
    ElMessage.warning('请输入退款金额');
    return;
  }
  if (!currentOrder.value) return;
  if (refundAmount.value > currentOrder.value.amount) {
    ElMessage.warning(`退款金额不能超过订单金额 ${formatAmount(currentOrder.value.amount)}`);
    return;
  }

  refundSubmitting.value = true;
  try {
    await refundByMerchantApi({
      outTradeNo: currentOrder.value.rechargeNo,
      refundAmount: refundAmount.value,
      totalAmount: currentOrder.value.amount,
    });
    ElMessage.success('退款申请已提交');
    refundVisible.value = false;
    loadData();
    emit('refresh');
  } catch {
    ElMessage.error('退款失败');
  } finally {
    refundSubmitting.value = false;
  }
}

function resetQuery() {
  queryParams.rechargeNo = undefined;
  queryParams.status = undefined;
  queryParams.refundStatus = undefined;
  dateRange.value = [];
  queryParams.startTime = undefined;
  queryParams.endTime = undefined;
  queryParams.pageNo = 1;
  loadData();
}

defineExpose({ loadData });
</script>

<template>
  <div class="recharge-table">
    <!-- 查询表单 -->
    <div class="filter-bar">
      <el-form :inline="true" :model="queryParams" class="filter-form">
        <el-form-item>
          <el-input
            v-model="queryParams.rechargeNo"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="loadData"
          >
            <template #prefix><span class="text-xs text-gray-400">充值单号:</span></template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.status" clearable style="width: 160px" placeholder="请选择">
            <template #prefix><span class="text-xs text-gray-400">支付状态:</span></template>
            <el-option
              v-for="item in pay_status"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.refundStatus" clearable style="width: 160px" placeholder="请选择">
            <template #prefix><span class="text-xs text-gray-400">退款状态:</span></template>
            <el-option
              v-for="item in refund_status"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 280px"
          />
        </el-form-item>

        <el-form-item class="filter-actions">
          <el-button type="primary" icon="Search" @click="loadData">查询</el-button>
          <el-button icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 表格 -->
    <div class="table-wrapper">
      <div class="table-toolbar">
        <div class="toolbar-left">
          <ExportButton
            :module-code="ModuleCodeMap.MERCHANT_RECHARGE"
            :fields="visibleColumns"
            :find-cond="queryParams"
          />
        </div>
        <div class="toolbar-right">
          <ColumnSelector
            :storage-key="MERCHANT_RECHARGE_STORAGE_KEY"
            :default-columns="defaultMerchantRechargeColumns"
            @update:columns="handleColumnsUpdate"
          />
        </div>
      </div>

      <el-table v-loading="loading" :data="tableData" border stripe style="width: 100%">
        <el-table-column
          v-for="col in visibleColumns"
          :key="col.key"
          :prop="col.key"
          :label="col.label"
          :width="col.width"
          :min-width="col.minWidth"
          :align="col.align"
          :show-overflow-tooltip="col.showOverflowTooltip"
        >
          <template #default="{ row }">
            <template v-if="col.key === 'status'">
              <DictTag :options="pay_status" :value="row.status" />
            </template>
            <template v-else-if="col.key === 'refundStatus'">
              <DictTag :options="refund_status" :value="row.refundStatus" />
            </template>
            <template v-else-if="col.key === 'amount'">
              <span class="text-success">{{ formatAmount(row.amount) }}</span>
            </template>
            <template v-else>
              {{ (row as any)[col.key] ?? '-' }}
            </template>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">详情</el-button>
            <el-button
              v-if="row.status === 2 && row.refundStatus !== 2"
              link
              type="danger"
              @click="handleRefund(row)"
            >
              退款
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="queryParams.pageNo"
          v-model:page-size="queryParams.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="充值订单详情" width="600px" append-to-body>
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="充值ID">{{ detailData.merchantRechargeId }}</el-descriptions-item>
        <el-descriptions-item label="充值单号">{{ detailData.rechargeNo }}</el-descriptions-item>
        <el-descriptions-item label="充值金额">
          <span class="text-success">{{ formatAmount(detailData.amount) }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="支付状态">
          <DictTag :options="pay_status" :value="detailData.status" />
        </el-descriptions-item>
        <el-descriptions-item label="充值人">{{ detailData.rechargeUserName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="支付时间">{{ detailData.payTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="退款状态">
          <DictTag :options="refund_status" :value="detailData.refundStatus" />
        </el-descriptions-item>
        <el-descriptions-item label="退款金额">
          {{ detailData.totalRefundAmount > 0 ? formatAmount(detailData.totalRefundAmount) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="退款时间">{{ detailData.refundTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="支付请求ID" :span="2">{{ detailData.payRequestId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="退款请求ID" :span="2">{{ detailData.refundRequestId || '-' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 退款弹窗 -->
    <el-dialog v-model="refundVisible" title="订单退款" width="450px" append-to-body>
      <el-form label-width="100px">
        <el-form-item label="订单金额">
          <span class="font-bold text-primary">{{ formatAmount(currentOrder?.amount || 0) }}</span>
        </el-form-item>
        <el-form-item label="退款金额" required>
          <el-input-number
            v-model="refundAmount"
            :min="0.01"
            :precision="2"
            :step="10"
            :max="currentOrder?.amount"
            placeholder="请输入退款金额"
            style="width: 100%"
          />
          <div class="text-gray-400 text-xs mt-1">最高可退 {{ formatAmount(currentOrder?.amount || 0) }}</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundVisible = false">取消</el-button>
        <el-button type="primary" :loading="refundSubmitting" @click="confirmRefund">确认退款</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.recharge-table {
  .filter-bar {
    padding: 12px 16px;
    margin-bottom: 12px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;

    .filter-form {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;

      .filter-actions {
        display: flex;
        gap: 6px;
        margin-left: auto;
      }
    }
  }

  .table-wrapper {
    .table-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .pagination-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-top: 12px;
    }
  }
}
</style>
