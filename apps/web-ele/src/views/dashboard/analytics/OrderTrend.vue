<!-- components/OrderTrend.vue -->
<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

onMounted(() => {
  renderEcharts({
    tooltip: { trigger: 'axis' },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      name: '订单数',
      splitLine: { lineStyle: { type: 'dashed' } },
    },
    series: [
      {
        data: [86, 92, 108, 125, 168, 210, 198],
        type: 'line',
        smooth: true,
        lineStyle: { width: 3, color: '#e6a23c' },
        areaStyle: { opacity: 0.3, color: '#e6a23c' },
        symbol: 'circle',
        symbolSize: 8,
      },
    ],
  });
});
</script>

<template>
  <EchartsUI ref="chartRef" style=" width: 100%;height: 300px" />
</template>
