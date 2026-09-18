<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';

import { formatTime } from '#/utils/index';

interface ClearanceItem {
  id: string;
  location: string;
  weight: number;
  time: string;
  status: string;
}

const list = ref<ClearanceItem[]>([]);
let timer: NodeJS.Timeout | null = null;

// 从图片中提取的所有点位名称
const baseLocations = [
  '幸福佳苑',
  '格林郡府',
  '四季花语',
  '河北东方学院',
  '馨语星苑',
  '花语馨苑',
  '阳光馨苑',
  '荣盛华府',
  '翰林名晟',
  '锦绣花苑',
  '君兰苑',
  '江南水郡',
  '紫荆假日',
  '锦绣家园',
  '桃李观邸',
  '锦绣天悦',
  '花语璟园',
  '晓廊坊',
  '豪邸坊',
  '和平郡府',
];

const pointSuffixes = ['1号站', '2號清运点', '集置点', '回收站', '提包点'];

const getRandomLocation = () => {
  const base = baseLocations[Math.floor(Math.random() * baseLocations.length)];
  const suffix = pointSuffixes[Math.floor(Math.random() * pointSuffixes.length)];
  return `${base}${suffix}`;
};

const generateRecord = (customDate?: Date): ClearanceItem => {
  // 模拟一次清运包袋的重量：15.0kg ~ 85.0kg
  const weight = Number((Math.random() * 70 + 15).toFixed(1));

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    location: getRandomLocation(),
    weight,
    status: '已清运',
    // 使用小写 yyyy 与 dd
    time: formatTime(customDate || new Date(), 'yyyy-MM-dd HH:mm:ss'),
  };
};

// 递归定时器：长间隔 (25s ~ 60s) 随机轮询，符合清运师傅现场操作节奏
const scheduleNextUpdate = () => {
  const randomDelay = Math.floor(Math.random() * 35_000) + 25_000;
  timer = setTimeout(() => {
    list.value.unshift(generateRecord());
    if (list.value.length > 20) {
      list.value.pop();
    }
    scheduleNextUpdate();
  }, randomDelay);
};

onMounted(() => {
  // 初始生成 10 条递减时间的数据，清运间隔通常在 15 ~ 40 分钟左右
  const initialData: ClearanceItem[] = [];
  const now = new Date();
  for (let i = 0; i < 10; i++) {
    const pastTime = new Date(
      now.getTime() - (i * 1800 + Math.floor(Math.random() * 900)) * 1000,
    );
    initialData.push(generateRecord(pastTime));
  }
  list.value = initialData;

  scheduleNextUpdate();
});

onUnmounted(() => {
  if (timer) clearTimeout(timer);
});
</script>

<template>
  <div class="tech-card">
    <div class="card-header">
      <div class="title-wrapper">
        <span class="live-dot"></span>
        <span class="card-title">实时清运动态</span>
      </div>
      <span class="header-tip">作业监控</span>
    </div>

    <div class="table-header">
      <span class="col-location">清运点位</span>
      <span class="col-weight">清运重量</span>
      <span class="col-status">状态</span>
      <span class="col-time">完成时间</span>
    </div>

    <div class="scroll-wrap">
      <TransitionGroup name="list" tag="div" class="list-container">
        <div v-for="item in list" :key="item.id" class="row-item">
          <span class="col-location" :title="item.location">{{ item.location }}</span>
          <span class="col-weight">{{ item.weight.toFixed(1) }} <small>kg</small></span>
          <span class="col-status">
            <i class="status-tag">{{ item.status }}</i>
          </span>
          <span class="col-time">{{ item.time }}</span>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tech-card {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 12px 14px;
  background: rgb(10 30 60 / 65%);
  border: 1px solid rgb(0 216 255 / 25%);
  border-radius: 6px;
  box-shadow: inset 0 0 15px rgb(0 216 255 / 10%);
  backdrop-filter: blur(10px);
}

.card-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid rgb(0 216 255 / 15%);

  .title-wrapper {
    display: flex;
    gap: 8px;
    align-items: center;

    .live-dot {
      width: 6px;
      height: 6px;
      background-color: #fbbf24;
      border-radius: 50%;
      box-shadow: 0 0 8px #fbbf24;
      animation: pulse 2.5s infinite ease-in-out;
    }

    .card-title {
      font-size: 15px;
      font-weight: bold;
      color: #e2f8ff;
      letter-spacing: 0.5px;
    }
  }

  .header-tip {
    font-size: 11px;
    color: rgb(0 216 255 / 60%);
  }
}

.table-header {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: 1.6fr 0.9fr 0.7fr 1.4fr;
  gap: 6px;
  padding: 6px 8px;
  margin: 8px 0 4px;
  font-size: 12px;
  color: #8fa3c0;
  text-align: center;
  background: rgb(0 216 255 / 8%);
  border-radius: 4px;
}

.scroll-wrap {
  flex: 1;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgb(0 216 255 / 25%);
    border-radius: 2px;
  }
}

.list-container {
  display: flex;
  flex-direction: column;
}

.row-item {
  display: grid;
  grid-template-columns: 1.6fr 0.9fr 0.7fr 1.4fr;
  gap: 6px;
  align-items: center;
  padding: 7px 8px;
  font-size: 12px;
  text-align: center;
  border-bottom: 1px dashed rgb(0 216 255 / 8%);
  transition: all 0.3s ease;

  .col-location {
    overflow: hidden;
    text-overflow: ellipsis;
    color: #38bdf8;
    text-align: left;
    white-space: nowrap;
  }

  .col-weight {
    font-weight: 600;
    color: #fbbf24;

    small {
      font-size: 10px;
      font-weight: normal;
      color: #94a3b8;
    }
  }

  .col-status {
    .status-tag {
      padding: 1px 4px;
      font-size: 10px;
      font-style: normal;
      color: #00d8ff;
      background: rgb(0 216 255 / 10%);
      border: 1px solid rgb(0 216 255 / 25%);
      border-radius: 3px;
    }
  }

  .col-time {
    font-family: DIN, monospace, sans-serif;
    font-size: 11px;
    color: #64748b;
  }
}

/* 列表滑动与淡入动画 */
.list-enter-active {
  transition: all 0.8s ease;
}

.list-enter-from {
  background: rgb(0 216 255 / 15%);
  opacity: 0;
  transform: translateY(-12px);
}

@keyframes pulse {
  0% {
    opacity: 0.4;
    transform: scale(0.9);
  }

  50% {
    opacity: 1;
    transform: scale(1.2);
  }

  100% {
    opacity: 0.4;
    transform: scale(0.9);
  }
}
</style>
