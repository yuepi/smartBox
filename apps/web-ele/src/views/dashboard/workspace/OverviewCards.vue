<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { getOverviewApi } from '#/api/common/workspace';

const loading = ref(false);
const dateRange = ref<[string, string] | null>(null);
const overviewData = ref<any>(null);

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
    {
      title: '今日总投递 (KG)',
      today: d.todayDeliveryWeight ?? 97.51,
      yesterday: d.yesterdayDeliveryWeight ?? 520.24,
    },
    {
      title: '今日投递次数 (次)',
      today: d.todayDeliveryCount ?? 26,
      yesterday: d.yesterdayDeliveryCount ?? 174,
    },
    {
      title: '今日产生环保金 (元)',
      today: d.todayEarnings ?? 48.89,
      yesterday: d.yesterdayEarnings ?? 262.86,
    },
    {
      title: '清运包数',
      today: d.todayCleanBagCount ?? 7,
      yesterday: d.yesterdayCleanBagCount ?? 18,
    },
    {
      title: '今日提现环保金 (元)',
      today: d.todayWithdrawAmount ?? 11.52,
      yesterday: d.yesterdayWithdrawAmount ?? 192.68,
    },
    {
      title: '今日参与会员',
      today: d.totalMemberCount ?? 22,
      yesterday: d.yesterdayMemberCount ?? 139,
    },
    {
      title: '今日新增会员',
      today: d.todayNewMemberCount ?? 4,
      yesterday: d.yesterdayNewMemberCount ?? 24,
    },
    {
      title: '清运重量(KG)',
      today: d.todayCleanWeight ?? 136.04,
      yesterday: d.yesterdayCleanWeight ?? 464.57,
    },
  ];
});

// 禁用超过今天的日期
const disabledDate = (time: Date) => {
  return time.getTime() > Date.now();
};

function getGrowth(today: number, yesterday: number) {
  if (!yesterday || yesterday === 0) return { isUp: true, text: '0.00%' };
  const diff = ((today - yesterday) / yesterday) * 100;
  return {
    isUp: diff >= 0,
    text: `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`,
  };
}

// 格式化数值保留两位小数
function formatNum(num: number) {
  return (num ?? 0).toFixed(2);
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div
    class="flex flex-col h-full min-h-0 w-full rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800"
  >
    <!-- 头部筛选区：尺寸收紧，不占多余高度 -->
    <div class="mb-3 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2">
        <span class="h-3.5 w-1 rounded-full bg-rose-500"></span>
        <span class="text-base font-bold text-gray-800 dark:text-gray-100">
          实时概况
        </span>
        <span class="text-[11px] text-gray-400">更新于 2026-09-15 10:27:19</span>
      </div>
      <div class="flex items-center gap-2">
        <el-date-picker
          v-model="dateRange"
          :disabled-date="disabledDate"
          end-placeholder="结束"
          start-placeholder="开始"
          style="width: 240px"
          type="daterange"
          value-format="YYYY-MM-DD"
          @change="fetchData"
        />
        <el-button :loading="loading" type="primary" @click="fetchData">
          刷新
        </el-button>
      </div>
    </div>

    <!-- 核心网格布局：给 grid 容器加 flex-1 h-full，让卡片纵向均分撑满整个盒子 -->
    <div
      class="grid flex-1 min-h-0 grid-cols-2 gap-3 lg:grid-cols-4 grid-rows-2"
    >
      <div
        v-for="(card, idx) in cards"
        :key="idx"
        class="flex h-full w-full justify-between rounded-xl bg-[#F6F8FB] p-3.5 dark:bg-zinc-700/30 min-h-0 overflow-hidden"
      >
        <!-- 左侧：标题、超级大数字、较昨日增长 -->
        <div class="flex flex-col justify-between h-full min-h-0">
          <span
            class="text-base font-normal text-gray-600 dark:text-gray-300 truncate"
          >
            {{ card.title }}
          </span>

          <div
            class="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight"
          >
            {{ formatNum(card.today) }}
          </div>

          <div class="text-[14px] shrink-0">
            <span
              :class="
                getGrowth(card.today, card.yesterday).isUp
                  ? 'text-emerald-500'
                  : 'text-emerald-500'
              "
              class="font-medium"
            >
              较昨日 {{ getGrowth(card.today, card.yesterday).text }}
            </span>
          </div>
        </div>

        <!-- 右侧：昨日标识与昨日数值 -->
        <div
          class="flex flex-col justify-between items-end h-full text-xs text-gray-400 shrink-0"
        >
          <span class="text-xs text-gray-500 dark:text-gray-400">昨日</span>
          <span class="text-xs text-gray-400 font-medium">
            {{ formatNum(card.yesterday) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
