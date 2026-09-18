<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { generateMockDevicePoints } from '#/utils/mockDevicePoints';

// 定义点位类型
interface DevicePoint {
  lng: number;
  lat: number;
  name: string;
  value: number;
  status: 'full' | 'offline' | 'online';
  
}

const pointsList = ref<DevicePoint[]>([]);

// 页面挂载时初始化数据
onMounted(() => {
  pointsList.value = generateMockDevicePoints(524);
});

// 计算统计数据
const stats = computed(() => {
  const total = pointsList.value.length;
  let onlineCount = 0;
  let offlineCount = 0;
  let fullCount = 0;

  pointsList.value.forEach((item) => {
    switch (item.status) {
    case 'online': {
    onlineCount++;
    break;
    }
    case 'offline': {
    offlineCount++;
    break;
    }
    case 'full': {
    fullCount++;
    // No default
    }
    break;
    }
  });

  return [
    { label: '总设备数(台)', value: total, color: '#00d8ff' },
    { label: '在线设备数(台)', value: onlineCount, color: '#22c55e' },
    { label: '离线设备数(台)', value: offlineCount, color: '#f59e0b' },
    { label: '满溢设备数(台)', value: fullCount, color: '#ef4444' },
  ];
});
</script>

<template>
  <div class="stats-wrapper">
    <div class="top-stats">
      <div v-for="item in stats" :key="item.label" class="stat-item">
        <div class="stat-value" :style="{ color: item.color }">
          {{ item.value }}
        </div>
        <div class="stat-label">{{ item.label }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 容器全居中配置 */
.stats-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.top-stats {
  display: flex;
  gap: 48px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 40px;
  background: rgb(10 30 60 / 65%);
  border: 1px solid rgb(0 216 255 / 30%);
  border-radius: 50px;
  box-shadow: 0 0 30px rgb(0 216 255 / 15%);
  backdrop-filter: blur(10px);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 100px;
  text-align: center;
}

.stat-value {
  font-family: DIN, monospace, sans-serif;
  font-size: 32px;
  font-weight: bold;
  line-height: 1.2;
  text-shadow: 0 0 16px currentcolor;
}

.stat-label {
  margin-top: 4px;
  font-size: 13px;
  color: #8fa3c0;
  letter-spacing: 0.5px;
  white-space: nowrap;
}
</style>
