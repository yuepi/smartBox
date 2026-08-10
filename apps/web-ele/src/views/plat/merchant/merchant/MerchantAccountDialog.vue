<script lang="ts" setup>
import type { Merchant, MerchantConfig, MerchantRecharge } from '#/api/system/merchant';

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
const configLoading = ref(false);
const configSubmitting = ref(false);
const currentMerchant = ref<Merchant | null>(null);
const accountDetail = ref<null | {
  balance: number;
  merchantAccountId: number;
  merchantId: number;
  status: number;
}>(null);
const configData = ref<MerchantConfig | null>(null);
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
    const [accountRes, configRes] = await Promise.all([
      getPlatMerchantAccountApi(merchantId),
      getPlatMerchantConfigDetailApi(merchantId),
    ]);
    accountDetail.value = accountRes || {
      merchantAccountId: 0,
      merchantId,
      balance: 0,
      status: 1,
    };
    configData.value = configRes;
  } catch {
    ElMessage.error('获取账户信息失败');
  } finally {
    loading.value = false;
  }
}

// --- 保存配置 ---
async function handleSaveConfig() {
  if (!configData.value) return;
  configSubmitting.value = true;
  try {
    await editPlatMerchantConfigApi({
      merchantConfigId: configData.value.merchantConfigId,
      orderWalletSync: configData.value.orderWalletSync,
      status: configData.value.status,
      firstOrderNoAudit: configData.value.firstOrderNoAudit,
      autoAuditEnabled: configData.value.autoAuditEnabled,
      autoAuditHours: configData.value.autoAuditHours,
    });
    ElMessage.success('保存成功');
  } catch {
    ElMessage.error('保存失败');
  } finally {
    configSubmitting.value = false;
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
:merchant-id="currentMerchant?.merchantId" @view-detail="handleViewRecharge"
            @open-refund="handleOpenRefund"
/>
        </el-tab-pane>

        <el-tab-pane label="资金流水" name="flow">
          <MerchantFlowTable :merchant-id="currentMerchant?.merchantId" />
        </el-tab-pane>

        <el-tab-pane label="商户配置" name="config">
          <div v-loading="configLoading" class="config-form">
            <el-form v-if="configData" :model="configData" label-width="220px" label-position="right">
              <el-form-item label="回收订单审核方式">
                <el-select v-model="configData.orderWalletSync" placeholder="请选择" style="width: 100%">
                  <el-option label="不需要审核，直接到钱包" :value="0" />
                  <el-option label="需要审核，到预计收益" :value="1" />
                </el-select>
                <div class="text-gray-400 text-xs mt-1">选择后影响回收订单的收益结算方式</div>
              </el-form-item>

              <el-form-item label="用户首次订单免审核">
                <el-radio-group v-model="configData.firstOrderNoAudit">
                  <el-radio :value="1">是</el-radio>
                  <el-radio :value="0">否</el-radio>
                </el-radio-group>
                <div class="text-gray-400 text-xs ml-2">开启后，用户首次订单无需审核直接入账</div>
              </el-form-item>

              <el-form-item label="自动审核开关">
                <el-radio-group v-model="configData.autoAuditEnabled">
                  <el-radio :value="1">启用</el-radio>
                  <el-radio :value="0">禁用</el-radio>
                </el-radio-group>
                <div class="text-gray-400 text-xs ml-2">开启后，到达设定时间订单自动审核通过</div>
              </el-form-item>

              <el-form-item v-if="configData.autoAuditEnabled === 1" label="自动审核时间阈值">
                <el-input-number v-model="configData.autoAuditHours" :min="1" :max="720" style="width: 200px" />
                <span class="ml-2 text-gray-500">小时</span>
                <div class="text-gray-400 text-xs m2-1">订单创建超过此时间后自动审核通过，默认 24 小时</div>
              </el-form-item>

              <el-form-item>
                <el-button type="primary" :loading="configSubmitting" @click="handleSaveConfig">保存配置</el-button>
              </el-form-item>
            </el-form>
            <el-empty v-else description="暂无配置信息" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 底部操作栏 -->
    <template #footer>
      <div class="drawer-footer">
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

<style scoped>
.drawer-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
