<script lang="ts" setup>
import { remarkOperateApi } from '#/api/operation/recycleOrder';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const loading = ref(false);
const form = reactive({
  recycleOrderId: 0,
  remark: '',
});

function open(row: { recycleOrderId: number }) {
  form.recycleOrderId = row.recycleOrderId;
  form.remark = '';
  visible.value = true;
}

async function handleSubmit() {
  if (!form.remark.trim()) {
    ElMessage.warning('请输入备注内容');
    return;
  }
  loading.value = true;
  try {
    await remarkOperateApi(form);
    ElMessage.success('添加备注成功');
    visible.value = false;
    emit('success');
  } catch {
    ElMessage.error('添加备注失败');
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="添加备注" width="500px" append-to-body>
    <el-form :model="form" label-width="80px">
      <el-form-item label="备注" required>
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="4"
          placeholder="请输入备注内容"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit"
        >确定</el-button
      >
    </template>
  </el-dialog>
</template>
