<script lang="ts" setup>
import type { MemberWithdraw } from '#/api/member/memberWithdraw';

import { auditMemberWithdrawPassApi, auditMemberWithdrawRefuseApi } from '#/api/member/memberWithdraw';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const loading = ref(false);
const auditData = ref<MemberWithdraw | null>(null);
const form = reactive({
  status: 1,
  auditReason: '',
});

function formatAmount(amount: number): string {
  return `¥ ${(amount || 0).toFixed(2)}`;
}

function open(row: MemberWithdraw) {
  if (row.status !== 0) {
    ElMessage.warning('只有待审核状态的提现才能审核');
    return;
  }
  auditData.value = row;
  form.status = 1;
  form.auditReason = '';
  visible.value = true;
}

async function handleSubmit() {
  if (!auditData.value) return;
  if (form.status === 4 && !form.auditReason.trim()) {
    ElMessage.warning('请填写驳回原因');
    return;
  }

  loading.value = true;
  try {
    if (form.status === 1) {
      await auditMemberWithdrawPassApi({ memberWithdrawId: auditData.value.memberWithdrawId });
      ElMessage.success('审核通过');
    } else {
      await auditMemberWithdrawRefuseApi({
        memberWithdrawId: auditData.value.memberWithdrawId,
        auditReason: form.auditReason,
      });
      ElMessage.success('已拒绝');
    }
    visible.value = false;
    emit('success');
  } catch {
    ElMessage.error('操作失败');
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="提现审核" width="450px" append-to-body>
    <el-form :model="form" label-width="80px">
      <el-form-item label="提现单号">
        <span>{{ auditData?.withdrawNo }}</span>
      </el-form-item>
      <el-form-item label="申请金额">
        <span class="font-bold text-primary">{{ formatAmount(auditData?.applyAmount || 0) }}</span>
      </el-form-item>
      <el-form-item label="审核结果" required>
        <el-radio-group v-model="form.status">
          <el-radio :value="1">审核通过</el-radio>
          <el-radio :value="4">审核拒绝</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="form.status === 4" label="驳回原因" required>
        <el-input v-model="form.auditReason" type="textarea" :rows="3" placeholder="请输入驳回原因" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
