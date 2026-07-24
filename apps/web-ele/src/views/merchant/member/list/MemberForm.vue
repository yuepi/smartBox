<script lang="ts" setup>
import type { Member } from '#/api/member/member';

import { addMemberApi, editMemberApi } from '#/api/member/member';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const { member_status, member_sex } = useDicts(['member_status', 'member_sex']);

const visible = ref(false);
const title = ref('');
const loading = ref(false);
const formData = ref<Partial<Member>>({
  sex: 0,
  status: 0,
});

function open(row?: Member) {
  if (row?.memberId) {
    title.value = '编辑会员';
    formData.value = { ...row };
  } else {
    title.value = '新增会员';
    formData.value = { sex: 0, status: 0 };
  }
  visible.value = true;
}

async function handleSubmit() {
  if (!formData.value.mobile?.trim()) {
    ElMessage.warning('请输入手机号');
    return;
  }
  loading.value = true;
  try {
    const api = formData.value.memberId ? editMemberApi : addMemberApi;
    await api(formData.value);
    ElMessage.success(formData.value.memberId ? '修改成功' : '新增成功');
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
  <el-dialog v-model="visible" :title="title" width="500px" append-to-body>
    <el-form :model="formData" label-width="80px">
      <el-form-item label="手机号" required>
        <el-input v-model="formData.mobile" placeholder="请输入手机号" />
      </el-form-item>
      <el-form-item label="昵称">
        <el-input v-model="formData.nickname" placeholder="请输入昵称" />
      </el-form-item>
      <el-form-item label="头像">
        <el-input v-model="formData.avatar" placeholder="请输入头像URL" />
      </el-form-item>
      <el-form-item label="性别">
        <el-radio-group v-model="formData.sex">
          <el-radio :value="0">未知</el-radio>
          <el-radio :value="1">男</el-radio>
          <el-radio :value="2">女</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="状态">
        <el-radio-group v-model="formData.status">
          <el-radio :value="0">启用</el-radio>
          <el-radio :value="1">禁用</el-radio>
          <el-radio :value="2">黑名单</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
