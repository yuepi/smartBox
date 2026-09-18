<script lang="ts" setup>
import { computed, ref } from 'vue';

type TabKey = 'day' | 'month' | 'week';

const activeTab = ref<TabKey>('month');

const tabs = [
  { key: 'month', label: '本月' },
  { key: 'week', label: '本周' },
  { key: 'day', label: '本日' },
] as const;

interface StatData {
  count: number;
  amount: number;
  weight: number;
  withdraw: number;
  members: number;
  newMembers: number;
}

const data: Record<TabKey, StatData> = {
  month: {
    count: 2612,
    amount: 3674.12,
    weight: 7253.07,
    withdraw: 2097.59,
    members: 1103,
    newMembers: 512,
  },
  week: {
    count: 650,
    amount: 920.5,
    weight: 1820.3,
    withdraw: 520.2,
    members: 280,
    newMembers: 120,
  },
  day: {
    count: 89,
    amount: 128.5,
    weight: 260.1,
    withdraw: 80.2,
    members: 42,
    newMembers: 18,
  },
};

const currentData = computed(() => data[activeTab.value]);

// 数字格式化
const formatNumber = (val: number, isFloat = false) => {
  if (isFloat) {
    return val.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return val.toLocaleString('zh-CN');
};
</script>

<template>
  <div class="tech-card">
    <!-- 头部栏 -->
    <div class="card-header">
      <div class="title-wrapper">
        <span class="header-icon"></span>
        <span class="card-title">基础数据栏</span>
      </div>
      <div class="tab-group">
        <span
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </span>
      </div>
    </div>

    <!-- 数据主体网格 -->
    <div class="card-body">
      <!-- 投递类数据 -->
      <div class="stat-box">
        <div class="corner top-left"></div>
        <div class="stat-box-title">
          <span>投递次数</span>
          <span class="unit">(次)</span>
        </div>
        <div class="stat-box-value color-cyan">{{ formatNumber(currentData.count) }}</div>
      </div>

      <div class="stat-box">
        <div class="corner top-left"></div>
        <div class="stat-box-title">
          <span>获取环保金</span>
          <span class="unit">(元)</span>
        </div>
        <div class="stat-box-value color-gold">{{ formatNumber(currentData.amount, true) }}</div>
      </div>

      <div class="stat-box">
        <div class="corner top-left"></div>
        <div class="stat-box-title">
          <span>投递重量</span>
          <span class="unit">(kg)</span>
        </div>
        <div class="stat-box-value color-cyan">{{ formatNumber(currentData.weight, true) }}</div>
      </div>

      <!-- 会员与财务类数据 -->
      <div class="stat-box">
        <div class="corner top-left"></div>
        <div class="stat-box-title">
          <span>提现金额</span>
          <span class="unit">(元)</span>
        </div>
        <div class="stat-box-value color-gold">{{ formatNumber(currentData.withdraw, true) }}</div>
      </div>

      <div class="stat-box">
        <div class="corner top-left"></div>
        <div class="stat-box-title">
          <span>参与会员</span>
          <span class="unit">(名)</span>
        </div>
        <div class="stat-box-value color-green">{{ formatNumber(currentData.members) }}</div>
      </div>

      <div class="stat-box">
        <div class="corner top-left"></div>
        <div class="stat-box-title">
          <span>新增会员</span>
          <span class="unit">(名)</span>
        </div>
        <div class="stat-box-value color-green">{{ formatNumber(currentData.newMembers) }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tech-card {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 12px 14px;
  background: rgb(10 30 60 / 65%);
  border: 1px solid rgb(0 216 255 / 25%);
  border-radius: 6px;
  box-shadow: inset 0 0 15px rgb(0 216 255 / 10%);
  backdrop-filter: blur(10px);
}

.card-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid rgb(0 216 255 / 15%);

  .title-wrapper {
    display: flex;
    gap: 8px;
    align-items: center;

    .header-icon {
      width: 4px;
      height: 14px;
      background: #00d8ff;
      border-radius: 2px;
      box-shadow: 0 0 8px #00d8ff;
    }

    .card-title {
      font-size: 15px;
      font-weight: bold;
      color: #e2f8ff;
      letter-spacing: 0.5px;
    }
  }
}

.tab-group {
  display: flex;
  gap: 4px;
  padding: 2px;
  background: rgb(0 0 0 / 25%);
  border: 1px solid rgb(0 216 255 / 20%);
  border-radius: 4px;

  .tab-item {
    padding: 2px 8px;
    font-size: 12px;
    color: #8fa3c0;
    cursor: pointer;
    border-radius: 3px;
    transition: all 0.2s ease;

    &:hover {
      color: #00d8ff;
    }

    &.active {
      font-weight: 500;
      color: #041226;
      background: #00d8ff;
      box-shadow: 0 0 8px rgb(0 216 255 / 60%);
    }
  }
}

.card-body {
  display: grid;
  flex: 1;
  grid-template-rows: repeat(2, 1fr);
  grid-template-columns: repeat(3, 1fr);
  gap: 8px; /* 稍微压缩间距 */
  padding-top: 10px;
}

.stat-box {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 6px 8px; /* 压缩内边距，留出更多空间给数字 */
  overflow: hidden;
  background: linear-gradient(135deg, rgb(0 216 255 / 6%) 0%, rgb(10 30 60 / 25%) 100%);
  border: 1px solid rgb(0 216 255 / 15%);
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, rgb(0 216 255 / 12%) 0%, rgb(10 30 60 / 40%) 100%);
    border-color: rgb(0 216 255 / 35%);
  }

  .corner.top-left {
    position: absolute;
    top: -1px;
    left: -1px;
    width: 4px;
    height: 4px;
    border-top: 2px solid #00d8ff;
    border-left: 2px solid #00d8ff;
  }

  .stat-box-title {
    display: flex;
    gap: 4px;
    align-items: center;
    font-size: 12px;
    color: #94a3b8;
    white-space: nowrap;

    .unit {
      font-size: 11px;
      color: #64748b;
    }
  }

  .stat-box-value {
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: DIN, 'Helvetica Neue', sans-serif;

    /* 使用 clamp 保证屏幕极窄时缩小字号，防止溢出 */
    font-size: clamp(16px, 1.3vw, 22px);
    font-weight: bold;
    line-height: 1.1;
    white-space: nowrap;

    &.color-cyan {
      color: #00d8ff;
      text-shadow: 0 0 10px rgb(0 216 255 / 30%);
    }

    &.color-gold {
      color: #ffb700;
      text-shadow: 0 0 10px rgb(255 183 0 / 30%);
    }

    &.color-green {
      color: #0fa;
      text-shadow: 0 0 10px rgb(0 255 170 / 30%);
    }
  }
}
</style>
