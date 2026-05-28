<!-- components/CategoryDistribution.vue -->
<script setup lang="ts">
import type { EchartsUIType } from '@vben/plugins/echarts';

import { onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

onMounted(() => {
  renderEcharts({
    tooltip: { trigger: 'item' },
    legend: {
      orient: 'vertical',
      left: 'left',
      data: ['塑料', '金属', '织物', '混合'],
    },
    series: [
      {
        name: '投递品类',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '50%'],
        data: [
          { value: 45, name: '塑料', itemStyle: { color: '#409eff' } },
          { value: 28, name: '金属', itemStyle: { color: '#e6a23c' } },
          { value: 15, name: '织物', itemStyle: { color: '#67c23a' } },
          { value: 12, name: '混合', itemStyle: { color: '#909399' } },
        ],
        emphasis: { scale: true },
        label: { show: true, formatter: '{b}: {d}%' },
      },
    ],
  });
});
</script>

<template>
  <EchartsUI ref="chartRef" style=" width: 100%;height: 300px" />
</template>
