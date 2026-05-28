<!-- components/DeviceStatus.vue -->
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
      data: ['在线设备', '离线设备', '故障设备'],
    },
    series: [
      {
        name: '设备状态',
        type: 'pie',
        radius: '55%',
        center: ['50%', '50%'],
        data: [
          { value: 142, name: '在线设备', itemStyle: { color: '#67c23a' } },
          { value: 8, name: '离线设备', itemStyle: { color: '#909399' } },
          { value: 6, name: '故障设备', itemStyle: { color: '#f56c6c' } },
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
