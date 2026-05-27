<!-- components/MerchantRechargeTable.vue -->
 <script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';

import { Refresh, Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

import { refundByMerchantApi } from '#/api/common/pay';
import {
  getPlatMerchantRechargePageApi,
  type MerchantRecharge,
  type MerchantRechargePageParams,
} from '#/api/system/merchant';
import ColumnSelector from '#/components/ColumnSelector/index.vue';
import DictTag from '#/components/DictTag/index.vue';
import {
  defaultMerchantRechargeColumns,
  MERCHANT_RECHARGE_STORAGE_KEY,
  type TableColumnConfig,
} from '#/constants/tableColumns';
import { useDicts } from '#/hooks/useDict';
import { ModuleCodeMap } from '#/hooks/useExport';

const props = defineProps<{ merchantId: number }>();

const emit = defineEmits(['refresh']);

const { pay_status, refund_status } = useDicts(['pay_status', 'refund_status']);

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultMerchantRechargeColumns]);
const visibleColumns = computed(() => columnConfig.value.filter(col => col.visible));
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

const payStatusOptions = [
  { label: "待支付", value: 0 },
  { label: "支付中", value: 1 },
  { label: "已支付", value: 2 },
  { label: "支付失败", value: 3 },
];

const refundStatusOptions = [
  { label: "未退款", value: 0 },
  { label: "退款中", value: 1 },
  { label: "已退款", value: 2 },
  { label: "退款失败", value: 3 },
];

watch(dateRange, (newVal) => {
  if (newVal?.length === 2) {
    queryParams.startTime = newVal[0];
    queryParams.endTime = newVal[1];
  } else {
    queryParams.startTime = undefined;
    queryParams.endTime = undefined;
  }
});

watch(() => props.merchantId, (newId) => {
  queryParams.merchantId = newId;
  loadData();
});

function formatAmount(amount: number): string {
  return `¥ ${(amount || 0).toFixed(2)}`;
}

function getPayStatusText(status: number): string {
  const map: Record<number, string> = { 0: "待支付", 1: "支付中", 2: "已支付", 3: "支付失败" };
  return map[status] || "未知";
}

function getPayStatusType(status: number): string {
  const map: Record<number, string> = { 0: "warning", 1: "info", 2: "success", 3: "danger" };
  return map[status] || "info";
}

function getRefundStatusText(status: number): string {
  const map: Record<number, string> = { 0: "未退款", 1: "退款中", 2: "已退款", 3: "退款失败" };
  return map[status] || "未知";
}

function getRefundStatusType(status: number): string {
  const map: Record<number, string> = { 0: "info", 1: "warning", 2: "success", 3: "danger" };
  return map[status] || "info";
}

