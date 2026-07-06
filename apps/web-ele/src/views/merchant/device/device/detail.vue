<script lang="ts" setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { getDeviceDetailApi } from '#/api/device/device';
import type { Device } from '#/api/device/device';

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
  } catch (error) {
    ElMessage.error('获取设备详情失败');
    // 如果详情接口报错，退而求其次展示列表传进来的基础数据
    detailData.value = row;
  }
}

// --- 辅助函数 ---
function getOnlineStatusText(status: number): string {
  return status === 1 ? "在线" : "离线";
}

function getOnlineStatusType(status: number): string {
  return status === 1 ? "success" : "info";
}

function getStatusText(status: number): string {
  return status === 0 ? "启用" : "禁用";
}

function getHatchTypeText(type: number): string {
  return type === 0 ? "单仓" : "双仓";
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
        {{ detailData.deviceBrand }}
      </el-descriptions-item>
      <el-descriptions-item label="设备类型">
        {{ getHatchTypeText(detailData.deviceHatchType) }}
      </el-descriptions-item>
      <el-descriptions-item label="设备套餐">
        {{ detailData.devicePackageId || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="在线状态">
        <el-tag :type="getOnlineStatusType(detailData.onlineStatus)" size="small">
          {{ getOnlineStatusText(detailData.onlineStatus) }}
        </el-tag>
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
        <el-tag :type="detailData.status === 0 ? 'success' : 'danger'" size="small">
          {{ getStatusText(detailData.status) }}
        </el-tag>
      </el-descriptions-item>
    </el-descriptions>
  </el-dialog>
</template>
