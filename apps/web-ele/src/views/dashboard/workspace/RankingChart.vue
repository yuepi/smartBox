<script lang="ts" setup>
import * as echarts from 'echarts';

import { getRankingApi } from '#/api/common/workspace';

const chartRef = ref<HTMLDivElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

const rankingConfig = {
  memberWeight: { name: '投递重量 (kg)', unit: 'kg' },
  memberCount: { name: '投递次数 (次)', unit: '次' },
  merchantWeight: { name: '投递重量 (kg)', unit: 'kg' },
};

const type = ref<'memberCount' | 'memberWeight' | 'merchantWeight'>(
  'memberWeight',
);
const dateRange = ref<[string, string] | null>(null);

// 禁用超过今天的日期
const disabledDate = (time: Date) => {
  return time.getTime() > Date.now();
};

async function fetchData() {
  const params: any = { type: type.value, limit: 15 };
  if (dateRange.value) {
    params.startTime = dateRange.value[0];
    params.endTime = dateRange.value[1];
  }

  const res = await getRankingApi(params);
  const list = res.rankingList || [];

  await nextTick();
  renderChart(list);
}

function renderChart(list: { name: string; phone: string; value: number }[]) {
  if (!chartRef.value) return;
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value);
  }

  const config = rankingConfig[type.value];
  const xData = list.map((item) => item.phone || item.name);
  const yData = list.map((item) => item.value);

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = params[0];
        return `${p.axisValue}<br/>${p.marker} ${p.seriesName}: ${p.value.toFixed(2)} ${config.unit}`;
      },
    },
    grid: {
      top: '12%',
      left: '2%',
      right: '3%',
      bottom: '12%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisTick: { alignWithLabel: true },
      axisLine: { lineStyle: { color: '#E5E7EB' } },
      axisLabel: {
        color: '#6B7280',
        fontSize: 10,
        formatter: (value: string) =>
          value.length > 8 ? `${value.slice(0, 8)}...` : value,
      },
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
        type: 'bar',
        barWidth: '40%',
        data: yData,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#3B82F6' },
            { offset: 1, color: '#93C5FD' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
        label: {
          show: true,
          position: 'top',
          color: '#6B7280',
          fontSize: 10,
          formatter: (params: any) => `${params.value.toFixed(1)}`,
        },
      },
    ],
  };

  chartInstance.setOption(option, true);
  chartInstance.resize();
}

watch([type, dateRange], fetchData);

onMounted(() => {
  fetchData();
  const observer = new ResizeObserver(() => chartInstance?.resize());
  if (chartRef.value) observer.observe(chartRef.value);
});

onUnmounted(() => {
  chartInstance?.dispose();
});
</script>

<template>
  <div
    class="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700/80 flex flex-col min-h-0 min-w-0"
  >
    <div
      class="flex items-center justify-between mb-2 shrink-0 gap-2 flex-wrap"
    >
      <div class="flex items-center gap-1.5 shrink-0">
        <span class="w-1 h-3.5 bg-rose-500 rounded-full"></span>
        <span class="font-bold text-sm text-gray-800 dark:text-gray-100"
          >聚合排行榜</span
        >
      </div>
      <div class="flex items-center gap-2 flex-wrap justify-end">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="-"
          start-placeholder="开始"
          end-placeholder="结束"
          :disabled-date="disabledDate"
          value-format="YYYY-MM-DD"
          style="width: 220px"
          @change="fetchData"
        />
        <el-select v-model="type" style="width: 150px">
          <el-option label="会员投递重量榜" value="memberWeight" />
          <el-option label="会员投递次数榜" value="memberCount" />
          <el-option label="商户投递重量榜" value="merchantWeight" />
        </el-select>
      </div>
    </div>
    <div class="relative flex-1 min-h-0 w-full">
      <div ref="chartRef" class="absolute inset-0 w-full h-full"></div>
    </div>
  </div>
</template>
