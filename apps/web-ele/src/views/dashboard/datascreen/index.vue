<script lang="ts" setup>
import type { SongItem } from './MusicPlayer/index.vue';

import { onMounted, onUnmounted, reactive, ref } from 'vue'

import { subtitle, title, WEEK } from '#/constants/screen'
import { formatTime } from '#/utils/index'
import useDraw from '#/utils/useDraw'

import BottomLeft from './bottomLeft/index.vue'
import BottomRight from './bottomRight/index.vue'
import Center from './center/index.vue'
import CenterLeft1 from './centerLeft1/index.vue'
import CenterRight1 from './centerRight1/index.vue'
import MusicPlayer from './MusicPlayer/index.vue';

// * 颜色
const decorationColors = ['#568aea', '#000000']
// * 加载标识
const loading = ref<boolean>(true)
// * 时间内容
const timeInfo = reactive({
  setInterval: 0,
  dateDay: '',
  dateYear: '',
  dateWeek: ''
})
// * 适配处理
const { appRef, calcRate, windowDraw, unWindowDraw } = useDraw()

// 配置你的大屏专属歌单列表
const bgmList = ref<SongItem[]>([
   {
    id: 'hakishuo',
    name: '哈基说',
    src: '/hajishuo.mp3',
    loopStart: 0,
    loopEnd: 60
  },
  {
    id: 'hakimi',
    name: '哈基米之歌 (Happy Haki)',
    src: '/hajimi.mp3', 
    loopStart: 5,   
    loopEnd: 35     
  },
  {
    id: 'ksl',
    name: '圣诞',
    src: '/ksl.mp3',
    loopStart: 30,
    loopEnd: 60
  }
])

// todo 处理 loading 展示
const cancelLoading = () => {
  setTimeout(() => {
    loading.value = false
  }, 500)
}

// todo 处理时间监听
const handleTime = () => {
  timeInfo.setInterval = setInterval(() => {
    const date = new Date()
    timeInfo.dateDay = formatTime(date, 'HH: mm: ss')
    timeInfo.dateYear = formatTime(date, 'yyyy-MM-dd')
    timeInfo.dateWeek = WEEK[date.getDay()]
  }, 1000)
}

// 生命周期
onMounted(() => {
  cancelLoading()
  handleTime()
  windowDraw()
  calcRate()
})

onUnmounted(() => {
  unWindowDraw()
  clearInterval(timeInfo.setInterval)
})
</script>

<template>
  <div id="index" ref="appRef" class="big-screen-wrapper">
    <div class="bg">
      <dv-loading v-if="loading">Loading...</dv-loading>
      <div v-else class="host-body">
        <div class="d-flex jc-center">
          <dv-decoration-10 class="dv-dec-10" />
          <div class="d-flex jc-center">
            <dv-decoration-8 class="dv-dec-8" :color="decorationColors" />
            <div class="title">
              <span class="title-text">{{ title }}</span>
              <dv-decoration-6 class="dv-dec-6" :reverse="true" :color="['#50e3c2', '#67a1e5']" />
            </div>
            <dv-decoration-8 class="dv-dec-8" :reverse="true" :color="decorationColors" />
          </div>
          <dv-decoration-10 class="dv-dec-10-s" />
        </div>

        <div class="d-flex jc-between px-2">
          <div class="d-flex aside-width">
            <div class="react-left ml-4 react-l-s">
              <span class="react-before"></span>
              <span class="text">{{ subtitle[0] }}</span>
            </div>
            <div class="react-left ml-3">
              <span class="text">{{ subtitle[1] }}</span>
            </div>
          </div>
          <div class="d-flex aside-width">
            <div class="react-right bg-color-blue mr-3">
              <span class="text fw-b">{{ subtitle[2] }}</span>
            </div>
            <div class="react-right mr-4 react-l-s">
              <span class="react-after"></span>
              <span class="text">
                {{ timeInfo.dateYear }} {{ timeInfo.dateWeek }}
                {{ timeInfo.dateDay }}
              </span>
            </div>
          </div>
        </div>

        <div class="body-box">
          <div class="content-box">
            <div>
              <dv-border-box-12>
                <CenterLeft1 />
              </dv-border-box-12>
            </div>
            <div>
              <dv-border-box-1>
                <Center />
              </dv-border-box-1>
            </div>
            <div>
              <dv-border-box-12>
                <CenterRight1 />
              </dv-border-box-12>
            </div>
          </div>

          <div class="bototm-box">
            <dv-border-box-13>
              <BottomLeft />
            </dv-border-box-13>
            <dv-border-box-12>
              <BottomRight />
            </dv-border-box-12>
          </div>
        </div>
      </div>
    </div>
    
    <MusicPlayer :songs="bgmList" :default-volume="0.2" :auto-play="true" />
  </div>
</template>

<style lang="scss" scoped>
// @import '#/assets/scss/index.scss';
#index {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1920px;
  height: 1080px;
  color: #d3d6dd;
  transform: translate(-50%, -50%);
  transform-origin: left top;

  .bg {
    width: 100%;
    height: 100%;
    padding: 16px 16px 0;
    background-image: url('../../../assets/pageBg.png');
    background-position: center center;
    background-size: cover;
  }

  .host-body {

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

    // 第二行
    .aside-width {
      width: 40%;
    }

    .react-r-s,
    .react-l-s {
      background-color: #0f1325;
    }

    // 平行四边形
    .react-right {
      width: 300px;
      font-size: 18px;
      line-height: 50px;
      text-align: center;
      transform: skewX(-45deg);

      &.react-l-s {
        width: 500px;
        text-align: right;
      }

      .react-after {
        position: absolute;
        top: 0;
        right: -25px;
        width: 50px;
        height: 50px;
        background-color: #0f1325;
        transform: skewX(45deg);
      }

      .text {
        display: inline-block;
        transform: skewX(45deg);
      }
    }

    .react-left {
      width: 300px;
      height: 50px;
      font-size: 18px;
      line-height: 50px;
      text-align: center;
      background-color: #0f1325;
      transform: skewX(45deg);

      &.react-l-s {
        width: 500px;
        text-align: left;
      }

      .react-before {
        position: absolute;
        top: 0;
        left: -25px;
        width: 50px;
        height: 50px;
        background-color: #0f1325;
        transform: skewX(-45deg);
      }

      .text {
        display: inline-block;
        transform: skewX(-45deg);
      }
    }

    .body-box {
      display: flex;
      flex-direction: column;
      margin-top: 16px;

      //下方区域的布局
      .content-box {
        display: grid;
        grid-template-columns: 2fr 5fr 2fr;
      }

      // 底部数据
      .bototm-box {
        display: grid;
        grid-template-columns: repeat(2, 50%);
        margin-top: 10px;
      }
    }
  }
}
</style>
