<script lang="ts">
import { defineComponent, reactive } from 'vue';

import ScreenMap from '#/components/ScreenMap/index.vue';

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

    const mapPoints = [
      // 石家庄及周边
      { lng: 114.502_461, lat: 38.045_474, name: 'A9HPG6EZXJR', value: 156, status: 'online' },
      { lng: 114.533_298, lat: 38.086_837, name: 'XK3M9N7WQPL', value: 132, status: 'online' },
      { lng: 114.451_281, lat: 38.026_474, name: 'B2D5F8H1JKL', value: 98, status: 'online' },

      // 保定
      { lng: 115.494_81, lat: 38.886_565, name: 'C4E7G0I3MNO', value: 87, status: 'full' },
      { lng: 115.464_807, lat: 38.847_663, name: 'D6F9H2J5PQR', value: 76, status: 'online' },
      { lng: 115.524_812, lat: 38.925_465, name: 'E8G1K4M7STU', value: 65, status: 'offline' },

      // 唐山
      { lng: 118.183_451, lat: 39.650_522, name: 'F0H3L6N9VWX', value: 54, status: 'online' },
      { lng: 118.153_448, lat: 39.611_620, name: 'G2J5M8P2YZA', value: 43, status: 'online' },
      { lng: 118.213_454, lat: 39.689_424, name: 'H4K7N0Q3BCD', value: 32, status: 'full' },

      // 廊坊
      { lng: 116.713_502, lat: 39.524_226, name: 'I6L9O2R5EFG', value: 21, status: 'online' },
      { lng: 116.683_498, lat: 39.485_320, name: 'J8M1P4S7UVW', value: 18, status: 'online' },
      { lng: 116.743_506, lat: 39.563_132, name: 'K0N3Q6T9XYZ', value: 15, status: 'online' },

      // 邯郸
      { lng: 114.490_686, lat: 36.611_273, name: 'L2O5R8U1ABC', value: 12, status: 'online' },
      { lng: 114.520_683, lat: 36.572_371, name: 'M3P6S9V2DEF', value: 9, status: 'full' },

      // 张家口
      { lng: 114.884_091, lat: 40.811_901, name: 'N4Q7T0W3GHI', value: 7, status: 'online' },
      { lng: 114.854_088, lat: 40.773_001, name: 'O5R8U1X4JKL', value: 5, status: 'online' },

      // 沧州
      { lng: 116.858_349, lat: 38.310_611, name: 'P6S9V2Y5MNO', value: 4, status: 'offline' },
      { lng: 116.828_345, lat: 38.271_709, name: 'Q7T0W3Z6PQR', value: 3, status: 'online' },

      // 衡水
      { lng: 115.686_229, lat: 37.738_868, name: 'R8U1X4A7STU', value: 2, status: 'online' },

      // 邢台
      { lng: 114.561_092, lat: 37.059_419, name: 'S9V2Y5B8VWX', value: 1, status: 'online' },
    ];

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
        <dv-decoration-3 style="width: 100px; height: 20px;" />
        <el-button size="small" type="primary" plain @click="showMap = !showMap" class="ml-auto">
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
