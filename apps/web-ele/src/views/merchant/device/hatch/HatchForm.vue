<script lang="ts" setup>
import type { DeviceHatch } from '#/api/device/deviceHatch';
import type { Device } from '#/api/device/device';
import type { DevicePackage } from '#/api/device/devicePackage';

import { addDeviceHatchApi, editDeviceHatchApi } from '#/api/device/deviceHatch';
import { getDeviceListApi } from '#/api/device/device';
import { getDevicePackageListApi } from '#/api/device/devicePackage';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const title = ref('');
const loading = ref(false);
const formData = ref<Partial<DeviceHatch>>({
  status: 0,
  hatchStatus: 0,
  currentWeight: 0,
  weightThreshold: 100,
});

const deviceOptions = ref<Device[]>([]);
const packageOptions = ref<DevicePackage[]>([]);

async function loadOptions() {
  try {
    const [deviceRes, packageRes] = await Promise.all([
      getDeviceListApi({ status: 0 }),
      getDevicePackageListApi({ status: 0 }),
    ]);
    deviceOptions.value = deviceRes || [];
    packageOptions.value = packageRes || [];
  } catch (error) {
    console.error(error);
  }
}

function open(row?: DeviceHatch) {
  if (row?.deviceHatchId) {
    title.value = '编辑仓口';
    formData.value = { ...row };
  } else {
    title.value = '新增仓口';
    formData.value = {
      status: 0,
      hatchStatus: 0,
      currentWeight: 0,
      weightThreshold: 100,
    };
  }
  visible.value = true;
  loadOptions();
}

async function handleSubmit() {
  if (!formData.value.hatchName?.trim()) {
    ElMessage.warning('请输入仓口名称');
    return;
  }
  if (!formData.value.deviceId) {
    ElMessage.warning('请选择所属设备');
    return;
  }

  loading.value = true;
  try {
    const api = formData.value.deviceHatchId ? editDeviceHatchApi : addDeviceHatchApi;
    await api(formData.value);
    ElMessage.success(formData.value.deviceHatchId ? '修改成功' : '新增成功');
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
  <el-dialog v-model="visible" :title="title" width="800px" append-to-body>
    <el-form :model="formData" label-width="110px">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="仓口名称" required>
            <el-input v-model="formData.hatchName" placeholder="请输入仓口名称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="仓口编号">
            <el-input v-model="formData.hatchNo" placeholder="请输入仓口编号" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="所属设备" required>
        <el-select v-model="formData.deviceId" placeholder="请选择设备" clearable filterable style="width: 100%">
          <el-option v-for="item in deviceOptions" :key="item.deviceId" :label="item.deviceName" :value="item.deviceId" />
        </el-select>
      </el-form-item>
      <el-form-item label="绑定套餐">
        <el-select v-model="formData.devicePackageId" placeholder="请选择计费套餐" clearable style="width: 100%">
          <el-option v-for="item in packageOptions" :key="item.devicePackageId" :label="item.packageName" :value="item.devicePackageId" />
        </el-select>
      </el-form-item>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="当前重量(kg)">
            <el-input-number v-model="formData.currentWeight" :min="0" :max="500" :precision="2" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="满仓阈值(kg)">
            <el-input-number v-model="formData.weightThreshold" :min="0" :max="500" :precision="2" style="width: 100%" />
          </el-form-item>
        </el-col>
      </el-row>
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
