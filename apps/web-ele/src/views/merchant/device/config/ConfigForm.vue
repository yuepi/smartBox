<script lang="ts" setup>
import type { DeviceConfig } from '#/api/device/deviceConfig';

import { addDeviceConfigApi, editDeviceConfigApi } from '#/api/device/deviceConfig';
import UploadImage from '#/components/UploadImage/index.vue';

// --- Emits ---
const emit = defineEmits<{
  (e: 'success'): void;
}>();

const { device_brand } = useDicts(['device_brand']);

// --- 状态 ---
const visible = ref(false);
const title = ref('');
const loading = ref(false);
const formRef = ref();
const formData = ref<Partial<DeviceConfig>>({
  status: 0,
  deviceBrand: 0,
  outLightBrightness: 100,
  deliverEndTimeout: 300,
  recycleEndTimeout: 1800,
  deliverDoorMotorTimeout: 10,
  deliverDoorHandStopCount: 3,
  deliverDoorHandOpenCount: 2,
  fanTempMax: 50,
  fanTempMin: 30,
  topLightType: 0,
  topLightBrightness: 100,
  outLightType: 0,
  businessOpenTime: '08:00',
  businessCloseTime: '20:00',
});

// 顶部灯光类型选项
const topLightTypeOptions = [
  { label: '定时', value: 0 },
  { label: '感应', value: 1 },
  { label: '常亮', value: 2 },
];

const outLightTypeOptions = [
  { label: '定时', value: 0 },
  { label: '感应', value: 1 },
  { label: '常亮', value: 2 },
];

// --- 品牌判断 ---
const isXiangxin = computed(() => {
  const brand = formData.value.deviceBrand;
  return brand === 1 || brand === 2;
});

const isQuanying = computed(() => {
  const brand = formData.value.deviceBrand;
  return brand === 3 || brand === 4;
});

// --- 营业时间范围 ---
const businessTimeRange = computed({
  get: () => {
    if (formData.value.businessOpenTime && formData.value.businessCloseTime) {
      return [formData.value.businessOpenTime, formData.value.businessCloseTime];
    }
    return ['08:00', '20:00'];
  },
  set: (val: null | string[]) => {
    if (val && val.length === 2) {
      formData.value.businessOpenTime = val[0];
      formData.value.businessCloseTime = val[1];
    } else {
      formData.value.businessOpenTime = undefined;
      formData.value.businessCloseTime = undefined;
    }
  },
});

// --- 轮播图列表 ---
const normalBannersList = computed({
  get: () => {
    if (!formData.value.normalBanners) return [];
    try { return JSON.parse(formData.value.normalBanners); } catch { return []; }
  },
  set: (val: string[]) => {
    formData.value.normalBanners = JSON.stringify(val);
  },
});

const fullBannersList = computed({
  get: () => {
    if (!formData.value.fullBanners) return [];
    try { return JSON.parse(formData.value.fullBanners); } catch { return []; }
  },
  set: (val: string[]) => {
    formData.value.fullBanners = JSON.stringify(val);
  },
});

const maintainBannersList = computed({
  get: () => {
    if (!formData.value.maintainBanners) return [];
    try { return JSON.parse(formData.value.maintainBanners); } catch { return []; }
  },
  set: (val: string[]) => {
    formData.value.maintainBanners = JSON.stringify(val);
  },
});

const forbidImagesList = computed({
  get: () => {
    if (!formData.value.forbidImages) return [];
    try { return JSON.parse(formData.value.forbidImages); } catch { return []; }
  },
  set: (val: string[]) => {
    formData.value.forbidImages = JSON.stringify(val);
  },
});

// --- 品牌切换时重置配置 ---
function onBrandChange(brand: number) {
  if (brand === 1 || brand === 2) {
    formData.value.normalBanners = undefined;
    formData.value.fullBanners = undefined;
    formData.value.maintainBanners = undefined;
    formData.value.forbidImages = undefined;
    formData.value.businessOpenTime = undefined;
    formData.value.businessCloseTime = undefined;
  } else if (brand === 3 || brand === 4) {
    formData.value.topLightBrightness = undefined;
    formData.value.deliverEndTimeout = undefined;
    formData.value.recycleEndTimeout = undefined;
    formData.value.deliverDoorMotorTimeout = undefined;
    formData.value.deliverDoorHandStopCount = undefined;
    formData.value.deliverDoorHandOpenCount = undefined;
    formData.value.fanTempMax = undefined;
    formData.value.fanTempMin = undefined;
    formData.value.topLightType = undefined;
    formData.value.topLightOnTime = undefined;
    formData.value.topLightOffTime = undefined;
    formData.value.topLightBrightness = undefined;
    formData.value.outLightType = undefined;
    formData.value.outLightOnTime = undefined;
    formData.value.outLightOffTime = undefined;
  }
}

// --- 打开弹窗 ---
function open(row?: DeviceConfig) {
  if (row?.deviceConfigId) {
    title.value = '编辑设备配置';
    formData.value = { ...row };
  } else {
    title.value = '新增设备配置';
    formData.value = {
      status: 0,
      deviceBrand: 0,
      outLightBrightness: 100,
      deliverEndTimeout: 300,
      recycleEndTimeout: 1800,
      deliverDoorMotorTimeout: 10,
      deliverDoorHandStopCount: 3,
      deliverDoorHandOpenCount: 2,
      fanTempMax: 50,
      fanTempMin: 30,
      topLightType: 0,
      topLightBrightness: 100, 
      outLightType: 0,
      businessOpenTime: '08:00',
      businessCloseTime: '20:00',
    };
  }
  visible.value = true;
}

