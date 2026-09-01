<script lang="ts" setup>
import type { MemberWithdraw } from '#/api/member/memberWithdraw';

import { getMemberWithdrawDetailApi } from '#/api/member/memberWithdraw';

const { withdraw_status } = useDicts(['withdraw_status']);

const visible = ref(false);
const detailData = ref<MemberWithdraw | null>(null);

function getAuditModeText(mode: number): string {
  const map: Record<number, string> = { 0: '人工审核', 1: '自动审核' };
  return map[mode] || '未知';
}

function formatAmount(amount: number): string {
  return `¥ ${(amount || 0).toFixed(2)}`;
}

async function open(row: MemberWithdraw) {
  visible.value = true;
  try {
    const res = await getMemberWithdrawDetailApi(row.memberWithdrawId);
    detailData.value = res;
  } catch {
    ElMessage.error('获取详情失败');
    visible.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="提现详情" width="700px" append-to-body>
    <el-descriptions :column="2" border v-if="detailData">
      <el-descriptions-item label="提现单号" :span="2">{{
        detailData.withdrawNo
      }}</el-descriptions-item>
      <el-descriptions-item label="会员ID">{{
        detailData.memberId
      }}</el-descriptions-item>
      <el-descriptions-item label="商户ID">{{
        detailData.merchantId || '-'
      }}</el-descriptions-item>
      <el-descriptions-item label="申请金额">{{
        formatAmount(detailData.applyAmount)
      }}</el-descriptions-item>
      <el-descriptions-item label="平台服务费">{{
        formatAmount(detailData.platformFee)
      }}</el-descriptions-item>
      <el-descriptions-item label="实际到账金额">
        <span class="font-bold text-success">{{
          formatAmount(detailData.realWithdrawAmount)
        }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="审核模式">
        <el-tag
          :type="detailData.auditMode === 0 ? 'warning' : 'success'"
          size="small"
        >
          {{ getAuditModeText(detailData.auditMode) }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="提现状态">
        <DictTag :options="withdraw_status" :value="detailData.status" />
      </el-descriptions-item>
      <el-descriptions-item label="审核人">{{
        detailData.auditUserName || '-'
      }}</el-descriptions-item>
      <el-descriptions-item label="审核时间">{{
        detailData.auditTime || '-'
      }}</el-descriptions-item>
      <el-descriptions-item
        v-if="detailData.auditReason"
        label="驳回原因"
        :span="2"
      >
        <span class="text-danger">{{ detailData.auditReason }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="支付请求ID" :span="2">{{
        detailData.payRequestId || '-'
      }}</el-descriptions-item>
      <el-descriptions-item label="支付请求时间">{{
        detailData.payRequestTime || '-'
      }}</el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
