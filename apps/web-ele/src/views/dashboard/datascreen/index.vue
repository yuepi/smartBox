<script lang="ts" setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue';

import { title, WEEK } from '#/constants/screen';
import { formatTime } from '#/utils/index';
import { generateMockDevicePoints } from '#/utils/mockDevicePoints';
import useDraw from '#/utils/useDraw';

import BasicStats from './components/BasicStats.vue';
import CategoryAnalysis from './components/CategoryAnalysis.vue';
import DeliveryStats from './components/DeliveryStats.vue';
import RankingChart from './components/RankingChart.vue';
import RealtimeClean from './components/RealtimeClean.vue';
import RealtimeDelivery from './components/RealtimeDelivery.vue';
import RealtimeWithdraw from './components/RealtimeWithdraw.vue';
import ScreenMap from './components/ScreenMap/index.vue';
import TopStats from './components/TopStats.vue';
import TrendChart from './components/TrendChart.vue';
import MusicPlayer from './MusicPlayer/index.vue';

// * 装饰条颜色
const decorationColors = ['#568aea', '#000000'];

// * 加载标识
const loading = ref<boolean>(true);

// * 时间内容
const timeInfo = reactive({
  setInterval: 0,
  dateDay: '',
  dateYear: '',
  dateWeek: '',
});

// * 适配处理
const { appRef, calcRate, windowDraw, unWindowDraw } = useDraw();

// 歌单
const bgmList = [
  {
    id: 'hakishuo',
    name: '哈基说',
    src: '/hajishuo.mp3',
    loopStart: 0,
    loopEnd: 60,
  },
];

// 生成模拟设备点位
const mapPoints = ref<any[]>([]);

function generateMockPoints() {
  mapPoints.value = generateMockDevicePoints(524);
  return mapPoints.value;
}

const handleTime = () => {
  timeInfo.setInterval = setInterval(() => {
    const date = new Date();
    timeInfo.dateDay = formatTime(date, 'HH: mm: ss');
    timeInfo.dateYear = formatTime(date, 'yyyy-MM-dd');
    timeInfo.dateWeek = WEEK[date.getDay()];
  }, 1000);
};

onMounted(() => {
  setTimeout(() => {
    loading.value = false;
  }, 500);
  handleTime();
  windowDraw();
  calcRate();
  mapPoints.value = generateMockPoints();
});

onUnmounted(() => {
  unWindowDraw();
  clearInterval(timeInfo.setInterval);
});
</script>

<template>
  <div id="index" ref="appRef" class="big-screen-wrapper">
    <!-- 全屏地图底层（允许鼠标拖拽缩放） -->
    <div class="map-bg">
      <ScreenMap
        :points="mapPoints"
        height="100%"
        :center="{ lng: 115.5, lat: 38.5 }"
        :zoom="14"
      />
    </div>

    <!-- 加载中动画 -->
    <dv-loading v-if="loading">Loading...</dv-loading>

    <!-- 顶层 UI 布局 -->
    <div v-else class="content-layer">
      <div class="header-box">
        <div class="d-flex jc-center">
          <dv-decoration-10 class="dv-dec-10" />
          <div class="d-flex jc-center">
            <dv-decoration-8 class="dv-dec-8" :color="decorationColors" />
            <div class="title">
              <span class="title-text">{{ title }}</span>
              <dv-decoration-6
                class="dv-dec-6"
                :reverse="true"
                :color="['#50e3c2', '#67a1e5']"
              />
            </div>
            <dv-decoration-8
              class="dv-dec-8"
              :reverse="true"
              :color="decorationColors"
            />
          </div>
          <dv-decoration-10 class="dv-dec-10-s" />
        </div>

        <!-- 顶部次级条：仅右侧保留时间，左侧保持平衡 -->
        <div class="d-flex jc-between px-2 second-row">
          <div class="aside-width"></div>
          <div class="d-flex aside-width jc-end">
            <div class="react-right mr-4 react-l-s">
              <span class="react-after"></span>
              <span class="text">
                {{ timeInfo.dateYear }} {{ timeInfo.dateWeek }}
                {{ timeInfo.dateDay }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 主面板与图表内容区域 -->
      <div class="body-box">
        <div class="main-content">
          <!-- 左侧边栏组件库 -->
          <div class="left-column">
            <dv-border-box-12 class="box-item">
              <DeliveryStats />
            </dv-border-box-12>
            <dv-border-box-12 class="box-item">
              <BasicStats />
            </dv-border-box-12>
            <dv-border-box-12 class="box-item">
              <TrendChart />
            </dv-border-box-12>
          </div>

          <!-- 中间区域：顶部四项指标点阵，底部为地图留空透出 -->
          <div class="center-column">
            <div class="top-stats-container">
              <TopStats />
            </div>
            <!-- 地图透出区（设置 pointer-events: none 允许穿透操作地图） -->
            <div class="map-interactive-area"></div>
          </div>

          <!-- 右侧边栏组件库 -->
          <div class="right-column">
            <dv-border-box-12 class="box-item">
              <RankingChart />
            </dv-border-box-12>
            <dv-border-box-12 class="box-item">
              <CategoryAnalysis />
            </dv-border-box-12>
          </div>
        </div>

        <!-- 底部三列实时数据组件 -->
        <div class="bottom-content">
          <dv-border-box-13 class="bottom-item">
            <RealtimeDelivery />
          </dv-border-box-13>
          <dv-border-box-12 class="bottom-item">
            <RealtimeClean />
          </dv-border-box-12>
          <dv-border-box-13 class="bottom-item">
            <RealtimeWithdraw />
          </dv-border-box-13>
        </div>
      </div>
    </div>

    <!-- 音乐播放器 -->
    <MusicPlayer :songs="bgmList" :default-volume="0.2" :auto-play="true" />
  </div>
</template>

<style lang="scss" scoped>
#index {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  color: #d3d6dd;
  background-color: #0a0e1a;
  transform: translate(-50%, -50%);
  transform-origin: left top;
}

