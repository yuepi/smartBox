<script lang="ts" setup>
import type { Merchant, MerchantRecharge } from '#/api/system/merchant';

import {
  editPlatMerchantConfigApi,
  getPlatMerchantAccountApi,
  getPlatMerchantConfigDetailApi,
} from '#/api/system/merchant';

import MerchantFlowTable from './MerchantFlowTable.vue';
import MerchantRechargeTable from './MerchantRechargeTable.vue';
import RefundDialog from './RefundDialog.vue';

// --- 状态 ---
const visible = ref(false);
const loading = ref(false);
const currentMerchant = ref<Merchant | null>(null);
const accountDetail = ref<null | {
  balance: number;
  merchantAccountId: number;
  merchantId: number;
  status: number;
}>(null);
const activeTab = ref('recharge');

// 充值订单详情
const rechargeDetailVisible = ref(false);
const rechargeDetail = ref<MerchantRecharge | null>(null);

// 退款弹窗
const refundDialogRef = ref();

// --- 辅助函数 ---
function getStatusText(status: number): string {
  return status === 0 ? '启用' : '禁用';
}

function getAccountStatusText(status: number): string {
  return status === 0 ? '正常' : '冻结';
}

function getAccountStatusType(status: number): string {
  return status === 0 ? 'success' : 'danger';
}

function formatBalance(balance: number): string {
  if (balance === undefined || balance === null) return '¥ 0.00';
  return `¥ ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// --- 加载数据 ---
async function loadData(merchantId: number) {
  loading.value = true;
  try {
    const accountRes = await getPlatMerchantAccountApi(merchantId);
  
    accountDetail.value = accountRes || {
      merchantAccountId: 0,
      merchantId,
      balance: 0,
      status: 1,
    };
  } catch {
    ElMessage.error('获取账户信息失败');
  } finally {
    loading.value = false;
  }
}

// --- 充值订单详情 ---
function handleViewRecharge(row: MerchantRecharge) {
  rechargeDetail.value = row;
  rechargeDetailVisible.value = true;
}

// --- 退款 ---
function handleOpenRefund(row: MerchantRecharge) {
  refundDialogRef.value?.open(row);
}

// --- 打开抽屉 ---
async function open(row: Merchant) {
  currentMerchant.value = row;
  visible.value = true;
  activeTab.value = 'recharge';
  await loadData(row.merchantId);
}

defineExpose({ open });
</script>

<template>
  <el-drawer
v-model="visible" :title="`账户详情 - ${currentMerchant?.merchantName}`" size="70%"
    :close-on-click-modal="false" destroy-on-close
>
    <div v-loading="loading" class="drawer-content">
      <!-- 账户信息 -->
      <el-descriptions :column="3" border v-if="accountDetail">
        <el-descriptions-item label="商户名称">{{ currentMerchant?.merchantName }}</el-descriptions-item>
        <el-descriptions-item label="商户编码">{{ currentMerchant?.merchantCode }}</el-descriptions-item>
        <el-descriptions-item label="账户ID">{{ accountDetail.merchantAccountId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="账户余额" label-class-name="font-medium">
          <span class="text-lg font-bold" :class="accountDetail.balance > 0 ? 'text-success' : 'text-danger'">
            {{ formatBalance(accountDetail.balance) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="账户状态">
          <el-tag :type="getAccountStatusType(accountDetail.status)" size="default">
            {{ getAccountStatusText(accountDetail.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="商户状态">
          <el-tag :type="currentMerchant?.status === 0 ? 'success' : 'danger'" size="default">
            {{ getStatusText(currentMerchant?.status ?? 0) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <!-- Tabs -->
      <el-tabs v-model="activeTab" class="mt-4">
        <el-tab-pane label="充值订单" name="recharge">
          <MerchantRechargeTable
:merchant-id="currentMerchant!.merchantId" @view-detail="handleViewRecharge"
            @open-refund="handleOpenRefund"
/>
        </el-tab-pane>

        <el-tab-pane label="资金流水" name="flow">
          <MerchantFlowTable :merchant-id="currentMerchant!.merchantId" />
        </el-tab-pane>

        <el-tab-pane label="商户配置" name="config">
          <MerchantConfigForm
:merchant-id="currentMerchant!.merchantId"
            :get-config-api="getPlatMerchantConfigDetailApi" :save-config-api="editPlatMerchantConfigApi"
/>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 底部操作栏 -->
    <template #footer>
      <div class="flex justify-end gap-2 px-4 py-2">
        <el-button @click="visible = false">关闭</el-button>
        <el-button type="primary" @click="currentMerchant && loadData(currentMerchant.merchantId)" :loading="loading">
          刷新
        </el-button>
      </div>
    </template>
  </el-drawer>

  <!-- 充值订单详情 -->
  <el-dialog v-model="rechargeDetailVisible" title="充值订单详情" width="600px" append-to-body>
    <el-descriptions :column="2" border v-if="rechargeDetail">
      <el-descriptions-item label="充值ID">{{ rechargeDetail.merchantRechargeId }}</el-descriptions-item>
      <el-descriptions-item label="充值单号">{{ rechargeDetail.rechargeNo }}</el-descriptions-item>
      <el-descriptions-item label="充值金额">
        <span class="text-success">¥ {{ (rechargeDetail.amount || 0).toFixed(2) }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="支付状态">
        <el-tag :type="rechargeDetail.status === 2 ? 'success' : 'warning'" size="small">
          {{ rechargeDetail.status === 2 ? '已支付' : '待支付' }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="充值人">{{ rechargeDetail.rechargeUserName || '-' }}</el-descriptions-item>
      <el-descriptions-item label="支付时间">{{ rechargeDetail.payTime || '-' }}</el-descriptions-item>
      <el-descriptions-item label="退款状态">
        <el-tag :type="rechargeDetail.refundStatus === 2 ? 'success' : 'info'" size="small">
          {{ rechargeDetail.refundStatus === 2 ? '已退款' : '未退款' }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="退款金额">
        {{ rechargeDetail.totalRefundAmount > 0 ? `¥ ${(rechargeDetail.totalRefundAmount || 0).toFixed(2)}` : '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="退款时间">{{ rechargeDetail.refundTime || '-' }}</el-descriptions-item>
      <el-descriptions-item label="支付请求ID" :span="2">{{ rechargeDetail.payRequestId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="退款请求ID" :span="2">{{ rechargeDetail.refundRequestId || '-' }}</el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button @click="rechargeDetailVisible = false">关闭</el-button>
    </template>
  </el-dialog>

  <!-- 退款弹窗 -->
  <RefundDialog ref="refundDialogRef" />
</template>
