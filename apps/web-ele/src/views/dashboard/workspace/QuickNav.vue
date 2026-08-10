<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';
import { openWindow } from '@vben/utils';

import { Cpu, Document, Tickets, Wallet } from '@element-plus/icons-vue';

const router = useRouter();
const { hasAccessByCodes } = useAccess();

const quickNavItems = [
  { title: '设备管理', url: '/device', icon: Cpu, color: '#10B981', authority: ['merchant:manage:device'] },
  { title: '设备配置', url: '/deviceConfig', icon: Tickets, color: '#EC4899', authority: ['merchant:device:config'] },
  { title: '计费套餐', url: '/devicePackage', icon: Tickets, color: '#EC4899', authority: ['merchant:device:package'] },
  { title: '二维码', url: '/qrcode', icon: Tickets, color: '#EC4899', authority: ['merchant:qrcode'] },
  { title: '回收订单', url: '/recycleOrder', icon: Document, color: '#3B82F6', authority: ['merchant:recycle:order'] },
  { title: '清运任务', url: '/cleanTask', icon: Tickets, color: '#EC4899', authority: ['merchant:recycle:cleanTask'] },
  { title: '分拣任务', url: '/sortTask', icon: Tickets, color: '#EC4899', authority: ['merchant:recycle:sortTask'] },
  { title: '会员列表', url: '/member', icon: Tickets, color: '#EC4899', authority: ['merchant:member:list'] },
  { title: '提现审核', url: '/withdraw', icon: Wallet, color: '#F59E0B', authority: ['merchant:member:withdraw'] },
];

const filteredNavItems = computed(() => {
  return quickNavItems.filter((item) => {
    if (!item.authority?.length) return true;
    return item.authority.some((code) => hasAccessByCodes([code]));
  });
});

function navTo(url: string) {
  if (url.startsWith('http')) {
    openWindow(url);
    return;
  }
  if (url.startsWith('/')) {
    router.push(url).catch((error) => console.error(error));
  }
}
</script>

<template>
  <div class="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700/80 flex-1 flex flex-col min-h-0">
    <div class="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 mb-3 shrink-0">
      <span class="w-1 h-3.5 bg-rose-500 rounded-full"></span> 常用功能
    </div>
    <div class="grid grid-cols-3 gap-3 overflow-y-auto pr-1 flex-1 min-h-0">
      <div
        v-for="(item, idx) in filteredNavItems"
        :key="idx"
        class="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700/40 cursor-pointer transition-colors group"
        @click="navTo(item.url)"
      >
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center mb-1 shadow-sm group-hover:scale-105 transition-transform"
          :style="{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}30` }"
        >
          <el-icon class="text-xl" :style="{ color: item.color }">
            <component :is="item.icon" />
          </el-icon>
        </div>
        <span class="text-[11px] text-gray-600 dark:text-gray-300 font-medium text-center truncate w-full group-hover:text-blue-600">
          {{ item.title }}
        </span>
      </div>
    </div>
  </div>
</template>
