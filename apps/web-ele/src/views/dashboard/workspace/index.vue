<script lang="ts" setup>
import DeviceStatus from './DeviceStatus.vue';
import OverviewCards from './OverviewCards.vue';
import QuickNav from './QuickNav.vue';
import RankingChart from './RankingChart.vue';
import TrendChart from './TrendChart.vue';
import UserCard from './UserCard.vue';
</script>

<template>
  <div
    class="h-full p-4 bg-[#F5F7FA] dark:bg-zinc-900 overflow-hidden flex gap-4"
  >
    <!-- ================= 左侧：固定面板 ================= -->
    <div
      class="w-[280px] xl:w-[310px] flex flex-col gap-4 shrink-0 h-full min-h-0"
    >
      <UserCard />
      <DeviceStatus />
      <QuickNav />
    </div>

    <!-- ================= 右侧主工作区 ================= -->
    <div class="flex-1 flex flex-col gap-4 min-w-0 h-full min-h-0">
      <OverviewCards />
      <div class="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 min-h-0 min-w-0">
        <TrendChart />
        <RankingChart />
      </div>
    </div>
  </div>
</template>
