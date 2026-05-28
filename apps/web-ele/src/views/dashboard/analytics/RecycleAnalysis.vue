<!-- components/RecycleAnalysis.vue -->
<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

onMounted(() => {
  renderEcharts({
    tooltip: { trigger: 'axis' },
    legend: {
      data: ['回收金额(元)', '订单数量'],
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
        name: '金额(元)',
        splitLine: { lineStyle: { type: 'dashed' } },
      },
      {
        type: 'value',
        name: '订单数',
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '回收金额(元)',
        type: 'line',
        data: [12_500, 15_800, 19_600, 23_100, 30_400, 37_800, 42_900, 45_800, 49_500, 54_600, 60_500, 68_600],
        smooth: true,
        lineStyle: { width: 3, color: '#e6a23c' },
        symbol: 'circle',
        symbolSize: 8,
        areaStyle: { opacity: 0.3, color: '#e6a23c' },
      },
      {
        name: '订单数量',
        type: 'bar',
        yAxisIndex: 1,
        data: [320, 380, 450, 520, 680, 850, 920, 980, 1020, 1150, 1280, 1450],
        itemStyle: { borderRadius: [4, 4, 0, 0], color: '#409eff' },
      },
    ],
  });
});
</script>

<template>
  <EchartsUI ref="chartRef" style=" width: 100%;height: 400px" />
</template>
