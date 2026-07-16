<script lang="ts" setup>
import type { Device } from '#/api/device/device';

import { getDeviceDetailApi } from '#/api/device/device';

// 引入字典
const { device_brand, device_hatch_type, device_online_status, device_status } = useDicts([
  'device_brand',
  'device_hatch_type',
  'device_online_status',
  'device_status',
]);

// 控制弹窗显示隐藏
const visible = ref(false);
// 存储详情数据
const detailData = ref<any>({});

// 暴露给父组件调用的方法
async function open(row: Device) {
  visible.value = true;
  detailData.value = {}; // 打开时先清空，防止残余旧数据
  try {
    const res = await getDeviceDetailApi(row.deviceId);
    detailData.value = res || row;
  } catch {
    ElMessage.error('获取设备详情失败');
    // 如果详情接口报错，退而求其次展示列表传进来的基础数据
    detailData.value = row;
  }
}

// 必须显式暴露 open 方法
defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="设备详情" width="800px" append-to-body>
    <el-descriptions :column="2" border v-if="detailData">
      <el-descriptions-item label="设备ID">
        {{ detailData.deviceId }}
      </el-descriptions-item>
      <el-descriptions-item label="设备名称">
        {{ detailData.deviceName }}
      </el-descriptions-item>
      <el-descriptions-item label="设备编号">
        {{ detailData.deviceNo }}
      </el-descriptions-item>
      <el-descriptions-item label="设备品牌">
        <DictTag :options="device_brand" :value="detailData.deviceBrand" />
      </el-descriptions-item>
      <el-descriptions-item label="设备类型">
        <DictTag :options="device_hatch_type" :value="detailData.deviceHatchType" />
      </el-descriptions-item>
      <el-descriptions-item label="设备套餐">
        {{ detailData.devicePackageId || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="在线状态">
        <DictTag :options="device_online_status" :value="detailData.onlineStatus" />
      </el-descriptions-item>
      <el-descriptions-item label="最后心跳">
        {{ detailData.lastHeartTime || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="过期时间">
        {{ detailData.expireTime || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="设备地址">
        {{ detailData.deviceAddress || "" }}
        {{ detailData.detailAddress || "" }}
      </el-descriptions-item>
      <el-descriptions-item label="经度">
        {{ detailData.longitude || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="纬度">
        {{ detailData.latitude || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="硬件版本">
        {{ detailData.hardwareVersion || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="软件版本">
        {{ detailData.softwareVersion || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="信号强度">
        {{ detailData.signal || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="设备音量">
        {{ detailData.volume || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="客服电话">
        {{ detailData.customerPhone || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="状态">
        <DictTag :options="device_status" :value="detailData.status" />
      </el-descriptions-item>
    </el-descriptions>
  </el-dialog>
</template>
