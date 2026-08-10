<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { getOverviewApi, type OverviewData } from '#/api/common/workspace';

const loading = ref(false);
const dateRange = ref<[string, string] | null>(null);
const overviewData = ref<null | OverviewData>(null);

async function fetchData() {
  loading.value = true;
  try {
    const params = dateRange.value
      ? { startTime: dateRange.value[0], endTime: dateRange.value[1] }
      : undefined;
    const res = await getOverviewApi(params);
    overviewData.value = res;
  } finally {
    loading.value = false;
  }
}

const cards = computed(() => {
  if (!overviewData.value) return [];
  const d = overviewData.value;
  return [
    { title: '今日投递 (KG)', today: d.todayDeliveryWeight ?? 0, yesterday: d.yesterdayDeliveryWeight ?? 0 },
    { title: '今日投递次数 (次)', today: d.todayDeliveryCount ?? 0, yesterday: d.yesterdayDeliveryCount ?? 0 },
    { title: '今日环保金 (元)', today: d.todayEarnings ?? 0, yesterday: d.yesterdayEarnings ?? 0 },
    { title: '清运袋数 (袋)', today: d.todayCleanBagCount ?? 0, yesterday: d.yesterdayCleanBagCount ?? 0 },
    { title: '用户提现 (元)', today: d.todayWithdrawAmount ?? 0, yesterday: d.yesterdayWithdrawAmount ?? 0 },
    { title: '新增会员 (人)', today: d.todayNewMemberCount ?? 0, yesterday: d.yesterdayNewMemberCount ?? 0 },
  ];
});

// 禁用超过今天的日期
const disabledDate = (time: Date) => {
  return time.getTime() > Date.now();
};

function getGrowth(today: number, yesterday: number) {
  if (!yesterday || yesterday === 0) return { text: '0.00%', isUp: true };
  const diff = ((today - yesterday) / yesterday) * 100;
  return {
    text: `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`,
    isUp: diff >= 0,
  };
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div class="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700/80 shrink-0">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <span class="w-1 h-3.5 bg-rose-500 rounded-full"></span>
        <span class="font-bold text-sm text-gray-800 dark:text-gray-100">实时概况</span>
        <span class="text-[11px] text-gray-400">默认最近7天数据</span>
      </div>
      <div class="flex items-center gap-2">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          start-placeholder="开始"
          end-placeholder="结束"
          :disabled-date="disabledDate"
          style="width: 240px;"
          value-format="YYYY-MM-DD"
          @change="fetchData"
        />
        <el-button type="primary" :loading="loading" @click="fetchData">刷新</el-button>
      </div>
    </div>

    <div class="grid grid-cols-3 xl:grid-cols-6 gap-3">
      <div
        v-for="(card, idx) in cards"
        :key="idx"
        class="bg-[#F8FAFC] dark:bg-zinc-700/30 p-2.5 rounded-lg border border-gray-100 dark:border-transparent"
      >
        <div class="flex justify-between items-center text-[11px] text-gray-400 mb-1">
          <span class="truncate">{{ card.title }}</span>
        </div>
        <div class="text-lg font-bold text-gray-800 dark:text-gray-100 my-0.5">{{ card.today }}</div>
        <div class="text-[10px] flex items-center justify-between text-gray-400">
          <span>昨日 {{ card.yesterday }}</span>
          <span :class="getGrowth(card.today, card.yesterday).isUp ? 'text-rose-500' : 'text-emerald-500'" class="font-semibold">
            {{ getGrowth(card.today, card.yesterday).text }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
