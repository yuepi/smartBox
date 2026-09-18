<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';

import { formatTime } from '#/utils/index';

interface RecordItem {
  id: string;
  phone: string;
  amount: number;
  time: string;
}

const list = ref<RecordItem[]>([]);
let timer: NodeJS.Timeout | null = null;

// 扩充手机号库及号段
const phonePrefixes = ['135', '137', '138', '139', '150', '158', '178', '182', '187', '189'];
const generatePhone = () => {
  const prefix = phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)];
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}****${suffix}`;
};

// 生成偏小额提现金额（0.5元 ~ 30元）
const generateAmount = () => {
  const isSlightlyLarger = Math.random() < 0.1; // 10% 概率出现 15~30 元
  const amount = isSlightlyLarger
    ? Math.random() * 15 + 15
    : Math.random() * 14.5 + 0.5;
  return Number(amount.toFixed(2));
};

const generateRecord = (customDate?: Date): RecordItem => {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    phone: generatePhone(),
    amount: generateAmount(),
    // 使用标准全日期格式 YYYY-MM-DD HH:mm:ss
    time: formatTime(customDate || new Date(), 'yyyy-MM-dd HH:mm:ss'),
  };
};

// 递归定时器：较慢的随机间隔 (18s ~ 28s) 更新
const scheduleNextUpdate = () => {
  const randomDelay = Math.floor(Math.random() * 10_000) + 18_000;
  timer = setTimeout(() => {
    list.value.unshift(generateRecord());
    if (list.value.length > 25) {
      list.value.pop();
    }
    scheduleNextUpdate();
  }, randomDelay);
};

onMounted(() => {
  // 初始填充 12 条递减时间的数据
  const initialData: RecordItem[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const pastTime = new Date(now.getTime() - (i * 450 + Math.floor(Math.random() * 300)) * 1000);
    initialData.push(generateRecord(pastTime));
  }
  list.value = initialData;

  // 开启随机轮询
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
        <span class="card-title">实时提现动态</span>
      </div>
      <span class="header-tip">实时更新</span>
    </div>

    <div class="table-header">
      <span class="col-phone">用户手机</span>
      <span class="col-amount">提现金额</span>
      <span class="col-time">提现时间</span>
    </div>

    <div class="scroll-wrap">
      <TransitionGroup name="list" tag="div" class="list-container">
        <div
          v-for="item in list"
          :key="item.id"
          class="row-item"
        >
          <span class="col-phone">{{ item.phone }}</span>
          <span class="col-amount">¥{{ item.amount.toFixed(2) }}</span>
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
      background-color: #22c55e;
      border-radius: 50%;
      box-shadow: 0 0 8px #22c55e;
      animation: pulse 2s infinite ease-in-out;
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
  grid-template-columns: 1fr 0.8fr 1.5fr;
  gap: 8px;
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
  grid-template-columns: 1fr 0.8fr 1.5fr;
  gap: 8px;
  align-items: center;
  padding: 7px 8px;
  font-size: 12px;
  text-align: center;
  border-bottom: 1px dashed rgb(0 216 255 / 8%);
  transition: all 0.3s ease;

  .col-phone {
    font-family: monospace;
    color: #7dd3fc;
  }

  .col-amount {
    font-weight: 600;
    color: #22c55e;
  }

  .col-time {
    font-family: DIN, monospace, sans-serif;
    font-size: 11px;
    color: #64748b;
  }
}

/* 过渡插入动画 */
.list-enter-active {
  transition: all 0.6s ease;
}

.list-enter-from {
  background: rgb(0 216 255 / 18%);
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
