<script lang="ts" setup>
import type { Device } from '#/api/device/device';
import type { DeviceHatch } from '#/api/device/deviceHatch';

import { operateDeviceApi } from '#/api/device/device';
import { getDeviceHatchListApi } from '#/api/device/deviceHatch';

import DeviceImagePreview from './deviceImagePreview.vue';

const emit = defineEmits<{
  (e: 'success', deviceId: number, opType: number): void;
}>();
const visible = ref(false);
const loading = ref(false);
const imagePreviewRef = ref();

// 操作数据
const deviceId = ref<number>(0);
const operationType = ref<number>(0);
const volumeValue = ref<number>(50);
const deviceHatchId = ref<null | number>(null);
const hatchOptions = ref<{ id: number; name: string }[]>([]);

// 操作类型选项
const operationTypeOptions = [
  { label: '开仓口', value: 0, needHatch: true },
  { label: '关仓口', value: 1, needHatch: true },
  { label: '开清运门', value: 2, needHatch: true },
  { label: '重启设备', value: 3, needHatch: false },
  { label: '重启大屏', value: 4, needHatch: false },
  { label: '调节音量', value: 5, needHatch: false, needVolume: true },
  { label: '关清运门', value: 6, needHatch: true },
  { label: '屏幕截图', value: 7, needHatch: false },
  { label: '开仓门灯', value: 8, needHatch: false },
  { label: '关仓门灯', value: 9, needHatch: false },
  { label: '满溢上报', value: 10, needHatch: true },
  { label: '满溢解除', value: 11, needHatch: true },
  { label: '开门行程', value: 12, needHatch: false },
  { label: '桶内抓拍', value: 13, needHatch: false },
];

// --- 获取仓口列表 ---
async function getHatchOptions(deviceId: number) {
  if (!deviceId) {
    hatchOptions.value = [];
    return;
  }
  try {
    const res = await getDeviceHatchListApi({ deviceId, status: 0 });
    hatchOptions.value = (res || []).map((item: DeviceHatch) => ({
      id: item.deviceHatchId,
      name: item.hatchName,
    }));
  } catch (error) {
    console.error('获取仓口列表失败:', error);
    hatchOptions.value = [];
  }
}

// --- 打开弹窗 ---
async function open(row: Device) {
  deviceId.value = row.deviceId;
  operationType.value = 0;
  volumeValue.value = 50;
  await getHatchOptions(row.deviceId);
  visible.value = true;
}

// --- 提交 ---
async function handleSubmit() {
  const opType = operationType.value;
  const isImageOp = opType === 7 || opType === 13;
  if (isImageOp) {
    visible.value = false;
    imagePreviewRef.value?.open(
      deviceId.value,
      opType,
    );
    return;
  }
  const params: any = {
    operateType: opType,
    deviceId: deviceId.value,
  };

  const needHatch = operationTypeOptions.find((o) => o.value === opType)?.needHatch;
  if (needHatch && !deviceHatchId.value) {
    ElMessage.warning('请选择仓口');
    return;
  }

  const needVolume = operationTypeOptions.find((o) => o.value === opType)?.needVolume;
  if (needVolume) {
    params.volume = volumeValue.value;
  }
  if (needHatch) {
    params.deviceHatchId = deviceHatchId.value;
  }

  loading.value = true;
  try {
    await operateDeviceApi(params);
    ElMessage.success('操作指令已发送');
    visible.value = false;
    emit('success', deviceId.value, opType);
  } catch {
    ElMessage.error('操作失败');
  } finally {
    loading.value = false;
  }
}

// --- 关闭 ---
function handleClose() {
  visible.value = false;
  deviceHatchId.value = null;
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="设备操作" width="500px" append-to-body @close="handleClose">
    <el-form label-width="100px">
      <el-form-item label="操作类型">
        <el-select v-model="operationType" placeholder="请选择" style="width: 100%">
          <el-option v-for="item in operationTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="operationTypeOptions.find((o) => o.value === operationType)?.needHatch" label="仓口">
        <el-select v-model="deviceHatchId" placeholder="请选择" style="width: 100%">
          <el-option v-for="item in hatchOptions" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="operationTypeOptions.find((o) => o.value === operationType)?.needVolume" label="音量">
        <el-slider v-model="volumeValue" :min="0" :max="100" show-stops />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>

  <!-- 图片预览弹窗 -->
  <DeviceImagePreview ref="imagePreviewRef" @success="() => { /* 刷新列表等 */ }" />
</template>
