<script lang="ts" setup>
import { computed } from 'vue';

import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

const userStore = useUserStore();

const currentMerchantInfo = computed(() => {
  return userStore.userInfo?.userMerchant?.find(
    (m: any) => m.merchantId === userStore.userInfo?.merchantId,
  );
});

const roleName = computed(() => {
  if (userStore.userInfo?.superAdminFlag === 1) return '超级管理员';
  return userStore.userInfo?.realName || '合作商';
});

const merchantStatus = computed(() => {
  return currentMerchantInfo.value?.status === 0
    ? { text: '正常', type: 'success' }
    : { text: '停用', type: 'danger' };
});
</script>

<template>
  <div
    class="relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 p-4 text-white shadow-md flex flex-col justify-between min-h-0"
  >
    <!-- 气泡装饰：提高白色半透明度 (bg-white/25 与 bg-white/30)，完美适配任意动态主题色 -->
    <div
      class="absolute -right-8 -bottom-8 h-40 w-40 rounded-full bg-white/25 pointer-events-none"
    ></div>
    <div
      class="absolute right-12 top-2 h-16 w-16 rounded-full bg-white/30 pointer-events-none"
    ></div>

    <!-- 顶栏标题 -->
    <div class="relative z-10 text-xl font-bold tracking-wide leading-snug shrink-0">
      您好，欢迎登录后台系统！
    </div>

    <!-- 白色内框：兼容多字段 -->
    <div
      class="relative z-10 flex flex-1 flex-col justify-center rounded-xl bg-white/95 p-4 text-gray-800 shadow-sm min-h-0 my-3 gap-3"
    >
      <!-- 用户头像与名称/状态 -->
      <div class="flex items-center gap-3 shrink-0">
        <el-avatar
          :size="44"
          :src="
            userStore.userInfo?.user?.avatar || preferences.app.defaultAvatar
          "
          class="border border-primary-100 shrink-0 bg-slate-100"
        />
        <div class="min-w-0 flex-1">
          <div class="truncate text-base font-bold text-gray-900 leading-tight">
            {{ userStore.userInfo?.user?.nickName || '慧小分' }}
          </div>
          <div class="mt-1 text-xs text-gray-400 flex items-center gap-1.5">
            <span>当前状态:</span>
            <span
              :class="
                merchantStatus.type === 'success'
                  ? 'text-primary-500'
                  : 'text-rose-500'
              "
              class="font-medium"
            >
              {{ merchantStatus.text }}
            </span>
          </div>
        </div>
      </div>

      <!-- 字段列表（多字段自适应） -->
      <div class="flex flex-col gap-2.5 pt-2 border-t border-gray-100 text-xs">
        <div class="flex justify-between items-center">
          <span class="text-gray-500">登录账号</span>
          <span class="text-primary-600 font-medium">
            {{ userStore.userInfo?.user?.userName || '15630666831' }}
          </span>
        </div>

        <div class="flex justify-between items-center">
          <span class="text-gray-500">账号角色</span>
          <span class="text-primary-600 font-medium">{{ roleName }}</span>
        </div>

        <div class="flex justify-between items-center">
          <span class="text-gray-500">商户名称</span>
          <span class="text-gray-700 font-medium truncate max-w-[140px]" :title="currentMerchantInfo?.merchantName || '合作商'">
            {{ currentMerchantInfo?.merchantName || '合作商' }}
          </span>
        </div>

        <div class="flex justify-between items-center">
          <span class="text-gray-500">商户编码</span>
          <span class="text-gray-700 font-medium">
            {{ currentMerchantInfo?.merchantCode || 'hxf' }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
