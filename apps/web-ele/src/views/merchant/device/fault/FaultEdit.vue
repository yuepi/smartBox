<script lang="ts" setup>
import { editDeviceFaultApi } from '#/api/device/deviceFault';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const loading = ref(false);
const form = reactive({
  deviceFaultId: 0,
  faultStatus: 1,
  dealRemark: '',
});

function open(row: { deviceFaultId: number }) {
  form.deviceFaultId = row.deviceFaultId;
  form.faultStatus = 1;
  form.dealRemark = '';
  visible.value = true;
}

async function handleSubmit() {
  loading.value = true;
  try {
    await editDeviceFaultApi({
      deviceFaultId: form.deviceFaultId,
      faultStatus: form.faultStatus,
      dealRemark: form.dealRemark,
    });
    ElMessage.success('处理成功');
    visible.value = false;
    emit('success');
  } catch {
    ElMessage.error('处理失败');
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="处理故障" width="500px" append-to-body>
    <el-form :model="form" label-width="100px">
      <el-form-item label="故障状态" required>
        <el-radio-group v-model="form.faultStatus">
          <el-radio :value="1">已恢复</el-radio>
          <el-radio :value="2">已处理</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="处理备注">
        <el-input v-model="form.dealRemark" type="textarea" :rows="4" placeholder="请输入处理备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
