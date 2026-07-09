<script lang="ts">
import { defineComponent, onMounted, reactive } from 'vue'

import Chart from '../center/chart/draw'

export default defineComponent({
  components: { Chart },
  setup() {
    // ===== 6个指标卡片数据 =====
    const titleDate = [
      { number: 12_580, text: '本年累计投递(次)' },
      { number: 8760, text: '本年回收总量(kg)' },
      { number: 1420, text: '本年投递订单数(个)' },
      { number: 3220, text: '本月累计投递(次)' },
      { number: 2150, text: '本月回收总量(kg)' },
      { number: 380, text: '本月投递订单数(个)' },
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
        { name: '138****1234', value: 156 },
        { name: '159****5678', value: 132 },
        { name: '177****9012', value: 98 },
        { name: '136****3456', value: 87 },
        { name: '188****7890', value: 76 },
        { name: '150****2345', value: 65 },
        { name: '139****6789', value: 54 },
        { name: '158****0123', value: 43 },
        { name: '176****4567', value: 32 },
        { name: '137****8901', value: 21 },
        { name: '152****3456', value: 18 },
        { name: '186****7890', value: 15 },
        { name: '131****2345', value: 12 },
        { name: '189****6789', value: 9 },
        { name: '135****0123', value: 7 },
        { name: '187****4567', value: 5 },
        { name: '153****8901', value: 4 },
        { name: '130****2345', value: 3 },
        { name: '185****6789', value: 2 },
        { name: '156****0123', value: 1 },
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
          <span class="text-sm text-white">用户投递排行榜</span>
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
