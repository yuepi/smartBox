<script lang="ts" setup>
import type { Device } from '#/api/device/device';
import type { DeviceHatch } from '#/api/device/deviceHatch';
import type { CleanTask } from '#/api/operation/cleanTask';
import type { Dept } from '#/api/system/dept';

import { getDeviceListApi } from '#/api/device/device';
import { getDeviceHatchListApi } from '#/api/device/deviceHatch';
import { addCleanTaskApi, editCleanTaskApi } from '#/api/operation/cleanTask';
import { getMerchantDeptListApi } from '#/api/system/dept';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const title = ref('');
const loading = ref(false);
const formData = ref<Partial<CleanTask>>({ taskStatus: 0 });

const deviceOptions = ref<Device[]>([]);
const hatchOptions = ref<DeviceHatch[]>([]);
const deptOptions = ref<Dept[]>([]);

async function loadOptions() {
  try {
    const [deviceRes, deptRes] = await Promise.all([
      getDeviceListApi({ status: 0 }),
      getMerchantDeptListApi({ status: 0 }),
    ]);
    deviceOptions.value = deviceRes || [];
    deptOptions.value = deptRes || [];
  } catch (error) {
    console.error(error);
  }
}

async function loadHatchOptions(deviceId: number) {
  if (!deviceId) {
    hatchOptions.value = [];
    return;
  }
  try {
    const res = await getDeviceHatchListApi({ deviceId, status: 0 });
    hatchOptions.value = res || [];
  } catch (error) {
    console.error(error);
  }
}

async function onDeviceChange(deviceId: number) {
  formData.value.hatchId = undefined;
  await loadHatchOptions(deviceId);
}

function open(row?: CleanTask) {
  if (row?.cleanTaskId) {
    title.value = '编辑清运任务';
    formData.value = { ...row };
    if (formData.value.deviceId) {
      loadHatchOptions(formData.value.deviceId);
    }
  } else {
    title.value = '新增清运任务';
    formData.value = { taskStatus: 0 };
  }
  visible.value = true;
  loadOptions();
}

async function handleSubmit() {
  if (!formData.value.deviceId) {
    ElMessage.warning('请选择设备');
    return;
  }
  loading.value = true;
  try {
    const api = formData.value.cleanTaskId ? editCleanTaskApi : addCleanTaskApi;
    await api(formData.value);
    ElMessage.success(formData.value.cleanTaskId ? '修改成功' : '新增成功');
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
  <el-dialog v-model="visible" :title="title" width="550px" append-to-body>
    <el-form :model="formData" label-width="100px">
      <el-form-item label="所属小区">
        <el-tree-select
          v-model="formData.deptId"
          :data="deptOptions"
          :props="{
            value: 'deptId',
            label: (data) => {
              if (data.children && data.children.length > 0) {
                return `${data.deptName} (不可选)`;
              }
              return data.deptName;
            },
            children: 'children',
            disabled: (data) => {
              return data.children && data.children.length > 0;
            },
          }"
          default-expand-all
          placeholder="请选择"
          clearable
          check-strictly
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="选择设备" required>
        <el-select
          v-model="formData.deviceId"
          placeholder="请选择设备"
          clearable
          filterable
          style="width: 100%"
          @change="onDeviceChange"
        >
          <el-option
            v-for="item in deviceOptions"
            :key="item.deviceId"
            :label="item.deviceName"
            :value="item.deviceId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="选择仓口">
        <el-select
          v-model="formData.hatchId"
          placeholder="请先选择设备"
          clearable
          style="width: 100%"
          :disabled="!formData.deviceId"
        >
          <el-option
            v-for="item in hatchOptions"
            :key="item.deviceHatchId"
            :label="`${item.hatchNo}号仓 - ${item.hatchName}`"
            :value="item.deviceHatchId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="清运人员">
        <el-input
          v-model="formData.cleanUserName"
          placeholder="请输入清运人员姓名"
        />
      </el-form-item>
      <el-form-item label="计划时间">
        <el-date-picker
          v-model="formData.planTime"
          type="datetime"
          placeholder="选择计划清运时间"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="备注">
        <el-input
          v-model="formData.remark"
          type="textarea"
          :rows="2"
          placeholder="请输入备注"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>
