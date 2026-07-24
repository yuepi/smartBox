<script lang="ts" setup>
import type { DeviceFault } from '#/api/device/deviceFault';

const visible = ref(false);
const detailData = ref<DeviceFault | null>(null);

function getFaultStatusText(status: number): string {
  const map: Record<number, string> = { 0: '故障中', 1: '已恢复', 2: '已处理' };
  return map[status] || '未知';
}

function getFaultStatusType(status: number): string {
  const map: Record<number, string> = { 0: 'danger', 1: 'warning', 2: 'success' };
  return map[status] || 'info';
}

function formatDuration(seconds: number): string {
  if (!seconds && seconds !== 0) return '-';
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟${seconds % 60}秒`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}小时${minutes}分钟`;
}

function open(data: DeviceFault) {
  detailData.value = data;
  visible.value = true;
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="故障详情" width="600px" append-to-body>
    <el-descriptions :column="2" border v-if="detailData">
      <el-descriptions-item label="故障ID">{{ detailData.deviceFaultId }}</el-descriptions-item>
      <el-descriptions-item label="设备编号">{{ detailData.deviceNo }}</el-descriptions-item>
      <el-descriptions-item label="仓口编号">{{ detailData.hatchNo || '-' }}号仓</el-descriptions-item>
      <el-descriptions-item label="故障编码">{{ detailData.faultCode }}</el-descriptions-item>
      <el-descriptions-item label="故障名称">{{ detailData.faultName }}</el-descriptions-item>
      <el-descriptions-item label="故障状态">
        <el-tag :type="getFaultStatusType(detailData.faultStatus)" size="small">
          {{ getFaultStatusText(detailData.faultStatus) }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="发生时间">{{ detailData.startTime }}</el-descriptions-item>
      <el-descriptions-item label="处理时间">{{ detailData.endTime || '-' }}</el-descriptions-item>
      <el-descriptions-item label="持续时长">{{ formatDuration(detailData.duration) }}</el-descriptions-item>
      <el-descriptions-item label="处理人">{{ detailData.dealUserName || '-' }}</el-descriptions-item>
      <el-descriptions-item label="故障描述" :span="2">{{ detailData.faultRemark || '-' }}</el-descriptions-item>
      <el-descriptions-item label="处理备注" :span="2">{{ detailData.dealRemark || '-' }}</el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
