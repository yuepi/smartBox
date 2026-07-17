<script lang="ts" setup>
import { deviceUpgradeApi } from '#/api/device/device';

const visible = ref(false);
const loading = ref(false);
const deviceId = ref<number>(0);
const fileUrl = ref('');
const file = ref<File | null>(null);

function open(id: number) {
  deviceId.value = id;
  fileUrl.value = '';
  file.value = null;
  visible.value = true;
}

function handleUploadSuccess(res: any) {
  console.log('文件上传成功:', res);
}

async function handleSubmit() {
  if (!fileUrl.value.trim()) {
    ElMessage.warning('请填写升级文件地址');
    return;
  }
  loading.value = true;
  try {
    await deviceUpgradeApi(deviceId.value, file.value, fileUrl.value);
    ElMessage.success('升级指令已发送');
    visible.value = false;
  } catch {
    ElMessage.error('升级失败');
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="设备升级" width="800px" append-to-body>
    <el-form label-width="100px">
      <el-form-item label="升级文件" required>
        <el-input v-model="fileUrl" placeholder="请输入升级文件下载地址" clearable />
      </el-form-item>
      <UploadFile
        v-model="file"
        :limit="1"
        drag
        webkitdirectory
        :file-size="200"
        :file-type="['bin', 'zip', 'hex']"
        @success="handleUploadSuccess"
      />
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
