<script lang="ts" setup>
import { getMerchantAccountApi } from '#/api/system/merchant';

import RechargeDialog from './RechargeDialog.vue';

const props = defineProps<{ merchantId: number }>();

const emit = defineEmits<{
  (e: 'refresh-balance'): void;
}>();

const loading = ref(false);
const accountInfo = ref<any>(null);
const rechargeDialogRef = ref();

function formatAmount(amount: number): string {
  return `¥ ${(amount || 0).toFixed(2)}`;
}

async function loadData() {
  if (!props.merchantId) {
    console.warn('merchantId 为空，无法加载商户账户信息');
    return;
  }
  
  loading.value = true;
  try {
    const res = await getMerchantAccountApi(props.merchantId);
    accountInfo.value = res;
  } catch {
    ElMessage.error('获取账户信息失败');
  } finally {
    loading.value = false;
  }
}

function openRecharge() {
  rechargeDialogRef.value?.open(props.merchantId);
}

function handleRechargeSuccess() {
  loadData();
  emit('refresh-balance');
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div v-loading="loading" class="account-info">
    <el-descriptions :column="2" border v-if="accountInfo">
      <el-descriptions-item label="账户ID">{{ accountInfo.merchantAccountId }}</el-descriptions-item>
      <el-descriptions-item label="商户ID">{{ accountInfo.merchantId }}</el-descriptions-item>
      <el-descriptions-item label="可用余额" label-class-name="font-medium">
        <span class="text-lg font-bold text-primary">{{ formatAmount(accountInfo.balance) }}</span>
      </el-descriptions-item>
      <el-descriptions-item label="账户状态">
        <el-tag :type="accountInfo.status === 0 ? 'success' : 'danger'" size="small">
          {{ accountInfo.status === 0 ? '正常' : '冻结' }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="操作" :span="2">
        <el-button type="primary" size="small" @click="openRecharge">充值</el-button>
        <el-button size="small" @click="loadData">刷新</el-button>
      </el-descriptions-item>
    </el-descriptions>

    <RechargeDialog ref="rechargeDialogRef" @success="handleRechargeSuccess" />
  </div>
</template>
