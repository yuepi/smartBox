<script lang="ts" setup>
import DeviceStatus from './DeviceStatus.vue';
import OverviewCards from './OverviewCards.vue';
import QuickNav from './QuickNav.vue';
import RankingChart from './RankingChart.vue';
import TodoList from './TodoList.vue';
import TrendChart from './TrendChart.vue';
import UserCard from './UserCard.vue';
</script>

<template>
  <div class="h-full p-4 bg-[#F5F7FA] dark:bg-zinc-900 overflow-hidden flex flex-col gap-4">
    <!-- 上半部分：占 4 份 (小屏自适应列宽) -->
    <div class="flex-[4] grid grid-cols-12 gap-4 min-h-0">
      <!-- 左上：用户信息 (大屏 3 列 / 超大屏 2 列) -->
      <div class="col-span-12 md:col-span-3 xl:col-span-2 min-h-0">
        <UserCard />
      </div>

      <!-- 中间：实时概况 (大屏 6 列 / 超大屏 7 列) -->
      <div class="col-span-12 md:col-span-6 xl:col-span-7 min-h-0">
        <OverviewCards />
      </div>

      <!-- 右上：待办事项 -->
      <div class="col-span-12 md:col-span-3 xl:col-span-3 min-h-0">
        <TodoList />
      </div>
    </div>

    <!-- 下半部分：占 6 份 (恢复标准 12 列网格，兼顾适配性) -->
    <div class="flex-[6] grid grid-cols-12 gap-4 min-h-0">
      <!-- 左下：设备状态 + 常用功能 (小屏 4 列 / 大屏 3 列 / 2xl屏 2.5列感) -->
      <div class="col-span-12 md:col-span-4 lg:col-span-3 xl:col-span-3 2xl:col-span-3 flex flex-col gap-4 min-h-0">
        <DeviceStatus class="shrink-0" />
        <QuickNav class="flex-1 min-h-0" />
      </div>

      <!-- 中下：聚合数据概览 -->
      <div class="col-span-12 md:col-span-8 lg:col-span-5 xl:col-span-5 2xl:col-span-5 min-h-0">
        <TrendChart />
      </div>

      <!-- 右下：聚合排行榜 -->
      <div class="col-span-12 md:col-span-12 lg:col-span-4 xl:col-span-4 2xl:col-span-4 min-h-0">
        <RankingChart />
      </div>
    </div>
  </div>
</template>
