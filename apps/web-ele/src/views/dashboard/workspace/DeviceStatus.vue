<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { getDeviceStatusApi } from '#/api/common/workspace';

const deviceData = ref({ deviceTotal: 0, onlineCount: 0, offlineCount: 0 });

async function fetchDeviceStatus() {
  const res = await getDeviceStatusApi();
  deviceData.value = res;
}

onMounted(() => {
  fetchDeviceStatus();
});
</script>

<template>
  <div class="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700/80 shrink-0">
    <div class="grid grid-cols-3 gap-2 text-center">
      <div class="bg-gray-50 dark:bg-zinc-700/40 p-2 rounded-lg">
        <div class="text-xs text-gray-400">设备总数</div>
        <div class="text-lg font-bold text-gray-800 dark:text-gray-100 mt-0.5">{{ deviceData.deviceTotal }}</div>
      </div>
      <div class="bg-blue-50/60 dark:bg-blue-950/30 p-2 rounded-lg">
        <div class="text-xs text-blue-500">在线设备</div>
        <div class="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">{{ deviceData.onlineCount }}</div>
      </div>
      <div class="bg-rose-50/60 dark:bg-rose-950/30 p-2 rounded-lg">
        <div class="text-xs text-rose-500">离线设备</div>
        <div class="text-lg font-bold text-rose-500 mt-0.5">{{ deviceData.offlineCount }}</div>
      </div>
    </div>
  </div>
</template>
