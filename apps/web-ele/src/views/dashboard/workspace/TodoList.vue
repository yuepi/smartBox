<script lang="ts" setup>
import type { TodoData } from '#/api/common/workspace';

import { computed, onMounted, ref } from 'vue';

import { getTodoApi } from '#/api/common/workspace';

const loading = ref(false);
const todoData = ref<null | TodoData>(null);

async function fetchData() {
  loading.value = true;
  try {
    const res = await getTodoApi();
    todoData.value = res;
  } finally {
    loading.value = false;
  }
}

// 对应 9 个网格区块，包含图标与各自 Tooltip 提示
const items = computed(() => {
  const d = todoData.value || ({} as any);
  return [
    {
      title: '待审提现',
      count: d.pendingWithdrawCount ?? 1,
      path: '/finance/withdraw',
      hasIcon: false,
    },
    {
      title: '待审订单',
      count: d.pendingOrderCount ?? 179,
      path: '/order/pending',
      hasIcon: true,
      tooltip: '最近一个月',
    },
    {
      title: '预约上门',
      count: d.appointmentCount ?? 0,
      path: '/service/appointment',
      hasIcon: false,
    },
    {
      title: '满溢报警',
      count: d.overflowAlarmCount ?? 6,
      path: '/device/alarm',
      hasIcon: false,
    },
    {
      title: '打款失败',
      count: d.paymentFailedCount ?? 0,
      path: '/finance/failed',
      hasIcon: true,
      tooltip: '用户提现打款失败数量',
      highlight: true, // 保持选中的淡蓝底色
    },
    {
      title: '5公斤以上',
      count: d.over5kgCount ?? 752,
      path: '/order/over5kg',
      hasIcon: true,
      tooltip: '最近一个月',
    },
    {
      title: '异常订单',
      count: d.abnormalOrderCount ?? 9,
      path: '/order/abnormal',
      hasIcon: true,
      tooltip: '最近一个月',
    },
    {
      title: '超周上限',
      count: d.exceedWeeklyLimitCount ?? 0,
      path: '/user/exceed-limit',
      hasIcon: true,
      tooltip: '最近一个月',
    },
    {
      title: '周上限申请',
      count: d.weeklyLimitApplyCount ?? 0,
      path: '/user/limit-apply',
      hasIcon: false,
    },
  ];
});

onMounted(() => {
  fetchData();
});
</script>

<template>
  <div
    class="flex flex-col h-full min-h-0 w-full rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-zinc-700/80 dark:bg-zinc-800"
  >
    <!-- 顶栏区域 -->
    <div class="mb-3 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2">
        <span class="h-3.5 w-1 rounded-full bg-rose-500"></span>
        <span class="text-sm font-bold text-gray-800 dark:text-gray-100">
          待办事项
        </span>
      </div>
    </div>

    <!-- 3x3 九宫格：自动填满容器高度 -->
    <div class="grid flex-1 min-h-0 grid-cols-3 grid-rows-3 gap-3">
      <div
        v-for="(item, idx) in items"
        :key="idx"
        :class="[
          item.highlight
            ? 'bg-[#EBF6FF] dark:bg-blue-950/30'
            : 'bg-[#F6F8FB] dark:bg-zinc-700/30',
        ]"
        class="flex flex-col justify-center items-center rounded-xl p-2.5 transition-all hover:shadow-sm min-h-0 h-full w-full cursor-pointer"
      >
        <!-- 大数字 -->
        <div
          class="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-1"
        >
          {{ item.count }}
        </div>

        <!-- 名称与问号/感叹号图标 Tooltip -->
        <div
          class="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300"
        >
          <span>{{ item.title }}</span>

          <el-tooltip
            v-if="item.hasIcon"
            :content="item.tooltip"
            placement="top"
            effect="dark"
          >
            <el-icon
              class="text-gray-400 hover:text-gray-600 cursor-pointer text-xs"
            >
              <QuestionFilled />
            </el-icon>
          </el-tooltip>
        </div>
      </div>
    </div>
  </div>
</template>