// --- 提交 ---
async function handleSubmit() {
  if (!formData.value.configName?.trim()) {
    ElMessage.warning('请输入配置名称');
    return;
  }

  loading.value = true;
  try {
    const api = formData.value.deviceConfigId ? editDeviceConfigApi : addDeviceConfigApi;
    await api(formData.value);
    ElMessage.success(formData.value.deviceConfigId ? '修改成功' : '新增成功');
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
  <el-dialog v-model="visible" :title="title" width="1000px" append-to-body>
    <el-form ref="formRef" :model="formData" label-width="140px" label-position="right">
      <!-- 基本信息 -->
      <el-divider content-position="left">基本信息</el-divider>
      <el-form-item label="配置名称" required>
        <el-input v-model="formData.configName" placeholder="请输入配置名称" />
      </el-form-item>
      <el-form-item label="设备品牌">
        <el-select v-model="formData.deviceBrand" placeholder="请选择" style="width: 100%" @change="onBrandChange">
          <el-option v-for="item in device_brand" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="箱外照明亮度">
        <el-input-number v-model="formData.outLightBrightness" :min="0" :max="100" style="width: 80%" />
        <span class="ml-1">%</span>
      </el-form-item>
      <el-form-item label="状态">
        <el-radio-group v-model="formData.status">
          <el-radio :value="0">启用</el-radio>
          <el-radio :value="1">禁用</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 超时配置（向心） -->
      <template v-if="isXiangxin">
        <el-divider content-position="left">超时配置</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="投递流程结束超时">
              <el-input-number v-model="formData.deliverEndTimeout" :min="1" :max="3600" style="width: 80%" />
              <span class="ml-1">秒</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="回收流程结束超时">
              <el-input-number v-model="formData.recycleEndTimeout" :min="1" :max="7200" style="width: 80%" />
              <span class="ml-1">秒</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="投递门电机超时">
              <el-input-number v-model="formData.deliverDoorMotorTimeout" :min="1" :max="60" style="width: 80%" />
              <span class="ml-1">秒</span>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 夹手保护配置 -->
        <el-divider content-position="left">夹手保护配置</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="投递门夹手-停止次数" label-width="160px">
              <el-input-number v-model="formData.deliverDoorHandStopCount" :min="1" :max="10" style="width: 80%" />
              <span class="ml-1">次</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="投递门夹手-开门次数" label-width="160px">
              <el-input-number v-model="formData.deliverDoorHandOpenCount" :min="1" :max="10" style="width: 80%" />
              <span class="ml-1">次</span>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 风扇温度配置 -->
        <el-divider content-position="left">风扇温度配置</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="风扇温度上限">
              <el-input-number v-model="formData.fanTempMax" :min="0" :max="100" style="width: 80%" />
              <span class="ml-1">℃</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="风扇温度下限">
              <el-input-number v-model="formData.fanTempMin" :min="0" :max="100" style="width: 80%" />
              <span class="ml-1">℃</span>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 顶部灯光配置 -->
        <el-divider content-position="left">顶部灯光配置</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="顶部灯光类型">
              <el-select v-model="formData.topLightType" placeholder="请选择" style="width: 80%">
                <el-option v-for="item in topLightTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="顶部照明亮度">
              <el-input-number v-model="formData.topLightBrightness" :min="0" :max="100" style="width: 80%" />
              <span class="ml-1">%</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20" v-if="formData.topLightType === 0">
          <el-col :span="12">
            <el-form-item label="顶部照明开启时间">
              <el-time-select v-model="formData.topLightOnTime" start="00:00" step="00:30" end="23:59" placeholder="选择时间" style="width: 80%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="顶部照明关闭时间">
              <el-time-select v-model="formData.topLightOffTime" start="00:00" step="00:30" end="23:59" placeholder="选择时间" style="width: 80%" />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 箱外灯光配置 -->
        <el-divider content-position="left">箱外灯光配置</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="箱外灯光类型">
              <el-select v-model="formData.outLightType" placeholder="请选择" style="width: 80%">
                <el-option v-for="item in outLightTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20" v-if="formData.outLightType === 0">
          <el-col :span="12">
            <el-form-item label="箱外照明开启时间">
              <el-time-select v-model="formData.outLightOnTime" start="00:00" step="00:30" end="23:59" placeholder="选择时间" style="width: 80%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="箱外照明关闭时间">
              <el-time-select v-model="formData.outLightOffTime" start="00:00" step="00:30" end="23:59" placeholder="选择时间" style="width: 80%" />
            </el-form-item>
          </el-col>
        </el-row>
      </template>

      <!-- 权应品牌特有配置 -->
      <template v-if="isQuanying">
        <el-divider content-position="left">轮播图配置</el-divider>

        <el-form-item label="正常轮播图">
          <UploadImage v-model="normalBannersList" :limit="5" :file-size="5" :file-type="['png', 'jpg', 'jpeg']" />
        </el-form-item>

        <el-form-item label="满溢轮播图">
          <UploadImage v-model="fullBannersList" :limit="5" :file-size="5" :file-type="['png', 'jpg', 'jpeg']" />
        </el-form-item>

        <el-form-item label="维护轮播图">
          <UploadImage v-model="maintainBannersList" :limit="5" :file-size="5" :file-type="['png', 'jpg', 'jpeg']" />
        </el-form-item>

        <el-form-item label="禁止投递图片">
          <UploadImage v-model="forbidImagesList" :limit="5" :file-size="5" :file-type="['png', 'jpg', 'jpeg']" />
        </el-form-item>

        <el-divider content-position="left">营业时间配置</el-divider>
        <el-form-item label="营业时间">
          <el-time-picker
            v-model="businessTimeRange"
            is-range
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="请选择营业时间范围"
            style="width: 300px"
          />
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
:deep(.el-divider__text) {
  font-size: 14px;
  font-weight: 600;
}

.ml-1 {
  margin-left: 4px;
}
</style>
