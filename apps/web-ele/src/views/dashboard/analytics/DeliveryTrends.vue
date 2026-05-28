<!-- components/DeliveryTrends.vue -->
<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

onMounted(() => {
  renderEcharts({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['投递次数', '投递重量(kg)'],
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: '投递次数',
        splitLine: { lineStyle: { type: 'dashed' } },
      },
      {
        type: 'value',
        name: '重量(kg)',
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '投递次数',
        type: 'bar',
        data: [320, 380, 450, 520, 680, 850, 920, 980, 1020, 1150, 1280, 1450],
        itemStyle: { borderRadius: [4, 4, 0, 0], color: '#409eff' },
      },
      {
        name: '投递重量(kg)',
        type: 'line',
        yAxisIndex: 1,
        data: [580, 720, 890, 1050, 1380, 1720, 1950, 2080, 2250, 2480, 2750, 3120],
        smooth: true,
        lineStyle: { width: 3, color: '#67c23a' },
        symbol: 'circle',
        symbolSize: 8,
        areaStyle: { opacity: 0.2, color: '#67c23a' },
      },
    ],
  });
});
</script>

<template>
  <EchartsUI ref="chartRef" style=" width: 100%;height: 400px" />
</template>
