<script lang="ts" setup>
import { useUserStore } from '@vben/stores';

import { useAuthStore } from '#/store';

// 双向绑定控制弹窗显示/隐藏
const open = defineModel<boolean>('open', { default: false });

const userStore = useUserStore();
const authStore = useAuthStore();

const loading = ref(false);
const searchKeyword = ref('');

// 商户列表
const merchantList = computed(() => {
  return userStore.userInfo?.userMerchant || [];
});

// 当前商户 ID
const currentMerchantId = computed(() => {
  return userStore.userInfo?.merchantId;
});

// 支持搜索过滤后的商户列表
const filteredMerchantList = computed(() => {
  if (!searchKeyword.value.trim()) return merchantList.value;
  return merchantList.value.filter((item) =>
    item.merchantName
      .toLowerCase()
      .includes(searchKeyword.value.trim().toLowerCase()),
  );
});

// 切换商户
async function handleSwitchMerchant(merchantId: number) {
  if (merchantId === currentMerchantId.value) {
    ElMessage.info('已是当前商户');
    open.value = false;
    return;
  }

  try {
    loading.value = true;
    await authStore.changeMerchant(merchantId);
    open.value = false;
    ElMessage.success('切换商户成功，页面即将刷新...');
  } catch (error) {
    console.error('切换商户失败', error);
    ElMessage.error('切换商户失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <el-dialog
    v-model="open"
    title="切换商户"
    width="420px"
    class="merchant-select-dialog"
    :close-on-click-modal="false"
    destroy-on-close
    append-to-body
  >
    <div v-if="merchantList.length > 5" class="search-box">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索商户名称..."
        prefix-icon="Search"
        clearable
      />
    </div>

    <div v-loading="loading" class="merchant-dialog-list">
      <template v-if="filteredMerchantList.length > 0">
        <div
          v-for="merchant in filteredMerchantList"
          :key="merchant.merchantId"
          class="merchant-dialog-item"
          :class="{
            active: merchant.merchantId === currentMerchantId,
          }"
          @click="handleSwitchMerchant(merchant.merchantId)"
        >
          <div class="merchant-info">
            <el-icon class="merchant-icon">
              <OfficeBuilding />
            </el-icon>
            <span class="merchant-name" :title="merchant.merchantName">
              {{ merchant.merchantName }}
            </span>
          </div>

          <div class="merchant-status">
            <el-tag
              v-if="merchant.merchantId === currentMerchantId"
              type="primary"
              effect="light"
              size="small"
              round
            >
              <el-icon>
                <Check />
              </el-icon>
              当前商户
            </el-tag>
          </div>
        </div>
      </template>

      <el-empty v-else :image-size="80" description="未匹配到相关商户" />
    </div>
  </el-dialog>
</template>

<style scoped>
.search-box {
  margin-bottom: 12px;
}

.merchant-dialog-list {
  max-height: 380px;
  padding: 4px;
  overflow-y: auto;
}

.merchant-dialog-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  margin-bottom: 8px;
  cursor: pointer;
  background-color: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.merchant-dialog-item:hover {
  background-color: var(--el-fill-color-light);
  border-color: var(--el-color-primary-light-5);
  transform: translateY(-1px);
}

.merchant-dialog-item.active {
  background-color: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
}

.merchant-info {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;

  /* 防止文本溢出时不省略 */
}

.merchant-icon {
  flex-shrink: 0;
  font-size: 18px;
  color: var(--el-text-color-secondary);
}

.merchant-dialog-item.active .merchant-icon {
  color: var(--el-color-primary);
}

.merchant-name {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  white-space: nowrap;
}

.merchant-dialog-item.active .merchant-name {
  font-weight: 600;
  color: var(--el-color-primary);
}

.merchant-status {
  flex-shrink: 0;
  margin-left: 12px;
}
</style>