/* 地图背景层：开启交互响应 */
.map-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: auto;
}

/* 内容绝对定位覆盖在地图上方 */
.content-layer {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  padding: 16px;
  pointer-events: none; /* 穿透未被图表遮挡区域，使下方地图可被拖拽 */
}

/* DataV 顶部 Header 核心样式 */
.header-box {
  flex-shrink: 0;
  pointer-events: auto;

  .dv-dec-10,
  .dv-dec-10-s {
    width: 33.3%;
    height: 5px;
  }

  .dv-dec-10-s {
    transform: rotateY(180deg);
  }

  .dv-dec-8 {
    width: 200px;
    height: 50px;
  }

  .title {
    position: relative;
    width: 500px;
    text-align: center;
    background-repeat: no-repeat;
    background-size: cover;

    .title-text {
      position: absolute;
      bottom: 0;
      left: 50%;
      font-size: 24px;
      font-weight: bold;
      color: #00d8ff;
      letter-spacing: 2px;
      text-shadow: 0 0 20px rgb(0 216 255 / 60%);
      transform: translate(-50%);
    }

    .dv-dec-6 {
      position: absolute;
      bottom: -30px;
      left: 50%;
      width: 250px;
      height: 8px;
      transform: translate(-50%);
    }
  }

  .second-row {
    margin-top: -10px;
  }

  .aside-width {
    width: 40%;
  }

  /* 时间平行四边形 */
  .react-right {
    position: relative;
    width: 300px;
    height: 40px;
    font-size: 16px;
    line-height: 40px;
    text-align: center;
    background-color: #0f1325;
    transform: skewX(-45deg);

    &.react-l-s {
      width: 400px;
      padding-right: 20px;
      text-align: right;
    }

    .react-after {
      position: absolute;
      top: 0;
      right: -20px;
      width: 40px;
      height: 40px;
      background-color: #0f1325;
      transform: skewX(45deg);
    }

    .text {
      display: inline-block;
      transform: skewX(45deg);
    }
  }
}

/* 主容器 */
.body-box {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  margin-top: 8px;
  overflow: hidden;
}

/* 网格排版 */
.main-content {
  display: grid;
  flex: 1;
  grid-template-columns: 420px 1fr 420px;
  gap: 16px;
  min-height: 0;
}

.left-column,
.right-column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  pointer-events: auto;

  .box-item {
    flex: 1;
    min-height: 0;
    padding: 12px;
    overflow: hidden;
  }
}

.center-column {
  display: flex;
  flex-direction: column;
  height: 100%;

  .top-stats-container {
    pointer-events: auto;
  }

  /* 留空区域允许直接透穿对地图进行点击与拖拽操作 */
  .map-interactive-area {
    flex: 1;
    pointer-events: none;
  }
}

/* 底部区域 */
.bottom-content {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  height: 220px;
  margin-top: 12px;
  pointer-events: auto;

  .bottom-item {
    width: 100%;
    height: 100%;
    padding: 12px;
    overflow: hidden;
  }
}
</style>
