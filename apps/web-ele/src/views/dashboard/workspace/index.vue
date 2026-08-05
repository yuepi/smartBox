<script lang="ts" setup>
import type { DeviceStatusData, OverviewData } from '#/api/common/workspace';

import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';

const { hasAccessByCodes } = useAccess();

import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';
import { openWindow } from '@vben/utils';

// 引入 Element Plus 图标组件
import { Cpu, Document, Tickets, Wallet } from '@element-plus/icons-vue';
// 引入原生 ECharts
import * as echarts from 'echarts';

import { getDataTrendApi, getDeviceStatusApi, getOverviewApi, getRankingApi } from '#/api/common/workspace';

const userStore = useUserStore();
const router = useRouter();

// ==================== 1. 真实 Store 数据对接 ====================
const currentMerchantInfo = computed(() => {
  return userStore.userInfo?.userMerchant?.find(
    (m: any) => m.merchantId === userStore.userInfo?.merchantId
  );
});

const roleName = computed(() => {
  if (userStore.userInfo?.superAdminFlag === 1) return '超级管理员';
  return userStore.userInfo?.realName || '运营商';
});

const merchantStatus = computed(() => {
  return currentMerchantInfo.value?.status === 0
    ? { text: '正常', type: 'success' }
    : { text: '停用', type: 'danger' };
});

// 过滤有权限的菜单
const filteredNavItems = computed(() => {
  return quickNavItems.filter((item) => {
    if (!item.authority?.length) return true;
    return item.authority.some((code) => hasAccessByCodes([code]));
  });
});

// ==================== 2. 常用功能 ====================
const quickNavItems = [
  { title: '设备管理', url: '/device', icon: Cpu, color: '#10B981', authority: ['merchant:manage:device'] },
  { title: '设备配置', url: '/deviceConfig', icon: Tickets, color: '#EC4899', authority: ['merchant:device:config'] },
  { title: '计费套餐', url: '/devicePackage', icon: Tickets, color: '#EC4899', authority: ['merchant:device:package'] },
  { title: '二维码', url: '/qrcode', icon: Tickets, color: '#EC4899', authority: ['merchant:qrcode'] },
  { title: '回收订单', url: '/recycleOrder', icon: Document, color: '#3B82F6', authority: ['merchant:recycle:order'] },
  { title: '清运任务', url: '/cleanTask', icon: Tickets, color: '#EC4899', authority: ['merchant:recycle:cleanTask'] },
  { title: '分拣任务', url: '/sortTask', icon: Tickets, color: '#EC4899', authority: ['merchant:recycle:sortTask'] },
  { title: '会员列表', url: '/member', icon: Tickets, color: '#EC4899', authority: ['merchant:member:list'] },
  { title: '提现审核', url: '/withdraw', icon: Wallet, color: '#F59E0B', authority: ['merchant:member:withdraw'] },
];

function navTo(url: string) {
  if (url.startsWith('http')) {
    openWindow(url);
    return;
  }
  if (url.startsWith('/')) {
    router.push(url).catch((error) => console.error(error));
  }
}

// ==================== 3. 实时概况 ====================
const overviewLoading = ref(false);
const overviewDateRange = ref<[string, string] | null>(null);
const overviewData = ref<null | OverviewData>(null);

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

