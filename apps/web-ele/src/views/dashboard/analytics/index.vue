<!-- views/dashboard/analytics/index.vue -->
<script setup lang="ts">

import { AnalysisChartCard, AnalysisChartsTabs } from "@vben/common-ui";

import CategoryDistribution from "./CategoryDistribution.vue";
import DeliveryTrends from "./DeliveryTrends.vue";
import DeviceStatus from "./DeviceStatus.vue";
import OrderTrend from "./OrderTrend.vue";
import OverviewCards from "./OverviewCards.vue";
import RecycleAnalysis from "./RecycleAnalysis.vue";

// Tab 配置
const chartTabs = [
  { label: "投递趋势", value: "trends" },
  { label: "回收分析", value: "recycle" },
];
</script>

<template>
  <div class="p-5">
    <!-- 概览卡片 -->
    <OverviewCards />

    <!-- Tab 切换 -->
    <div class="mt-5 w-full md:flex">
      <AnalysisChartsTabs :tabs="chartTabs" class="mt-5">
        <template #trends>
          <DeliveryTrends />
        </template>
        <template #recycle>
          <RecycleAnalysis />
        </template>
      </AnalysisChartsTabs>
      <AnalysisChartsTabs :tabs="chartTabs" class="mt-5">
        <template #trends>
          <DeliveryTrends />
        </template>
        <template #recycle>
          <RecycleAnalysis />
        </template>
      </AnalysisChartsTabs>
    </div>

    <!-- 底部三列图表 -->
    <div class="mt-5 w-full md:flex">
      <AnalysisChartCard
        class="mt-5 md:mt-0 md:mr-4 md:w-1/3"
        title="设备状态分布"
      >
        <DeviceStatus />
      </AnalysisChartCard>
      <AnalysisChartCard
        class="mt-5 md:mt-0 md:mr-4 md:w-1/3"
        title="投递品类分布"
      >
        <CategoryDistribution />
      </AnalysisChartCard>
      <AnalysisChartCard class="mt-5 md:mt-0 md:w-1/3" title="近7日订单趋势">
        <OrderTrend />
      </AnalysisChartCard>
    </div>
  </div>
</template>
