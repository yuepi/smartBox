<script lang="ts" setup>
import type { DeviceBag } from '#/api/device/deviceBag';

import { addDeviceBagApi, editDeviceBagApi } from '#/api/device/deviceBag';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const title = ref('');
const loading = ref(false);
const formData = ref<Partial<DeviceBag>>({
  status: 0,
  bagStatus: 0,
});

function open(row?: DeviceBag) {
  if (row?.deviceBagId) {
    title.value = '编辑包袋';
    formData.value = { ...row };
  } else {
    title.value = '新增包袋';
    formData.value = { status: 0, bagStatus: 0 };
  }
  visible.value = true;
}

async function handleSubmit() {
  if (!formData.value.bagNo?.trim()) {
    ElMessage.warning('请输入包袋编号');
    return;
  }
  loading.value = true;
  try {
    const api = formData.value.deviceBagId ? editDeviceBagApi : addDeviceBagApi;
    await api(formData.value);
    ElMessage.success(formData.value.deviceBagId ? '修改成功' : '新增成功');
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
    <el-form :model="formData" label-width="100px">
      <el-form-item label="包袋编号" required>
        <el-input v-model="formData.bagNo" placeholder="请输入包袋编号" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="请输入备注" />
      </el-form-item>
      <el-form-item label="状态">
        <el-radio-group v-model="formData.status">
          <el-radio :value="0">启用</el-radio>
          <el-radio :value="1">禁用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
