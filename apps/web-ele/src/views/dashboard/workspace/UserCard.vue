<script lang="ts" setup>
import { computed } from 'vue';

import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

const userStore = useUserStore();

const currentMerchantInfo = computed(() => {
  return userStore.userInfo?.userMerchant?.find(
    (m: any) => m.merchantId === userStore.userInfo?.merchantId
  );
});

const roleName = computed(() => {
  if (userStore.userInfo?.superAdminFlag === 1) return '超级管理员';
  return userStore.userInfo?.realName || '运营商';
});

const merchantStatus = computed(() => {
  return currentMerchantInfo.value?.status === 0
    ? { text: '正常', type: 'success' }
    : { text: '停用', type: 'danger' };
});
</script>

<template>
  <div class="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 text-white shadow-md shrink-0 relative overflow-hidden">
    <div class="text-lg font-bold mb-3 z-10 relative">您好，欢迎智能回收箱系统！</div>
    <div class="bg-white/95 text-gray-800 rounded-lg p-3 text-xs space-y-2 shadow-inner relative z-10">
      <div class="flex items-center gap-2.5">
        <el-avatar :size="36" :src="userStore.userInfo?.user?.avatar || preferences.app.defaultAvatar" class="border border-primary-100" />
        <div>
          <div class="font-bold text-sm">{{ userStore.userInfo?.user?.nickName || '超级管理员' }}</div>
          <div class="text-[11px] text-gray-500 mt-0.5">
            状态:
            <span :class="merchantStatus.type === 'success' ? 'text-emerald-500' : 'text-rose-500'" class="font-bold">
              {{ merchantStatus.text }}
            </span>
          </div>
        </div>
      </div>
      <div class="text-gray-500 pt-1.5 border-t border-gray-100">
        商户名称: <span class="text-primary-600 font-medium">{{ currentMerchantInfo?.merchantName || 'huixiaofen' }}</span>
      </div>
      <div class="text-gray-500">
        角色名称: <span class="text-primary-600 font-medium">{{ roleName }}</span>
      </div>
      <div class="text-gray-500 flex justify-between items-center">
        <span>
          商户编码: <strong class="text-gray-800 font-medium">{{ currentMerchantInfo?.merchantCode || 'hxf' }}</strong>
        </span>
      </div>
    </div>
    <div class="absolute -right-8 -bottom-8 w-28 h-28 bg-white/10 rounded-full blur-sm"></div>
  </div>
</template>
