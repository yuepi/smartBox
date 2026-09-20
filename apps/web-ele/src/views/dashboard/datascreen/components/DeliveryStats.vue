<script lang="ts" setup>
import { computed, ref } from 'vue';

type TabKey = 'day' | 'month' | 'week';

const activeTab = ref<TabKey>('month');

const tabs = [
  { key: 'month', label: '本月' },
  { key: 'week', label: '本周' },
  { key: 'day', label: '本日' },
] as const;

const rawData = {
  month: { weight: 7253, count: 2612, weightGrowth: '+12.5%', countGrowth: '+8.2%' },
  week: { weight: 1820, count: 650, weightGrowth: '+5.1%', countGrowth: '+3.4%' },
  day: { weight: 260, count: 89, weightGrowth: '+1.2%', countGrowth: '+0.8%' },
};

const currentData = computed(() => rawData[activeTab.value]);

// 千分位格式化
const formatNumber = (num: number) => {
  return num.toLocaleString();
};
</script>

<template>
  <div class="tech-card">
    <!-- 卡片头部 -->
    <div class="card-header">
      <div class="title-wrapper">
        <span class="header-icon"></span>
        <span class="card-title">投递数据栏</span>
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

    <!-- 卡片主体：加 flex:1 自适应拉伸 -->
    <div class="card-body">
      <div class="stat-container">
        <!-- 重量指标卡片 -->
        <div class="stat-card">
          <div class="stat-corner top-left"></div>
          <div class="stat-corner bottom-right"></div>
          <div class="stat-header">
            <span class="stat-label">投递总量</span>
            <span class="stat-unit">kg</span>
          </div>
          <div class="stat-value">{{ formatNumber(currentData.weight) }}</div>
          <div class="stat-footer">
            <span class="sub-label">环比增长</span>
            <span class="growth-tag">{{ currentData.weightGrowth }}</span>
          </div>
        </div>

        <!-- 次数指标卡片 -->
        <div class="stat-card">
          <div class="stat-corner top-left"></div>
          <div class="stat-corner bottom-right"></div>
          <div class="stat-header">
            <span class="stat-label">投递次数</span>
            <span class="stat-unit">次</span>
          </div>
          <div class="stat-value color-gold">{{ formatNumber(currentData.count) }}</div>
          <div class="stat-footer">
            <span class="sub-label">环比增长</span>
            <span class="growth-tag color-gold">{{ currentData.countGrowth }}</span>
          </div>
        </div>
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
  height: 100%; /* 撑满父级高度 */
  padding: 14px 16px;
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
  padding-bottom: 10px;
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
    padding: 3px 10px;
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

/* 核心区域：自适应垂直伸缩与居中 */
.card-body {
  display: flex;
  flex: 1;
  align-items: center; /* 内容垂直居中 */
  justify-content: center;
  padding-top: 12px;
}

.stat-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  width: 100%;
}

.stat-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgb(0 216 255 / 8%) 0%, rgb(10 30 60 / 30%) 100%);
  border: 1px solid rgb(0 216 255 / 15%);
  border-radius: 4px;

  /* 科技切角装饰 */
  .stat-corner {
    position: absolute;
    width: 6px;
    height: 6px;

    &.top-left {
      top: -1px;
      left: -1px;
      border-top: 2px solid #00d8ff;
      border-left: 2px solid #00d8ff;
    }

    &.bottom-right {
      right: -1px;
      bottom: -1px;
      border-right: 2px solid #00d8ff;
      border-bottom: 2px solid #00d8ff;
    }
  }

  .stat-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;

    .stat-label {
      font-size: 13px;
      color: #a3c0e0;
    }

    .stat-unit {
      font-size: 12px;
      color: #5c7899;
    }
  }

  .stat-value {
    margin: 6px 0;
    font-family: DIN, 'Helvetica Neue', sans-serif;
    font-size: 30px;
    font-weight: bold;
    line-height: 1.1;
    color: #00d8ff;
    text-shadow: 0 0 12px rgb(0 216 255 / 40%);

    &.color-gold {
      color: #ffb700;
      text-shadow: 0 0 12px rgb(255 183 0 / 40%);
    }
  }

  .stat-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 6px;
    font-size: 11px;
    border-top: 1px dashed rgb(255 255 255 / 8%);

    .sub-label {
      color: #627d9d;
    }

    .growth-tag {
      font-weight: bold;
      color: #00f2ff;

      &.color-gold {
        color: #ffb700;
      }
    }
  }
}
</style>
