<script lang="ts" setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import * as echarts from 'echarts';

const chartRef = ref<HTMLDivElement | null>(null);
const activeTab = ref('month');
let chart: echarts.ECharts | null = null;
let resizeObserver: null | ResizeObserver = null;

// Tab 数据映射
const dataMap: Record<string, { types: string[]; values: number[] }> = {
  day: {
    types: ['金属', '玻璃', '其他', '有害', '厨余', '可回收物'],
    values: [120, 180, 260, 310, 520, 890],
  },
  week: {
    types: ['金属', '玻璃', '其他', '有害', '厨余', '可回收物'],
    values: [850, 1100, 1600, 2100, 3400, 5200],
  },
  month: {
    types: ['金属', '玻璃', '其他', '有害', '厨余', '可回收物'],
    values: [2800, 3200, 4800, 6200, 8500, 11_000],
  },
};

const initChart = () => {
  if (!chartRef.value) return;
  chart = echarts.init(chartRef.value);
  updateChartOptions();
};

const updateChartOptions = () => {
  if (!chart) return;

  const currentData = dataMap[activeTab.value];

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(10, 30, 60, 0.95)',
      borderColor: 'rgba(0, 216, 255, 0.5)',
      textStyle: { color: '#e2f8ff', fontSize: 12 },
      formatter: (params: any) => {
        const item = params[0];
        return `<div style="padding: 2px 4px;">
          <span style="color: #8fa3c0;">${item.name}：</span>
          <strong style="color: #00d8ff;">${item.value.toLocaleString()} kg</strong>
        </div>`;
      },
    },
    grid: {
      top: 15,
      right: 40,
      bottom: 10,
      left: 10,
      containLabel: true, // 包含轴标签，防止被遮挡并自动填充剩余宽度
    },
    xAxis: {
      type: 'value',
      splitLine: {
        lineStyle: { color: 'rgba(0, 216, 255, 0.08)', type: 'dashed' },
      },
      axisLabel: { color: '#8fa3c0', fontSize: 10 },
    },
    yAxis: {
      type: 'category',
      data: currentData.types,
      axisLine: { lineStyle: { color: 'rgba(0, 216, 255, 0.3)' } },
      axisTick: { show: false },
      axisLabel: { color: '#8fa3c0', fontSize: 11 },
    },
    series: [
      {
        name: '回收量',
        type: 'bar',
        data: currentData.values,
        barWidth: 12,
        showBackground: true,
        backgroundStyle: {
          color: 'rgba(0, 216, 255, 0.05)',
          borderRadius: [0, 6, 6, 0],
        },
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#0066ff' },
            { offset: 1, color: '#00d8ff' },
          ]),
          borderRadius: [0, 6, 6, 0],
          shadowColor: 'rgba(0, 216, 255, 0.3)',
          shadowBlur: 5,
        },
        label: {
          show: true,
          position: 'right',
          color: '#38bdf8',
          fontSize: 10,
          fontFamily: 'DIN, monospace',
          formatter: (params: any) => `${params.value}`,
        },
      },
    ],
  });
};

// 监听 Tab 切换动态渲染数据
watch(activeTab, () => {
  updateChartOptions();
});

const handleResize = () => chart?.resize();

onMounted(() => {
  nextTick(() => {
    initChart();

    if (chartRef.value) {
      resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(chartRef.value);
    }
  });

  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (resizeObserver) resizeObserver.disconnect();
  chart?.dispose();
});
</script>

<template>
  <div class="tech-card">
    <div class="card-header">
      <div class="title-wrapper">
        <span class="header-icon"></span>
        <span class="card-title">回收物分析栏</span>
      </div>
      <div class="tab-group">
        <span
          v-for="tab in [
            { key: 'month', label: '本月' },
            { key: 'week', label: '本周' },
            { key: 'day', label: '本日' },
          ]"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </span>
      </div>
    </div>

    <!-- 弹性拉伸的容器包裹层 -->
    <div class="chart-wrapper">
      <div ref="chartRef" class="chart"></div>
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
  background: rgb(0 216 255 / 8%);
  border-radius: 4px;
}

.tab-item {
  padding: 2px 10px;
  font-size: 11px;
  color: #8fa3c0;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.25s ease;

  &:hover {
    color: #00d8ff;
  }

  &.active {
    font-weight: 500;
    color: #0a0e1a;
    background: #00d8ff;
    box-shadow: 0 0 8px rgb(0 216 255 / 40%);
  }
}

/* 核心撑满逻辑 */
.chart-wrapper {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 120px;
  margin-top: 4px;
}

.chart {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
