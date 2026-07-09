<script lang="ts">
import { defineComponent, onMounted, onUnmounted, reactive } from 'vue'

import Chart from './chart/index'

export default defineComponent({
  components: { Chart },
  setup() {
    const dataArr = [
      { number: 128, text: '今日投放数量', unit: '次' },
      { number: 96, text: '今日投递重量', unit: 'kg' },
      { number: 32, text: '今日回收金额', unit: '元' },
      { number: 245, text: '今日订单数量', unit: '单' },
    ]

    const iconFont = [
      'icon-diagnose',
      'icon-monitoring',
      'icon-cloudupload',
      'icon-clouddownload',
    ]

    const numberData = reactive([])
    let intervalInstance = null

    const setData = () => {
      dataArr.forEach((e) => {
        numberData.push({
          config: {
            number: [e.number],
            toFixed: 1,
            content: '{nt}',
            style: { fontSize: 24 },
          },
          text: e.text,
          unit: e.unit,  // 新增单位字段
        })
      })
    }

    const changeNumber = () => {
      numberData.forEach((item, index) => {
        item.config.number[0] += index + 1
        item.config = { ...item.config }
      })
    }

    onMounted(() => {
      setData()
      intervalInstance = setInterval(changeNumber, 2000)
    })

    onUnmounted(() => {
      clearInterval(intervalInstance)
    })

    return { numberData, iconFont }
  },
})
</script>

<template>
  <div class="h-[410px] w-[400px] rounded-lg">
    <div class="flex h-[380px] flex-col rounded-lg bg-black/60 p-4">
      <!-- 标题区域 -->
      <div class="flex items-center gap-2">
        <i class="iconfont icon-tongji4 text-cyan-400"></i>
        <span class="text-white">回收垃圾分类</span>
        <dv-decoration-3 style="width: 100px;height: 20px;" />
      </div>

      <!-- 图表区域 -->
      <div class="flex-1">
        <Chart />
      </div>

      <!-- 4个主要数据 -->
      <div class="grid grid-cols-2 gap-1">
        <div
          v-for="(item, index) in numberData"
          :key="index"
          class="flex flex-col items-center"
        >
          <div class="flex items-center gap-2">
            <i class="iconfont text-xl text-cyan-400" :class="[iconFont[index]]"></i>
            <dv-digital-flop
              class="h-[30px] w-[120px]"
              :config="item.config"
            />
          </div>
          <p class="text-sm text-gray-300">
            {{ item.text }}
            <span class="text-lime-400">({{ item.unit }})</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
