<script lang="ts" setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue';

import * as echarts from 'echarts';

const chartRef = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;
let timer: NodeJS.Timeout | null = null;
let resizeObserver: null | ResizeObserver = null;

// 12个月回收量模拟数据 (单位: kg)
const months = [
  '01月',
  '02月',
  '03月',
  '04月',
  '05月',
  '06月',
  '07月',
  '08月',
  '09月',
  '10月',
  '11月',
  '12月',
];

const values = ref([
  1200, 1800, 3200, 4500, 5800, 7200, 8400, 9100, 6200, 7800, 8900, 9500,
]);

const initChart = () => {
  if (!chartRef.value) return;
  chart = echarts.init(chartRef.value);
  updateChartOptions();
};

const updateChartOptions = () => {
  if (!chart) return;

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
          <span style="color: #8fa3c0;">${item.name}总量：</span>
          <strong style="color: #00d8ff;">${item.value.toLocaleString()} kg</strong>
        </div>`;
      },
    },
    grid: {
      top: 25,
      right: 10,
      bottom: 10,
      left: 10,
      containLabel: true, // 启用自动包含刻度标签，避免边缘遮挡
    },
    xAxis: {
      type: 'category',
      data: months,
      axisLine: { lineStyle: { color: 'rgba(0, 216, 255, 0.3)' } },
      axisTick: { show: false },
      axisLabel: { color: '#8fa3c0', fontSize: 11, interval: 0 },
    },
    yAxis: {
      type: 'value',
      max: 12_000,
      splitLine: {
        lineStyle: { color: 'rgba(0, 216, 255, 0.08)', type: 'dashed' },
      },
      axisLabel: {
        color: '#8fa3c0',
        fontSize: 10,
        formatter: (val: number) => (val >= 1000 ? `${val / 1000}k` : val),
      },
    },
    series: [
      {
        name: '回收量',
        type: 'bar',
        data: values.value,
        barWidth: 12,
        showBackground: true,
        backgroundStyle: {
          color: 'rgba(0, 216, 255, 0.05)',
          borderRadius: [4, 4, 0, 0],
        },
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#00d8ff' },
            { offset: 0.8, color: '#0066ff' },
            { offset: 1, color: 'rgba(0, 102, 255, 0.2)' },
          ]),
          shadowColor: 'rgba(0, 216, 255, 0.4)',
          shadowBlur: 6,
        },
        label: {
          show: true,
          position: 'top',
          color: '#38bdf8',
          fontSize: 10,
          fontFamily: 'DIN, monospace',
          formatter: (params: any) =>
            params.value > 0 ? `${(params.value / 1000).toFixed(1)}k` : '',
        },
      },
    ],
  });
};

const startDataUpdate = () => {
  timer = setInterval(() => {
    values.value = values.value.map((v) => {
      const delta = Math.floor(Math.random() * 300) - 100;
      return Math.max(800, Math.min(11_500, v + delta));
    });
    updateChartOptions();
  }, 8000);
};

const handleResize = () => chart?.resize();

onMounted(() => {
  nextTick(() => {
    initChart();
    startDataUpdate();

    if (chartRef.value) {
      resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(chartRef.value);
    }
  });

  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
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
        <span class="card-title">聚合排行榜</span>
      </div>
      <span class="card-sub">月度回收统计(kg)</span>
    </div>
    <!-- 使用 flex: 1 撑满剩余高度的包裹层 -->
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

  .card-sub {
    font-size: 11px;
    color: rgb(0 216 255 / 60%);
  }
}

/* 核心更改：弹性父容器 + 绝对定位子元素 */
.chart-wrapper {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 120px; /* 设置兜底高度防止容器塌陷 */
  margin-top: 4px;
}

.chart {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
