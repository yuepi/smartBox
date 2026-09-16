<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { getDeviceStatusApi } from '#/api/common/workspace';

const router = useRouter();

const deviceData = ref({ deviceTotal: 0, onlineCount: 0, offlineCount: 0 });

async function fetchDeviceStatus() {
  const res = await getDeviceStatusApi();
  deviceData.value = res;
}

function handleNavigate(status?: number) {
  router.push({
    name: 'Device',
    query: status === undefined ? {} : { onlineStatus: status },
  });
}

onMounted(() => {
  fetchDeviceStatus();
});
</script>

<template>
  <div
    class="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700/80 shrink-0"
  >
    <div class="grid grid-cols-3 gap-3">
      <!-- 设备总数 -->
      <div
        class="flex flex-col justify-center items-center bg-gray-50 dark:bg-zinc-700/40 py-3 px-2 rounded-xl cursor-pointer transition-all hover:shadow-sm"
        @click="handleNavigate()"
      >
        <div class="text-sm font-medium text-gray-500 dark:text-gray-400">设备总数</div>
        <div class="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
          {{ deviceData.deviceTotal }}
        </div>
      </div>

      <!-- 在线设备 -->
      <div
        class="flex flex-col justify-center items-center bg-blue-50/60 dark:bg-blue-950/30 py-3 px-2 rounded-xl cursor-pointer transition-all hover:shadow-sm"
        @click="handleNavigate(1)"
      >
        <div class="text-sm font-medium text-blue-500">在线设备</div>
        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
          {{ deviceData.onlineCount }}
        </div>
      </div>

      <!-- 离线设备 -->
      <div
        class="flex flex-col justify-center items-center bg-rose-50/60 dark:bg-rose-950/30 py-3 px-2 rounded-xl cursor-pointer transition-all hover:shadow-sm"
        @click="handleNavigate(0)"
      >
        <div class="text-sm font-medium text-rose-500">离线设备</div>
        <div class="text-2xl font-bold text-rose-500 mt-1">
          {{ deviceData.offlineCount }}
        </div>
      </div>
    </div>
  </div>
</template>
