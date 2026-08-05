<script lang="ts" setup>
import type { WorkbenchQuickNavItem } from '@vben/common-ui';

import type { DeviceStatusData, OverviewData, RankingItem } from '#/api/common/workspace'; 

import {
  WorkbenchHeader,
  WorkbenchQuickNav,
} from '@vben/common-ui';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';
import { openWindow } from '@vben/utils';

import * as echarts from 'echarts';

import { getDataTrendApi, getDeviceStatusApi, getOverviewApi, getRankingApi } from '#/api/common/workspace';

const userStore = useUserStore();
const router = useRouter();

// ==================== 1. 快捷导航数据 ====================
const quickNavItems: WorkbenchQuickNavItem[] = [
  { color: '#e18525', icon: 'ion:layers-outline', title: '设备管理', url: '/device' },
  { color: '#3fb27f', icon: 'ion:settings-outline', title: '回收订单', url: '/recycleOrder' },
  { color: '#4daf1bc9', icon: 'ion:key-outline', title: '用户管理', url: '/user' },
  { color: '#00d8ff', icon: 'ion:bar-chart-outline', title: '提现审核', url: '/withdraw' },
  { color: '#e18525', icon: 'ion:layers-outline', title: '计费套餐', url: '/devicePackage' },
];

function navTo(nav: WorkbenchQuickNavItem) {
  if (nav.url?.startsWith('http')) {
    openWindow(nav.url);
    return;
  }
  if (nav.url?.startsWith('/')) {
    router.push(nav.url).catch((error) => console.error(error));
  }
}

// ==================== 2. 实时概况 (时间筛选) ====================
const overviewLoading = ref(false);
const overviewDateRange = ref<[string, string] | null>(null);
const overviewData = ref<null | OverviewData>(null);

// 获取实时概况
async function fetchOverview() {
  overviewLoading.value = true;
  try {
    const params = overviewDateRange.value
      ? { startTime: overviewDateRange.value[0], endTime: overviewDateRange.value[1] }
      : undefined;
    const res = await getOverviewApi(params);
    overviewData.value = res;
  } finally {
    overviewLoading.value = false;
  }
}

// 指标卡片格式化配置
const overviewCards = computed(() => {
  if (!overviewData.value) return [];
  const d = overviewData.value;
  return [
    { title: '投递重量 (kg)', today: d.todayDeliveryWeight, yesterday: d.yesterdayDeliveryWeight, color: '#10B981', icon: 'ep:scale-to-original' },
    { title: '投递次数 (次)', today: d.todayDeliveryCount, yesterday: d.yesterdayDeliveryCount, color: '#3B82F6', icon: 'ep:box' },
    { title: '环保金发放 (元)', today: d.todayEarnings, yesterday: d.yesterdayEarnings, color: '#F59E0B', icon: 'ep:coin' },
    { title: '清运袋数 (袋)', today: d.todayCleanBagCount, yesterday: d.yesterdayCleanBagCount, color: '#8B5CF6', icon: 'ep:takeaway-box' },
    { title: '用户提现 (元)', today: d.todayWithdrawAmount, yesterday: d.yesterdayWithdrawAmount, color: '#EC4899', icon: 'ep:wallet' },
    { title: '新增会员 (人)', today: d.todayNewMemberCount, yesterday: d.yesterdayNewMemberCount, color: '#06B6D4', icon: 'ep:user-plus' },
  ];
});

// 计算环比变动
function getGrowth(today: number, yesterday: number) {
  if (!yesterday || yesterday === 0) return { text: '0%', isUp: true };
  const diff = ((today - yesterday) / yesterday) * 100;
  return {
    text: `${Math.abs(diff).toFixed(1)}%`,
    isUp: diff >= 0,
  };
}

// ==================== 3. 聚合数据趋势 (图表) ====================
const trendType = ref<'count' | 'earnings' | 'weight'>('weight');
const trendRangeDays = ref<number>(7);
const trendChartRef = ref<HTMLDivElement | null>(null);
let trendChartInstance: echarts.ECharts | null = null;

async function fetchTrendData() {
  const res = await getDataTrendApi({ type: trendType.value, rangeDays: trendRangeDays.value });
  renderTrendChart(res.trendList || []);
}

