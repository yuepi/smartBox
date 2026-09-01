<script lang="ts">
import { defineComponent, reactive } from 'vue';

import ScreenMap from '#/components/ScreenMap/index.vue';
import { generateMockDevicePoints } from '#/utils/mockDevicePoints';

export default defineComponent({
  components: { ScreenMap },
  setup() {
    const capsuleConfig = reactive({
      data: [
        { name: '阳光花园', value: 156 },
        { name: '翠湖苑', value: 132 },
        { name: '龙湖花园', value: 98 },
        { name: '滨江新城', value: 87 },
        { name: '南山花园', value: 76 },
        { name: '东湖苑', value: 65 },
        { name: '西郊花园', value: 54 },
        { name: '北苑小区', value: 43 },
        { name: '南湖花园', value: 32 },
        { name: '中心花园', value: 21 },
      ],
      unit: '次',
      showValue: true,
    });

    const showMap = ref(false);

    // 生成 524 个设备点
    const mapPoints = generateMockDevicePoints(524);
    return { capsuleConfig, showMap, mapPoints };
  },
});
</script>

<template>
  <div class="h-[450px] w-full rounded-lg p-2">
    <div class="flex h-full w-full flex-col rounded-lg bg-black/60 p-3">
      <!-- 标题 -->
      <div class="mb-2 flex items-center gap-2">
        <i class="iconfont icon-align-left text-cyan-400"></i>
        <span class="text-sm text-white">小区投递量排行</span>
        <dv-decoration-3 style="width: 100px; height: 20px" />
        <el-button
          size="small"
          type="primary"
          plain
          @click="showMap = !showMap"
          class="ml-auto"
        >
          {{ showMap ? '收起地图' : '查看地图' }}
        </el-button>
      </div>

      <!-- 胶囊图 -->
      <div v-if="!showMap" class="flex flex-1 flex-col gap-2 overflow-hidden">
        <dv-capsule-chart class="h-[400px] w-full" :config="capsuleConfig" />
      </div>

      <!-- 地图 -->
      <div v-else class="flex-1">
        <ScreenMap :points="mapPoints" height="380px" />
      </div>
    </div>
  </div>
</template>
