<script lang="ts" setup>
import type { NotificationItem } from '@vben/layouts';

import { computed, ref ,watch} from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import {
  BasicLayout,
  LockScreen,
  Notification,
  UserDropdown,
} from '@vben/layouts';
import { preferences, usePreferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { ElMessage } from 'element-plus';

import ExportFloatingBall from '#/components/ExportFloatingBall/index.vue';
import { $t } from '#/locales';
import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';

const notifications = ref<NotificationItem[]>([
  {
    id: 1,
    avatar: 'https://avatar.vercel.sh/vercel.svg?text=VB',
    date: '3小时前',
    isRead: true,
    message: '描述信息描述信息描述信息',
    title: '收到了 14 份新周报',
  },
]);

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const { isDark } = usePreferences();
const showDot = computed(() =>
  notifications.value.some((item) => !item.isRead),
);


// 商户列表
const merchantList = computed(() => {
  return userStore.userInfo?.userMerchant || [];
});

// 当前商户名称
const currentMerchantName = computed(() => {
  console.log(merchantList,"商户列表");
  const current = merchantList.value.find(
    (item) => item.merchantId === userStore.userInfo?.merchantId
  );
  return current?.merchantName || '';
});

// 控制商户弹窗显示
const showMerchantDialogVisible = ref(false);

// 切换商户
async function handleSwitchMerchant(merchantId: number) {
  if (merchantId === userStore.userInfo?.merchantId) {
    ElMessage.info('已是当前商户');
    showMerchantDialogVisible.value = false;
    return;
  }
  
  try {
    await authStore.changeMerchant(merchantId);
    showMerchantDialogVisible.value = false;
    ElMessage.success('切换商户成功，页面即将刷新...');
  } catch (error) {
    console.error('切换商户失败', error);
    ElMessage.error('切换商户失败');
  }
}

const menus = computed(() => {
  const menuItems = [
    {
      handler: () => {
        router.push({ name: 'Profile' });
      },
      icon: 'lucide:user',
      text: $t('page.auth.profile'),
    },
  ];
  
  if (merchantList.value.length > 0) {
    menuItems.push({
      handler: () => {
        showMerchantDialogVisible.value = true;
      },
      icon: 'lucide:building',
      text: `切换商户${currentMerchantName.value ? ` (${currentMerchantName.value})` : ''}`,
    });
  }
  
  return menuItems;
});

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

async function handleLogout() {
  await authStore.logout(false);
}

function handleNoticeClear() {
  notifications.value = [];
}

function markRead(id: number | string) {
  const item = notifications.value.find((item) => item.id === id);
  if (item) {
    item.isRead = true;
  }
}

function remove(id: number | string) {
  notifications.value = notifications.value.filter((item) => item.id !== id);
}

function handleMakeAll() {
  notifications.value.forEach((item) => (item.isRead = true));
}

const viewAll = () => {};

const handleClick = (item: NotificationItem) => {
  // 如果通知项有链接，点击时跳转
  if (item.link) {
    navigateTo(item.link, item.query, item.state);
  }
};

function navigateTo(
  link: string,
  query?: Record<string, any>,
  state?: Record<string, any>,
) {
  if (link.startsWith('http://') || link.startsWith('https://')) {
    // 外部链接，在新标签页打开
    window.open(link, '_blank');
  } else {
    // 内部路由链接，支持 query 参数和 state
    router.push({
      path: link,
      query: query || {},
      state,
    });
  }
}

watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
    isDark: isDark.value,
  }),
  async ({ enable, content, isDark: isDarkValue }) => {
    if (enable) {
      const watermarkColor = isDarkValue
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(0, 0, 0, 0.12)';

      await updateWatermark({
        advancedStyle: {
          colorStops: [
            {
              color: watermarkColor,
              offset: 0,
            },
            {
              color: watermarkColor,
              offset: 1,
            },
          ],
          type: 'linear',
        },
        content:
          content ||
          `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <ExportFloatingBall />
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.realName"
        description="xxx@gmail.com"
        tag-text="Pro"
        @logout="handleLogout"
        @clear-preferences-and-logout="handleLogout"
      />
    </template>
    <template #notification>
       <!-- <el-popover placement="bottom-end" :width="400" trigger="click">
        <template #reference>
          <el-badge :value="unreadCount" :hidden="unreadCount === 0">
            <el-button icon="Bell" link />
          </el-badge>
        </template>
        <el-tabs>
          <el-tab-pane label="系统通知" />
          <el-tab-pane label="导出任务">
            <ExportNotification />
          </el-tab-pane>
        </el-tabs>
      </el-popover> -->
      <Notification
        :dot="showDot"
        :notifications="notifications"
        @clear="handleNoticeClear"
        @read="(item) => item.id && markRead(item.id)"
        @remove="(item) => item.id && remove(item.id)"
        @make-all="handleMakeAll"
        @on-click="handleClick"
        @view-all="viewAll"
      />
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>

   <!-- 商户切换弹窗 -->
    <el-dialog
      v-model="showMerchantDialogVisible"
      title="切换商户"
      width="350px"
      :close-on-click-modal="false"
    >
      <div class="merchant-dialog-list">
        <div
          v-for="merchant in merchantList"
          :key="merchant.merchantId"
          class="merchant-dialog-item"
          :class="{ active: merchant.merchantId === userStore.userInfo?.merchantId }"
          @click="handleSwitchMerchant(merchant.merchantId)"
        >
          <div class="merchant-info">
            <el-icon><OfficeBuilding /></el-icon>
            <span>{{ merchant.merchantName }}</span>
          </div>
          <el-tag v-if="merchant.merchantId === userStore.userInfo?.merchantId" type="success" size="small">
            当前
          </el-tag>
        </div>
      </div>
    </el-dialog>
</template>
<style scoped>
.merchant-dialog-list {
  max-height: 400px;
  overflow-y: auto;
}

.merchant-dialog-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  transition: all 0.2s;
}

.merchant-dialog-item:hover {
  background-color: var(--el-fill-color-light);
  border-color: var(--el-color-primary);
}

.merchant-dialog-item.active {
  background-color: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}

.merchant-info {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
