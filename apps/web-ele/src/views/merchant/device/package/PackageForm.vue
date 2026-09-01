<script lang="ts" setup>
import type { DevicePackage } from '#/api/device/devicePackage';

import {
  addDevicePackageApi,
  editDevicePackageApi,
} from '#/api/device/devicePackage';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const { package_type } = useDicts(['package_type']);

const visible = ref(false);
const title = ref('');
const loading = ref(false);
const formData = ref<Partial<DevicePackage>>({
  status: 0,
  packageType: 0,
  unitPrice: 0,
});

function open(row?: DevicePackage) {
  if (row?.devicePackageId) {
    title.value = '编辑计费套餐';
    formData.value = { ...row };
  } else {
    title.value = '新增计费套餐';
    formData.value = { status: 0, packageType: 0, unitPrice: 0 };
  }
  visible.value = true;
}

async function handleSubmit() {
  if (!formData.value.packageName?.trim()) {
    ElMessage.warning('请输入套餐名称');
    return;
  }
  if (formData.value.unitPrice === undefined || formData.value.unitPrice < 0) {
    ElMessage.warning('请输入有效的回收单价');
    return;
  }
  loading.value = true;
  try {
    const api = formData.value.devicePackageId
      ? editDevicePackageApi
      : addDevicePackageApi;
    await api(formData.value);
    ElMessage.success(formData.value.devicePackageId ? '修改成功' : '新增成功');
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
      <el-form-item label="套餐名称" required>
        <el-input
          v-model="formData.packageName"
          placeholder="请输入套餐名称，如：混合回收套餐"
        />
      </el-form-item>
      <el-form-item label="计费类型">
        <el-radio-group v-model="formData.packageType">
          <el-radio
            v-for="item in package_type"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="回收单价" required>
        <el-input-number
          v-model="formData.unitPrice"
          :min="0"
          :precision="2"
          :step="0.1"
          style="width: 100%"
        />
        <span class="ml-1 text-gray-400">元/千克</span>
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
      <el-button type="primary" :loading="loading" @click="handleSubmit"
        >确定</el-button
      >
    </template>
  </el-dialog>
</template>