function renderTrendChart(list: Array<{ date: string; value: number }>) {
  if (!trendChartRef.value) return;
  if (!trendChartInstance) {
    trendChartInstance = echarts.init(trendChartRef.value);
  }

  const xData = list.map((item) => item.date);
  const yData = list.map((item) => item.value);

  const typeMap = {
    weight: { name: '投递重量 (kg)', color: '#10B981' },
    count: { name: '投递次数 (次)', color: '#3B82F6' },
    earnings: { name: '环保金 (元)', color: '#F59E0B' },
  };

  const currentMeta = typeMap[trendType.value];

  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: xData },
    yAxis: { type: 'value' },
    series: [
      {
        name: currentMeta.name,
        type: 'line',
        smooth: true,
        data: yData,
        itemStyle: { color: currentMeta.color },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${currentMeta.color}66` },
            { offset: 1, color: `${currentMeta.color}00` },
          ]),
        },
      },
    ],
  };

  trendChartInstance.setOption(option);
}

// ==================== 4. 设备状态概览 ====================
const deviceData = ref<DeviceStatusData>({ deviceTotal: 0, onlineCount: 0, offlineCount: 0 });

async function fetchDeviceStatus() {
  const res = await getDeviceStatusApi();
  deviceData.value = res;
}

const onlineRate = computed(() => {
  if (!deviceData.value.deviceTotal) return 0;
  return ((deviceData.value.onlineCount / deviceData.value.deviceTotal) * 100).toFixed(1);
});

// ==================== 5. 排行榜 ====================
const rankingType = ref<'memberCount' | 'memberWeight' | 'merchantWeight'>('memberWeight');
const rankingList = ref<RankingItem[]>([]);
const rankingLoading = ref(false);

async function fetchRanking() {
  rankingLoading.value = true;
  try {
    const res = await getRankingApi({ type: rankingType.value, limit: 8 });
    rankingList.value = res.rankingList || [];
  } finally {
    rankingLoading.value = false;
  }
}

// 初始化
onMounted(() => {
  fetchOverview();
  fetchTrendData();
  fetchDeviceStatus();
  fetchRanking();

  window.addEventListener('resize', () => {
    trendChartInstance?.resize();
  });
});

watch([trendType, trendRangeDays], fetchTrendData);
watch(rankingType, fetchRanking);
</script>

<template>
  <div class="p-5 space-y-5 bg-gray-50/50 dark:bg-zinc-900 min-h-screen">
    <!-- 1. 头部问候 -->
    <WorkbenchHeader :avatar="userStore.userInfo?.avatar || preferences.app.defaultAvatar">
      <template #title>
        早安，{{ userStore.userInfo?.realName || '管理员' }}，欢迎使用智慧循环回收平台！
      </template>
      <template #description>
        今天又是充满绿色的活力一天，共创数字低碳生态！
      </template>
    </WorkbenchHeader>

    <!-- 2. 快捷导航 + 设备状态概览 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <!-- 快捷导航 (占 2 列) -->
      <div class="lg:col-span-2">
        <WorkbenchQuickNav :items="quickNavItems" title="快捷导航" @click="navTo" />
      </div>

      <!-- 设备状态卡片 (占 1 列) -->
      <div class="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm flex flex-col justify-between">
        <div class="flex justify-between items-center mb-3">
          <span class="font-bold text-base text-gray-800 dark:text-gray-100">设备运行状态</span>
          <el-tag type="success" size="small" round>在线率 {{ onlineRate }}%</el-tag>
        </div>

        <div class="grid grid-cols-3 gap-2 text-center my-2">
          <div class="bg-gray-50 dark:bg-zinc-700/50 p-2 rounded-lg">
            <div class="text-xs text-gray-400">总设备</div>
            <div class="text-xl font-bold text-gray-800 dark:text-gray-100 mt-1">{{ deviceData.deviceTotal }}</div>
          </div>
          <div class="bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg">
            <div class="text-xs text-emerald-600 dark:text-emerald-400">在线设备</div>
            <div class="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{{ deviceData.onlineCount }}</div>
          </div>
          <div class="bg-rose-50 dark:bg-rose-950/30 p-2 rounded-lg">
            <div class="text-xs text-rose-500">离线设备</div>
            <div class="text-xl font-bold text-rose-500 mt-1">{{ deviceData.offlineCount }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. 实时概况指标卡片（含时间筛选） -->
    <div class="bg-white dark:bg-zinc-800 p-5 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm">
      <div class="flex flex-wrap justify-between items-center mb-4 gap-3">
        <div class="flex items-center gap-2">
          <span class="font-bold text-lg text-gray-800 dark:text-gray-100">实时业务概况</span>
          <span class="text-xs text-gray-400">平台核心数据监控</span>
        </div>
        <!-- 时间筛选组件 -->
        <div class="flex items-center gap-2">
          <el-date-picker
            v-model="overviewDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            size="small"
            @change="fetchOverview"
          />
          <el-button type="primary" size="small" :loading="overviewLoading" @click="fetchOverview">刷新</el-button>
        </div>
      </div>

      <!-- 6大指标 Cards 栅格布局 -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div
          v-for="(card, index) in overviewCards"
          :key="index"
          class="p-4 rounded-xl border border-gray-100 dark:border-zinc-700/60 bg-gradient-to-br from-white to-gray-50/50 dark:from-zinc-800 dark:to-zinc-800/50 hover:shadow-md transition-all"
        >
          <div class="text-xs text-gray-400 mb-1">{{ card.title }}</div>
          <div class="text-2xl font-black text-gray-800 dark:text-gray-100 my-1">
            {{ card.today }}
          </div>
          <div class="flex items-center justify-between text-xs mt-2">
            <span class="text-gray-400">较昨日</span>
            <span :class="getGrowth(card.today, card.yesterday).isUp ? 'text-emerald-500' : 'text-rose-500'" class="font-bold">
              {{ getGrowth(card.today, card.yesterday).isUp ? '↑' : '↓' }} {{ getGrowth(card.today, card.yesterday).text }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. 聚合数据趋势 + 垃圾回收排行榜 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <!-- 趋势图表 (占 2 列) -->
      <div class="lg:col-span-2 bg-white dark:bg-zinc-800 p-5 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm">
        <div class="flex flex-wrap justify-between items-center mb-4 gap-2">
          <span class="font-bold text-base text-gray-800 dark:text-gray-100">数据趋势走势</span>
          <div class="flex items-center gap-3">
            <!-- 指标类型切换 -->
            <el-radio-group v-model="trendType" size="small">
              <el-radio-button label="weight">投递重量</el-radio-button>
              <el-radio-button label="count">投递次数</el-radio-button>
              <el-radio-button label="earnings">环保金</el-radio-button>
            </el-radio-group>
            <!-- 7/15/30天范围切换 -->
            <el-radio-group v-model="trendRangeDays" size="small">
              <el-radio-button :label="7">近7天</el-radio-button>
              <el-radio-button :label="15">近15天</el-radio-button>
              <el-radio-button :label="30">近30天</el-radio-button>
            </el-radio-group>
          </div>
        </div>
        <!-- ECharts 挂载容器 -->
        <div ref="trendChartRef" class="w-full h-80"></div>
      </div>

      <!-- 排行榜 (占 1 列) -->
      <div class="bg-white dark:bg-zinc-800 p-5 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm flex flex-col">
        <div class="flex justify-between items-center mb-4">
          <span class="font-bold text-base text-gray-800 dark:text-gray-100">回收排行榜 TOP</span>
        </div>

        <!-- 切换榜单类型 -->
        <div class="mb-3">
          <el-segmented
            v-model="rankingType"
            :options="[
              { label: '会员重量', value: 'memberWeight' },
              { label: '会员次数', value: 'memberCount' },
              { label: '商户重量', value: 'merchantWeight' },
            ]"
            block
            size="small"
          />
        </div>

        <!-- 榜单列表 -->
        <div v-loading="rankingLoading" class="flex-1 overflow-y-auto space-y-3">
          <div
            v-for="(item, idx) in rankingList"
            :key="idx"
            class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700/40 transition-colors"
          >
            <div class="flex items-center gap-3">
              <!-- 1, 2, 3 名特殊高亮图标 -->
              <span
                class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs"
                :class="{
                  'bg-amber-400 text-white': item.rank === 1,
                  'bg-slate-300 text-white': item.rank === 2,
                  'bg-amber-600 text-white': item.rank === 3,
                  'bg-gray-100 dark:bg-zinc-700 text-gray-500': item.rank > 3,
                }"
              >
                {{ item.rank }}
              </span>
              <div>
                <div class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ item.name }}</div>
                <div class="text-xs text-gray-400">{{ item.phone }}</div>
              </div>
            </div>
            <div class="text-right">
              <span class="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{{ item.value }}</span>
              <span class="text-xs text-gray-400 ml-1">
                {{ rankingType.includes('Count') ? '次' : 'kg' }}
              </span>
            </div>
          </div>

          <el-empty v-if="rankingList.length === 0" description="暂无排行数据" image-size="60" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 针对图表及容器做渐变/边框细节修饰 */
</style>
