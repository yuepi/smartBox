<script lang="ts">
import { defineComponent, onMounted, reactive } from 'vue';

import Chart from '../center/chart/draw';

export default defineComponent({
  components: { Chart },
  setup() {
    // ===== 卡片数据 =====
    const titleDate = [
      // 本年汇总（模拟）
      { number: 158_420, text: '本年累计投递(次)' },
      { number: 96_850, text: '本年回收总量(kg)' },
      { number: 328_760, text: '本年回收金额(元)' },

      // 本月汇总（保留原数据）
      { number: 26_120, text: '本月累计投递(次)' },
      { number: 72_530, text: '本月回收总量(kg)' },
      { number: 36_741, text: '本月回收金额(元)' },

      // 今日数据（模拟）
      { number: 1024, text: '今日累计投递(次)' },
      { number: 2386, text: '今日回收总量(kg)' },
      { number: 1263, text: '今日回收金额(元)' },
    ];

    const titleItem = reactive([]);

    const setData = () => {
      titleDate.forEach((e) => {
        titleItem.push({
          title: e.text,
          config: {
            number: [e.number],
            toFixed: 0,
            textAlign: 'left',
            content: '{nt}',
            style: { fontSize: 22 },
          },
        });
      });
    };

    onMounted(() => {
      setData();
    });

    // ===== 排行榜数据 =====
    const ranking = reactive({
      data: [
        { name: '138****6721', value: 156 },
        { name: '159****3084', value: 132 },
        { name: '177****9452', value: 98 },
        { name: '136****5173', value: 87 },
        { name: '188****2608', value: 76 },
        { name: '150****7841', value: 65 },
        { name: '139****0396', value: 54 },
        { name: '158****4127', value: 43 },
        { name: '176****8530', value: 32 },
        { name: '137****2965', value: 21 },
        { name: '152****6418', value: 18 },
        { name: '186****1704', value: 15 },
        { name: '131****5289', value: 12 },
        { name: '189****9073', value: 9 },
        { name: '135****3642', value: 7 },
        { name: '187****7315', value: 5 },
        { name: '153****0856', value: 4 },
        { name: '130****4920', value: 3 },
        { name: '185****6187', value: 2 },
        { name: '156****2439', value: 1 },
      ],
      carousel: 'single',
      unit: '次',
    });

    // ===== 水位图数据 =====
    const water = reactive({
      data: [65, 80], // 当前值, 目标值
      shape: 'roundRect',
      formatter: '{value}%',
      waveNum: 3,
    });

    // ===== 两个环形图数据 =====
    const rate = reactive([
      {
        label: '设备在线率',
        tips: 94,
        colorData: {
          textStyle: '#3fc0fb',
          series: {
            color: ['#00bcd44a', 'transparent'],
            dataColor: { normal: '#03a9f4', shadowColor: '#97e2f5' },
          },
        },
      },
      {
        label: '今日满箱率',
        tips: 28,
        colorData: {
          textStyle: '#67e0e3',
          series: {
            color: ['#faf3a378', 'transparent'],
            dataColor: { normal: '#ff9800', shadowColor: '#fcebad' },
          },
        },
      },
    ]);

    return { titleItem, ranking, water, rate };
  },
});
</script>

<template>
  <div class="flex h-[450px] w-full flex-col gap-2 p-2">
    <!-- ===== 上方：12个指标卡片 (2行 x 4列) ===== -->
    <div class="grid h-[140px] grid-cols-3 gap-2">
      <div
        v-for="item in titleItem"
        :key="item.title"
        class="flex items-center justify-between rounded bg-black/60 px-3"
      >
        <span class="text-sm text-blue-300">{{ item.title }}</span>
        <dv-digital-flop class="h-[30px] w-[150px]" :config="item.config" />
      </div>
    </div>

    <!-- ===== 下方：排行榜 + 进度/水位 (2行 x 3列，占满剩余高度) ===== -->
    <div class="grid flex-1 grid-cols-3 grid-rows-2 gap-2">
      <!-- 左：排行榜 (占据左侧整列，跨2行) -->
      <div class="col-span-2 row-span-2 rounded bg-black/60 p-3 h-[280px]">
        <div class="mb-2 flex items-center gap-2">
          <i class="iconfont icon-tongji2 text-cyan-400"></i>
          <span class="text-sm text-white">用户投递排行榜</span>
        </div>
        <dv-scroll-ranking-board
          class="h-[calc(100%-28px)]"
          :config="ranking"
        />
      </div>

      <!-- 右上：设备在线率 -->
      <div class="flex flex-col items-center rounded bg-black/60 py-1">
        <span class="text-xs text-gray-300">设备在线率</span>
        <Chart :tips="rate[0].tips" :color-obj="rate[0].colorData" />
      </div>

      <!-- 右中：今日满箱率 -->
      <div class="flex flex-col items-center rounded bg-black/60 py-1">
        <span class="text-xs text-gray-300">今日满箱率</span>
        <Chart :tips="rate[1].tips" :color-obj="rate[1].colorData" />
      </div>
    </div>
  </div>
</template>
