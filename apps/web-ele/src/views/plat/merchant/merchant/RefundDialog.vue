<script lang="ts" setup>
import type { MerchantRecharge } from '#/api/system/merchant';

import { refundByMerchantApi } from '#/api/common/pay';

const visible = ref(false);
const loading = ref(false);
const order = ref<MerchantRecharge | null>(null);
const refundAmount = ref(0);

function formatAmount(amount: number): string {
  return `¥ ${(amount || 0).toFixed(2)}`;
}

function open(row: MerchantRecharge) {
  if (row.status !== 2) {
    ElMessage.warning('只有已支付的订单才能退款');
    return;
  }
  if (row.refundStatus === 2) {
    ElMessage.warning('该订单已完成退款');
    return;
  }
  order.value = row;
  refundAmount.value = 0;
  visible.value = true;
}

async function handleSubmit() {
  if (refundAmount.value <= 0) {
    ElMessage.warning('请输入退款金额');
    return;
  }
  if (!order.value) return;
  if (refundAmount.value > order.value.amount) {
    ElMessage.warning(
      `退款金额不能超过订单金额 ${formatAmount(order.value.amount)}`,
    );
    return;
  }

  loading.value = true;
  try {
    await refundByMerchantApi({
      outTradeNo: order.value.rechargeNo,
      refundAmount: refundAmount.value,
      totalAmount: order.value.amount,
    });
    ElMessage.success('退款申请已提交');
    visible.value = false;
  } catch {
    ElMessage.error('退款失败');
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="订单退款" width="450px" append-to-body>
    <el-form label-width="100px">
      <el-form-item label="订单金额">
        <span class="font-bold text-primary">{{
          formatAmount(order?.amount || 0)
        }}</span>
      </el-form-item>
      <el-form-item label="退款金额" required>
        <el-input-number
          v-model="refundAmount"
          :min="0.01"
          :precision="2"
          :step="10"
          :max="order?.amount"
          placeholder="请输入退款金额"
          style="width: 100%"
        />
        <div class="text-gray-400 text-xs mt-1">
          最高可退 {{ formatAmount(order?.amount || 0) }}
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">
        确认退款
      </el-button>
    </template>
  </el-dialog>
</template>