async function loadData() {
  loading.value = true;
  try {
    const res = await getPlatMerchantRechargePageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch {
    ElMessage.error("加载充值订单失败");
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
    ElMessage.warning("只有已支付的订单才能退款");
    return;
  }
  if (row.refundStatus === 2) {
    ElMessage.warning("该订单已完成退款");
    return;
  }
  currentOrder.value = row;
  refundAmount.value = 0;
  refundVisible.value = true;
}

async function confirmRefund() {
  if (refundAmount.value <= 0) {
    ElMessage.warning("请输入退款金额");
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
    ElMessage.success("退款申请已提交");
    refundVisible.value = false;
    loadData();
    emit('refresh');
  } catch {
    ElMessage.error("退款失败");
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
    <el-card shadow="never" class="border-none mb-4 !p-2">
      <el-form :inline="true" :model="queryParams" class="flex flex-wrap gap-x-2 gap-y-2 items-center">
        <el-form-item class="!mb-0 !mr-2">
          <el-input v-model="queryParams.rechargeNo" placeholder="请输入" clearable style="width: 200px" @keyup.enter="loadData">
            <template #prefix><span class="text-xs text-gray-400 mr-0.5">充值单号:</span></template>
          </el-input>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-2">
          <el-select v-model="queryParams.status" clearable style="width: 200px">
            <template #prefix><span class="text-xs text-gray-400 mr-0.5">支付状态:</span></template>
            <el-option v-for="item in payStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-2">
          <el-select v-model="queryParams.refundStatus" clearable style="width: 200px">
            <template #prefix><span class="text-xs text-gray-400 mr-0.5">退款状态:</span></template>
            <el-option v-for="item in refundStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-2">
          <el-date-picker
v-model="dateRange" type="datetimerange" range-separator="至"
            start-placeholder="开始时间" end-placeholder="结束时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 280px"
/>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-0 md:ml-auto flex items-center gap-1">
          <el-tooltip content="查询" placement="top">
            <el-button type="primary" :icon="Search" circle @click="loadData" />
          </el-tooltip>
          <el-tooltip content="重置" placement="top">
            <el-button :icon="Refresh" circle @click="resetQuery" />
          </el-tooltip>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格操作栏 -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <ExportButton :module-code="ModuleCodeMap.MERCHANT_RECHARGE" :fields="visibleColumns" :find-cond="queryParams" />
      </div>
      <div class="flex items-center">
        <ColumnSelector
:storage-key="MERCHANT_RECHARGE_STORAGE_KEY" :default-columns="defaultMerchantRechargeColumns"
          @update:columns="handleColumnsUpdate"
/>
      </div>
    </div>

    <!-- 表格 -->
    <el-table v-loading="loading" :data="tableData" border stripe style="width: 100%">
      <el-table-column
v-for="col in visibleColumns" :key="col.key" :prop="col.key" :label="col.label"
        :width="col.width" :min-width="col.minWidth" :align="col.align" :show-overflow-tooltip="col.showOverflowTooltip"
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
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="handleView(row)">详情</el-button>
          <el-button v-if="row.status === 2 && row.refundStatus !== 2" link type="danger" @click="handleRefund(row)">
            退款
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="flex justify-end mt-4">
      <el-pagination
v-model:current-page="queryParams.pageNo" v-model:page-size="queryParams.pageSize"
        :total="total" :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper"
        background @size-change="loadData" @current-change="loadData"
/>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="充值订单详情" width="600px" append-to-body>
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="充值ID">{{ detailData.merchantRechargeId }}</el-descriptions-item>
        <el-descriptions-item label="充值单号">{{ detailData.rechargeNo }}</el-descriptions-item>
        <el-descriptions-item label="充值金额"><span class="text-success">{{ formatAmount(detailData.amount) }}</span></el-descriptions-item>
        <el-descriptions-item label="支付状态">
          <el-tag :type="getPayStatusType(detailData.status)" size="small">{{ getPayStatusText(detailData.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="充值人">{{ detailData.rechargeUserName || "-" }}</el-descriptions-item>
        <el-descriptions-item label="支付时间">{{ detailData.payTime || "-" }}</el-descriptions-item>
        <el-descriptions-item label="退款状态">
          <el-tag :type="getRefundStatusType(detailData.refundStatus)" size="small">{{ getRefundStatusText(detailData.refundStatus) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="退款金额">{{ detailData.totalRefundAmount > 0 ? formatAmount(detailData.totalRefundAmount) : "-" }}</el-descriptions-item>
        <el-descriptions-item label="退款时间">{{ detailData.refundTime || "-" }}</el-descriptions-item>
        <el-descriptions-item label="支付请求ID" :span="2">{{ detailData.payRequestId || "-" }}</el-descriptions-item>
        <el-descriptions-item label="退款请求ID" :span="2">{{ detailData.refundRequestId || "-" }}</el-descriptions-item>
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
v-model="refundAmount" :min="0.01" :precision="2" :step="10" :max="currentOrder?.amount"
            placeholder="请输入退款金额" style="width: 100%"
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