const overviewCards = computed(() => {
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

function getGrowth(today: number, yesterday: number) {
  if (!yesterday || yesterday === 0) return { text: '0.00%', isUp: true };
  const diff = ((today - yesterday) / yesterday) * 100;
  return {
    text: `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`,
    isUp: diff >= 0,
  };
}

// ==================== 4. 图表统一管理 ====================
// 类型映射配置
const typeConfig = {
  weight: { name: '投递重量 (kg)', color: '#EF4444', unit: 'kg' },
  count: { name: '投递次数 (次)', color: '#3B82F6', unit: '次' },
  earnings: { name: '环保金 (元)', color: '#F59E0B', unit: '元' },
};

const rankingConfig = {
  memberWeight: { name: '投递重量 (kg)', unit: 'kg' },
  memberCount: { name: '投递次数 (次)', unit: '次' },
  merchantWeight: { name: '投递重量 (kg)', unit: 'kg' },
};

// 趋势图
const trendType = ref<'count' | 'earnings' | 'weight'>('weight');
const trendRangeDays = ref<number>(7);
const trendDateRange = ref<[string, string] | null>(null);
const trendChartRef = ref<HTMLDivElement | null>(null);
let trendChartInstance: echarts.ECharts | null = null;
const totalTrendValue = ref<number>(0);

// 排行榜
const rankingType = ref<'memberCount' | 'memberWeight' | 'merchantWeight'>('memberWeight');
const rankingDateRange = ref<[string, string] | null>(null);
const rankingChartRef = ref<HTMLDivElement | null>(null);
let rankingChartInstance: echarts.ECharts | null = null;

// ResizeObserver
let resizeObserver: null | ResizeObserver = null;

function initResizeObserver() {
  resizeObserver = new ResizeObserver(() => {
    trendChartInstance?.resize();
    rankingChartInstance?.resize();
  });
  if (trendChartRef.value) resizeObserver.observe(trendChartRef.value);
  if (rankingChartRef.value) resizeObserver.observe(rankingChartRef.value);
}

// ===== 趋势图渲染 =====
async function fetchTrendData() {
  const params: any = {
    type: trendType.value,
    rangeDays: trendRangeDays.value
  };

  if (trendDateRange.value) {
    params.startTime = trendDateRange.value[0];
    params.endTime = trendDateRange.value[1];
  }

  const res = await getDataTrendApi(params);
  const list = res.trendList || [];
  totalTrendValue.value = list.reduce((acc, cur) => acc + (cur.value || 0), 0);

  await nextTick();
  renderTrendChart(list);
}

function renderTrendChart(list: { date: string; value: number }[]) {
  if (!trendChartRef.value) return;

  if (!trendChartInstance) {
    trendChartInstance = echarts.init(trendChartRef.value);
  }

  const xData = list.map((item) => item.date);
  const yData = list.map((item) => item.value);
  const config = typeConfig[trendType.value];

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0];
        return `${p.axisValue}<br/>${p.marker} ${p.seriesName}: ${p.value.toFixed(2)} ${config.unit}`;
      }
    },
    grid: { top: '12%', left: '2%', right: '3%', bottom: '8%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xData,
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
        formatter: (value: number) => `${value.toFixed(0)}`
      },
    },
    series: [
      {
        name: config.name,
        type: 'line',
        smooth: true,
        symbolSize: 6,
        data: yData,
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

  trendChartInstance.setOption(option, true);
  trendChartInstance.resize();
}

// ===== 排行榜渲染 =====
async function fetchRanking() {
  const params: any = {
    type: rankingType.value,
    limit: 15
  };

  if (rankingDateRange.value) {
    params.startTime = rankingDateRange.value[0];
    params.endTime = rankingDateRange.value[1];
  }

  const res = await getRankingApi(params);
  const list = res.rankingList || [];

  await nextTick();
  renderRankingChart(list);
}

function renderRankingChart(list: { name: string; phone: string; value: number }[]) {
  if (!rankingChartRef.value) return;

  if (!rankingChartInstance) {
    rankingChartInstance = echarts.init(rankingChartRef.value);
  }

  const xData = list.map((item) => item.phone || item.name);
  const yData = list.map((item) => item.value);
  const config = rankingConfig[rankingType.value];

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = params[0];
        return `${p.axisValue}<br/>${p.marker} ${p.seriesName}: ${p.value.toFixed(2)} ${config.unit}`;
      }
    },
    grid: { top: '12%', left: '2%', right: '3%', bottom: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      data: xData,
      axisTick: { alignWithLabel: true },
      axisLine: { lineStyle: { color: '#E5E7EB' } },
      axisLabel: {
        color: '#6B7280',
        fontSize: 10,
        formatter: (value: string) => value.length > 8 ? `${value.slice(0, 8)}...` : value,
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
        formatter: (value: number) => `${value.toFixed(0)}`
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

  rankingChartInstance.setOption(option, true);
  rankingChartInstance.resize();
}

// ==================== 5. 设备状态 ====================
const deviceData = ref<DeviceStatusData>({ deviceTotal: 0, onlineCount: 0, offlineCount: 0 });

async function fetchDeviceStatus() {
  const res = await getDeviceStatusApi();
  deviceData.value = res;
}

// ==================== 6. 生命周期 ====================
onMounted(async () => {
  await Promise.all([
    fetchOverview(),
    fetchDeviceStatus(),
    fetchTrendData(),
    fetchRanking()
  ]);

  await nextTick();
  initResizeObserver();
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  trendChartInstance?.dispose();
  rankingChartInstance?.dispose();
});

// 监听变化，重新渲染图表
watch([trendType, trendRangeDays, trendDateRange], fetchTrendData);
watch([rankingType, rankingDateRange], fetchRanking);
</script>

<template>
  <div class="h-full p-4 bg-[#F5F7FA] dark:bg-zinc-900 overflow-hidden flex gap-4">
    <!-- ================= 左侧：固定面板 ================= -->
    <div class="w-[280px] xl:w-[310px] flex flex-col gap-4 shrink-0 h-full min-h-0">
      <!-- 1. 用户卡片 -->
      <div
        class="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 text-white shadow-md shrink-0 relative overflow-hidden"
>
        <div class="text-lg font-bold mb-3 z-10 relative">您好，欢迎智能回收箱系统！</div>
        <div class="bg-white/95 text-gray-800 rounded-lg p-3 text-xs space-y-2 shadow-inner relative z-10">
          <div class="flex items-center gap-2.5">
            <el-avatar
:size="36" :src="userStore.userInfo?.user?.avatar || preferences.app.defaultAvatar"
              class="border border-primary-100"
/>
            <div>
              <div class="font-bold text-sm">{{ userStore.userInfo?.user?.nickName || '超级管理员' }}</div>
              <div class="text-[11px] text-gray-500 mt-0.5">
                状态:
                <span
:class="merchantStatus.type === 'success' ? 'text-emerald-500' : 'text-rose-500'"
                  class="font-bold"
>
                  {{ merchantStatus.text }}
                </span>
              </div>
            </div>
          </div>
          <div class="text-gray-500 pt-1.5 border-t border-gray-100">
            商户名称: <span class="text-primary-600 font-medium">{{ currentMerchantInfo?.merchantName || 'huixiaofen'
              }}</span>
          </div>
          <div class="text-gray-500">
            角色名称: <span class="text-primary-600 font-medium">{{ roleName }}</span>
          </div>
          <div class="text-gray-500 flex justify-between items-center">
            <span>
              商户编码: <strong class="text-gray-800 font-medium">{{ currentMerchantInfo?.merchantCode || 'hxf' }}</strong>
            </span>
          </div>
        </div>
        <div class="absolute -right-8 -bottom-8 w-28 h-28 bg-white/10 rounded-full blur-sm"></div>
      </div>

      <!-- 2. 设备状态 -->
      <div
        class="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700/80 shrink-0"
>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="bg-gray-50 dark:bg-zinc-700/40 p-2 rounded-lg">
            <div class="text-xs text-gray-400">设备总数</div>
            <div class="text-lg font-bold text-gray-800 dark:text-gray-100 mt-0.5">{{ deviceData.deviceTotal }}</div>
          </div>
          <div class="bg-blue-50/60 dark:bg-blue-950/30 p-2 rounded-lg">
            <div class="text-xs text-blue-500">在线设备</div>
            <div class="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">{{ deviceData.onlineCount }}</div>
          </div>
          <div class="bg-rose-50/60 dark:bg-rose-950/30 p-2 rounded-lg">
            <div class="text-xs text-rose-500">离线设备</div>
            <div class="text-lg font-bold text-rose-500 mt-0.5">{{ deviceData.offlineCount }}</div>
          </div>
        </div>
      </div>

      <!-- 3. 常用功能 -->
      <div
        class="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700/80 flex-1 flex flex-col min-h-0"
>
        <div class="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 mb-3 shrink-0">
          <span class="w-1 h-3.5 bg-rose-500 rounded-full"></span> 常用功能
        </div>
        <div class="grid grid-cols-3 gap-3 overflow-y-auto pr-1 flex-1 min-h-0">
          <div
v-for="(item, idx) in filteredNavItems" :key="idx"
            class="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700/40 cursor-pointer transition-colors group"
            @click="navTo(item.url)"
>
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center mb-1 shadow-sm group-hover:scale-105 transition-transform"
              :style="{ backgroundColor: `${item.color}15`, border: `1px solid ${item.color}30` }"
>
              <el-icon class="text-xl" :style="{ color: item.color }">
                <component :is="item.icon" />
              </el-icon>
            </div>
            <span
              class="text-[11px] text-gray-600 dark:text-gray-300 font-medium text-center truncate w-full group-hover:text-blue-600"
>{{
                item.title }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= 右侧主工作区 ================= -->
    <div class="flex-1 flex flex-col gap-4 min-w-0 h-full min-h-0">
      <!-- 1. 实时概况 -->
      <div
        class="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700/80 shrink-0"
>
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="w-1 h-3.5 bg-rose-500 rounded-full"></span>
            <span class="font-bold text-sm text-gray-800 dark:text-gray-100">实时概况</span>
            <span class="text-[11px] text-gray-400">默认最近7天数据</span>
          </div>
          <div class="flex items-center gap-2">
            <el-date-picker
v-model="overviewDateRange" type="daterange" start-placeholder="开始" end-placeholder="结束"
              style="width: 240px;" value-format="YYYY-MM-DD" @change="fetchOverview"
/>
            <el-button type="primary" :loading="overviewLoading" @click="fetchOverview">刷新</el-button>
          </div>
        </div>

        <div class="grid grid-cols-3 xl:grid-cols-6 gap-3">
          <div
v-for="(card, idx) in overviewCards" :key="idx"
            class="bg-[#F8FAFC] dark:bg-zinc-700/30 p-2.5 rounded-lg border border-gray-100 dark:border-transparent"
>
            <div class="flex justify-between items-center text-[11px] text-gray-400 mb-1">
              <span class="truncate">{{ card.title }}</span>
            </div>
            <div class="text-lg font-bold text-gray-800 dark:text-gray-100 my-0.5">{{ card.today }}</div>
            <div class="text-[10px] flex items-center justify-between text-gray-400">
              <span>昨日 {{ card.yesterday }}</span>
              <span
:class="getGrowth(card.today, card.yesterday).isUp ? 'text-rose-500' : 'text-emerald-500'"
                class="font-semibold"
>
                {{ getGrowth(card.today, card.yesterday).text }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 双图表 -->
      <div class="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 min-h-0 min-w-0">
        <!-- 左：聚合数据概览 -->
        <div
          class="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700/80 flex flex-col min-h-0 min-w-0"
>
          <div class="flex items-center justify-between mb-2 shrink-0 gap-2 flex-wrap">
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="w-1 h-3.5 bg-rose-500 rounded-full"></span>
              <span class="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">聚合数据概览</span>
            </div>
            <div class="flex items-center gap-2 flex-wrap justify-end">
              <el-select v-model="trendType" style="width: 100px">
                <el-option label="投递重量" value="weight" />
                <el-option label="投递次数" value="count" />
                <el-option label="环保金" value="earnings" />
              </el-select>
              <el-radio-group v-model="trendRangeDays">
                <el-radio-button :label="7">7天</el-radio-button>
                <el-radio-button :label="15">15天</el-radio-button>
                <el-radio-button :label="30">30天</el-radio-button>
              </el-radio-group>
            </div>
          </div>
          <div class="text-xs text-gray-400 mb-1 shrink-0">
            {{ trendRangeDays }}天{{ typeConfig[trendType].name }}总计:
            <strong class="text-gray-800 dark:text-gray-200 text-sm ml-1">{{ totalTrendValue.toFixed(2) }}</strong>
            {{ typeConfig[trendType].unit }}
          </div>
          <div class="relative flex-1 min-h-0 w-full">
            <div ref="trendChartRef" class="absolute inset-0 w-full h-full"></div>
          </div>
        </div>

        <!-- 右：聚合排行榜 -->
        <div
          class="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700/80 flex flex-col min-h-0 min-w-0"
>
          <div class="flex items-center justify-between mb-2 shrink-0 gap-2 flex-wrap">
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="w-1 h-3.5 bg-rose-500 rounded-full"></span>
              <span class="font-bold text-sm text-gray-800 dark:text-gray-100">聚合排行榜</span>
            </div>
            <div class="flex items-center gap-2 flex-wrap justify-end">
              <el-date-picker
v-model="rankingDateRange" type="daterange" range-separator="-" start-placeholder="开始"
                end-placeholder="结束" value-format="YYYY-MM-DD" style="width: 220px" @change="fetchRanking"
/>
              <el-select v-model="rankingType" style="width: 150px">
                <el-option label="会员投递重量榜" value="memberWeight" />
                <el-option label="会员投递次数榜" value="memberCount" />
                <el-option label="商户投递重量榜" value="merchantWeight" />
              </el-select>
            </div>
          </div>
          <div class="relative flex-1 min-h-0 w-full">
            <div ref="rankingChartRef" class="absolute inset-0 w-full h-full"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.el-radio-button__inner) {
  padding: 5px 10px;
}
</style>
