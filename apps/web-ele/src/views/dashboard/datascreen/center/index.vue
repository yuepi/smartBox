<script lang="ts">
import { defineComponent, onMounted, reactive } from 'vue'

import Chart from '../center/chart/draw'

export default defineComponent({
  components: { Chart },
  setup() {
    // ===== 6个指标卡片数据 =====
    const titleDate = [
      { number: 12_580, text: '本年累计投递' },
      { number: 8760, text: '本年回收总量(kg)' },
      { number: 1420, text: '本年投递订单数' },
      { number: 3220, text: '本月累计投递' },
      { number: 2150, text: '本月回收总量(kg)' },
      { number: 380, text: '本月投递订单数' },
    ]

    const titleItem = reactive([])

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
        })
      })
    }

    onMounted(() => {
      setData()
    })

    // ===== 排行榜数据 =====
    const ranking = reactive({
      data: [
        { name: 'A9HPG6EZXJR', value: 156 },
        { name: 'XK3M9N7WQPL', value: 132 },
        { name: 'B2D5F8H1JKL', value: 98 },
        { name: 'C4E7G0I3MNO', value: 87 },
        { name: 'D6F9H2J5PQR', value: 76 },
        { name: 'E8G1K4M7STU', value: 65 },
        { name: 'F0H3L6N9VWX', value: 54 },
        { name: 'G2J5M8P2YZA', value: 43 },
        { name: 'H4K7N0Q3BCD', value: 32 },
        { name: 'I6L9O2R5EFG', value: 21 },
      ],
      carousel: 'single',
      unit: '次',
    })

    // ===== 水位图数据 =====
    const water = reactive({
      data: [65, 80], // 当前值, 目标值
      shape: 'roundRect',
      formatter: '{value}%',
      waveNum: 3,
    })

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
    ])

    return { titleItem, ranking, water, rate }
  },
})
</script>

<template>
  <div class="flex h-full w-full flex-col gap-2 p-2">
    <!-- ===== 上方：6个指标卡片 (2行 x 3列) ===== -->
    <div class="grid h-[80px] grid-cols-3 gap-2">
      <div
v-for="item in titleItem" :key="item.title"
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
          <span class="text-sm text-white">回收箱投递量排行榜</span>
        </div>
        <dv-scroll-ranking-board class="h-[calc(100%-28px)]" :config="ranking" />
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
