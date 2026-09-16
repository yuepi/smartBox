<script lang="ts" setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

import * as echarts from 'echarts';

import { getDataTrendApi } from '#/api/common/workspace';

const chartRef = ref<HTMLDivElement | null>(null);
let chartInstance: echarts.ECharts | null = null;
let resizeObserver: null | ResizeObserver = null;

const typeConfig = {
  weight: { name: '投递重量 (kg)', color: '#EF4444', unit: 'kg' },
  count: { name: '投递次数 (次)', color: '#3B82F6', unit: '次' },
  earnings: { name: '环保金 (元)', color: '#F59E0B', unit: '元' },
};

const type = ref<'count' | 'earnings' | 'weight'>('weight');
const rangeDays = ref<number>(7);
const dateRange = ref<[string, string] | null>(null);
const totalValue = ref<number>(0);

async function fetchData() {
  const params: any = { type: type.value, rangeDays: rangeDays.value };
  if (dateRange.value) {
    params.startTime = dateRange.value[0];
    params.endTime = dateRange.value[1];
  }

  const res = await getDataTrendApi(params);
  const list = res.trendList || [];
  totalValue.value = list.reduce((acc, cur) => acc + (cur.value || 0), 0);

  await nextTick();
  setTimeout(() => {
    renderChart(list);
  }, 0);
}

function renderChart(list: { date: string; value: number }[]) {
  if (!chartRef.value) return;
  if (chartRef.value.clientHeight === 0) return;

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }

  const config = typeConfig[type.value];
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0];
        return `${p.axisValue}<br/>${p.marker} ${p.seriesName}: ${p.value.toFixed(2)} ${config.unit}`;
      },
    },
    grid: {
      top: '5%',
      left: '2%',
      right: '3%',
      bottom: '5%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: list.map((item) => item.date),
      axisLine: { lineStyle: { color: '#E5E7EB' } },
      axisLabel: { color: '#9CA3AF', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: config.unit,
      nameTextStyle: { color: '#9CA3AF', fontSize: 11 },
      splitLine: { lineStyle: { type: 'dashed', color: '#F3F4F6' } },
      axisLabel: {
        color: '#9CA3AF',
        fontSize: 11,
        formatter: (value: number) => `${value.toFixed(0)}`,
      },
    },
    series: [
      {
        name: config.name,
        type: 'line',
        smooth: true,
        symbolSize: 6,
        data: list.map((item) => item.value),
        itemStyle: { color: config.color },
        lineStyle: { width: 3, color: config.color },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${config.color}44` },
            { offset: 1, color: `${config.color}00` },
          ]),
        },
      },
    ],
  };

  chartInstance.setOption(option, true);
  chartInstance.resize();
}

watch([type, rangeDays, dateRange], fetchData);

onMounted(() => {
  fetchData();
  if (chartRef.value) {
    resizeObserver = new ResizeObserver(() => chartInstance?.resize());
    resizeObserver.observe(chartRef.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  chartInstance?.dispose();
  chartInstance = null;
});
</script>

<template>
  <div
    class="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700/80 flex flex-col h-full min-h-0 min-w-0 overflow-hidden"
  >
    <div
      class="flex items-center justify-between mb-2 shrink-0 gap-2 flex-wrap"
    >
      <div class="flex items-center gap-1.5 shrink-0">
        <span class="w-1 h-3.5 bg-rose-500 rounded-full"></span>
        <span
          class="font-bold text-sm text-gray-800 dark:text-gray-100 truncate"
          >聚合数据概览</span>
      </div>
      <div class="flex items-center gap-2 flex-wrap justify-end">
        <el-select v-model="type" style="width: 100px">
          <el-option label="投递重量" value="weight" />
          <el-option label="投递次数" value="count" />
          <el-option label="环保金" value="earnings" />
        </el-select>
        <el-radio-group v-model="rangeDays">
          <el-radio-button :value="7">7天</el-radio-button>
          <el-radio-button :value="15">15天</el-radio-button>
          <el-radio-button :value="30">30天</el-radio-button>
        </el-radio-group>
      </div>
    </div>
    <div class="text-xs text-gray-400 mb-1 shrink-0">
      {{ rangeDays }}天{{ typeConfig[type].name }}总计:
      <strong class="text-gray-800 dark:text-gray-200 text-sm ml-1">{{
        totalValue.toFixed(2)
      }}</strong>
      {{ typeConfig[type].unit }}
    </div>
    <!-- 去除 relative/absolute，直接使用 flex-1 撑开容器 -->
    <div class="flex-1 w-full min-h-0 min-w-0">
      <div ref="chartRef" class="w-full h-full"></div>
    </div>
  </div>
</template>
