<script lang="ts" setup>
import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import MerchantAccountInfo from './MerchantAccountInfo.vue';
import MerchantBasicInfo from './MerchantBasicInfo.vue';
import MerchantConfigTab from './MerchantConfigTab.vue';
import MerchantFlowTable from './MerchantFlowTable.vue';
import MerchantRechargeTable from './MerchantRechargeTable.vue';

// --- 状态 ---
const activeTab = ref('basic');
const merchantId = ref(0);
const accountBalance = ref(0);
const balanceLoading = ref(false);
const initialized = ref(false); // 添加初始化状态

// --- 组件引用 ---
const rechargeTableRef = ref();
const flowTableRef = ref();

// --- 刷新方法 ---
function refreshRechargeData() {
  rechargeTableRef.value?.loadData();
}

function refreshFlowData() {
  flowTableRef.value?.loadData();
}

// --- 加载账户余额 ---
async function loadAccountBalance() {
  if (!merchantId.value) return;
  balanceLoading.value = true;
  try {
    const { getMerchantAccountApi } = await import('#/api/system/merchant');
    const res = await getMerchantAccountApi(merchantId.value);
    accountBalance.value = res?.balance || 0;
  } catch {
    // 静默失败
  } finally {
    balanceLoading.value = false;
  }
}

function formatAmount(amount: number): string {
  return `¥ ${(amount || 0).toFixed(2)}`;
}

// --- 初始化 ---
async function initMerchantInfo() {
  const userStore = useUserStore();
  if (userStore.userInfo?.merchantId) {
    merchantId.value = userStore.userInfo.merchantId;
  } else {
    // 如果 userInfo 还没加载，等待一下
    await new Promise((resolve) => {
      const unwatch = watch(
        () => userStore.userInfo,
        (newVal) => {
          if (newVal?.merchantId) {
            merchantId.value = newVal.merchantId;
            unwatch();
            resolve(null);
          }
        },
        { immediate: true }
      );
    });
  }
}

// --- 生命周期 ---
onMounted(async () => {
  await initMerchantInfo();
  if (merchantId.value) {
    await loadAccountBalance();
  }
  initialized.value = true;
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <!-- 顶部余额卡片 -->
      <div
        class="flex flex-wrap items-center justify-between gap-4 mb-4 p-4 bg-white rounded-xl border border-blue-100/50 dark:border-blue-800/30"
>
        <div class="flex items-center gap-6">
          <!-- 余额图标 -->
          <div class="hidden sm:flex items-center justify-center w-12 h-12 rounded-full bg-gray-100">
            <el-icon :size="28">
              <Wallet />
            </el-icon>
          </div>
          <!-- 余额信息 -->
          <div>
            <div class="text-sm text-gray-400">账户余额</div>
            <div class="flex items-baseline gap-3">
              <span class="text-3xl font-bold text-black">
                {{ formatAmount(accountBalance) }}
              </span>
              <span class="text-xs text-gray-400">可用余额</span>
            </div>
          </div>
        </div>

        <!-- 右侧操作 -->
        <div class="flex items-center gap-2">
          <el-button type="primary" size="default" :loading="balanceLoading" @click="loadAccountBalance">
            <el-icon>
              <Refresh />
            </el-icon>
            刷新
          </el-button>
          <el-button type="success" size="default" plain @click="activeTab = 'account'">
            <el-icon>
              <Plus />
            </el-icon>
            充值
          </el-button>
        </div>
      </div>
      <!-- Tabs - 等初始化完成后再显示 -->
      <el-card shadow="never" v-if="initialized">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="基本信息" name="basic">
            <MerchantBasicInfo :merchant-id="merchantId" />
          </el-tab-pane>

          <el-tab-pane label="账户信息" name="account">
            <MerchantAccountInfo :merchant-id="merchantId" @refresh-balance="loadAccountBalance" />
          </el-tab-pane>

          <el-tab-pane label="充值订单" name="recharge">
            <MerchantRechargeTable ref="rechargeTableRef" :merchant-id="merchantId" />
          </el-tab-pane>

          <el-tab-pane label="资金流水" name="flow">
            <MerchantFlowTable ref="flowTableRef" :merchant-id="merchantId" />
          </el-tab-pane>

          <el-tab-pane label="商户配置" name="config">
            <MerchantConfigTab :merchant-id="merchantId" />
          </el-tab-pane>
        </el-tabs>
      </el-card>

      <!-- 加载中 -->
      <el-card shadow="never" v-else>
        <div class="flex justify-center py-12">
          <el-icon class="is-loading text-3xl">
            <Loading />
          </el-icon>
          <span class="ml-3 text-gray-400">加载商户信息...</span>
        </div>
      </el-card>
    </div>
  </Page>
</template>
