<script lang="ts" setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import * as echarts from 'echarts';

type DayTab = '7' | '15' | '30';

const chartRef = ref<HTMLDivElement | null>(null);
const activeTab = ref<DayTab>('30');
let chart: echarts.ECharts | null = null;

// 根据不同天数生成模拟数据
const getMockData = (days: number) => {
  const xData: string[] = [];
  const yData: number[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    xData.push(`${month}/${day}`);

    // 生成带少许波动的模拟数据
    yData.push(Math.round(Math.random() * 200 + 150));
  }
  return { xData, yData };
};

const initChart = () => {
  if (!chartRef.value) return;
  if (!chart) {
    chart = echarts.init(chartRef.value);
  }

  const days = Number(activeTab.value);
  const { xData, yData } = getMockData(days);

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(8, 21, 41, 0.85)',
      borderColor: 'rgba(0, 216, 255, 0.4)',
      textStyle: { color: '#e0f2fe', fontSize: 12 },
      formatter: (params: any) => {
        const item = params[0];
        return `${item.name}<br/>投递量: <b>${item.value}</b> kg`;
      },
    },
    grid: {
      top: 5,
      right: 5,
      bottom: 5,
      left: 5,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xData,
      boundaryGap: false,
      axisLine: { lineStyle: { color: 'rgba(0, 216, 255, 0.2)' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#8fa3c0',
        fontSize: 10,
        interval: days > 10 ? 4 : 0, // 天数多时自动间隔显示标签，防止挤压
      },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(30,58,95,0.4)', type: 'dashed' } },
      axisLabel: { color: '#8fa3c0', fontSize: 10 },
    },
    series: [
      {
        type: 'line',
        data: yData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { color: '#00d8ff', width: 2 },
        itemStyle: { color: '#00d8ff', borderWidth: 2, borderColor: '#fff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(0,216,255,0.35)' },
            { offset: 1, color: 'rgba(0,216,255,0.0)' },
          ]),
        },
      },
    ],
  };

  chart.setOption(option, true);
};

// 监听标签切换，刷新图表
watch(activeTab, () => {
  nextTick(() => {
    initChart();
  });
});

const resize = () => chart?.resize();

onMounted(() => {
  initChart();
  window.addEventListener('resize', resize);
});

onUnmounted(() => {
  window.removeEventListener('resize', resize);
  chart?.dispose();
  chart = null;
});
</script>

<template>
  <div class="tech-card">
    <div class="card-header">
      <div class="title-wrapper">
        <span class="header-icon"></span>
        <span class="card-title">聚合数据概况</span>
      </div>
      <div class="tab-group">
        <span
          v-for="tab in [
            { key: '30', label: '30天' },
            { key: '15', label: '15天' },
            { key: '7', label: '7天' },
          ]"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key as DayTab"
        >
          {{ tab.label }}
        </span>
      </div>
    </div>
    <!-- 充满容器剩余空间 -->
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<style scoped lang="scss">
.tech-card {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%; /* 撑满父级网格容器 */
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

.chart-container {
  flex: 1; /* 关键：自动占满卡片内除头部外的所有垂直高度 */
  width: 100%;
  min-height: 120px;
}
</style>
