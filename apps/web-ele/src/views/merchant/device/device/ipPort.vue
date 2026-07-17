<script lang="ts" setup>
import { changeDeviceServerIpPortApi } from '#/api/device/device';

const visible = ref(false);
const loading = ref(false);
const ipPortData = ref({ deviceId: 0, ip: '', port: '' });

function open(deviceId: number) {
  ipPortData.value = { deviceId, ip: '', port: '' };
  visible.value = true;
}

async function handleSubmit() {
  if (!ipPortData.value.ip) {
    ElMessage.warning('请输入IP地址');
    return;
  }
  if (!ipPortData.value.port) {
    ElMessage.warning('请输入端口号');
    return;
  }
  loading.value = true;
  try {
    await changeDeviceServerIpPortApi(ipPortData.value);
    ElMessage.success('切换指令已发送');
    visible.value = false;
  } catch {
    ElMessage.error('切换失败');
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="切换IP端口" width="500px" append-to-body>
    <el-form label-width="100px">
      <el-form-item label="IP地址" required>
        <el-input v-model="ipPortData.ip" placeholder="请输入IP地址" />
      </el-form-item>
      <el-form-item label="端口号" required>
        <el-input v-model="ipPortData.port" placeholder="请输入端口号" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
