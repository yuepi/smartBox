<template>
  <div class="h-[400px] w-full rounded-lg p-4">
    <div class="flex h-full w-full flex-col rounded-lg bg-black/60 p-3">
      <!-- 标题 -->
      <div class="mb-2 flex items-center gap-2">
        <i class="iconfont icon-chart-line text-cyan-400"></i>
        <span class="text-sm text-white">月度回收量趋势</span>
      </div>

      <!-- 图表区域 -->
      <div class="flex-1">
        <Chart />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import Chart from './chart/index'

export default defineComponent({
  components: { Chart },
  setup() {
    return {}
  },
})
</script>
