<script lang="ts" setup>
import type { Device } from '#/api/device/device';
import type { DeviceHatch } from '#/api/device/deviceHatch';

import { getDeviceListApi } from '#/api/device/device';
import { bagBindDeviceHatchApi } from '#/api/device/deviceBag';
import { getDeviceHatchListApi } from '#/api/device/deviceHatch';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const loading = ref(false);
const bagId = ref(0);
const deviceLoading = ref(false);
const hatchLoading = ref(false);
const deviceOptions = ref<Device[]>([]);
const hatchOptions = ref<DeviceHatch[]>([]);
const form = reactive({
  deviceId: undefined as number | undefined,
  hatchId: undefined as number | undefined,
});

async function loadDeviceOptions() {
  deviceLoading.value = true;
  try {
    const res = await getDeviceListApi({ status: 0 });
    deviceOptions.value = res || [];
  } finally {
    deviceLoading.value = false;
  }
}

async function loadHatchOptions(deviceId: number) {
  hatchLoading.value = true;
  try {
    const res = await getDeviceHatchListApi({ deviceId, status: 0 });
    hatchOptions.value = res || [];
  } finally {
    hatchLoading.value = false;
  }
}

function onDeviceChange(deviceId: number) {
  form.hatchId = undefined;
  if (deviceId) {
    loadHatchOptions(deviceId);
  } else {
    hatchOptions.value = [];
  }
}

function open(deviceBagId: number) {
  bagId.value = deviceBagId;
  form.deviceId = undefined;
  form.hatchId = undefined;
  hatchOptions.value = [];
  loadDeviceOptions();
  visible.value = true;
}

async function handleSubmit() {
  if (!form.deviceId) {
    ElMessage.warning('请选择设备');
    return;
  }
  if (!form.hatchId) {
    ElMessage.warning('请选择仓口');
    return;
  }
  loading.value = true;
  try {
    await bagBindDeviceHatchApi(bagId.value, form.deviceId, form.hatchId);
    ElMessage.success('绑定成功');
    visible.value = false;
    emit('success');
  } catch {
    ElMessage.error('绑定失败');
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="绑定设备仓口" width="450px" append-to-body>
    <el-form :model="form" label-width="80px">
      <el-form-item label="选择设备" required>
        <el-select
          v-model="form.deviceId"
          placeholder="请选择设备"
          style="width: 100%"
          :loading="deviceLoading"
          @change="onDeviceChange"
        >
          <el-option v-for="item in deviceOptions" :key="item.deviceId" :label="item.deviceName" :value="item.deviceId" />
        </el-select>
      </el-form-item>
      <el-form-item label="选择仓口" required>
        <el-select
          v-model="form.hatchId"
          placeholder="请先选择设备"
          style="width: 100%"
          :loading="hatchLoading"
          :disabled="!form.deviceId"
        >
          <el-option
            v-for="item in hatchOptions"
            :key="item.deviceHatchId"
            :label="`${item.hatchNo}号仓 - ${item.hatchName}`"
            :value="item.deviceHatchId"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定绑定</el-button>
    </template>
  </el-dialog>
</template>
