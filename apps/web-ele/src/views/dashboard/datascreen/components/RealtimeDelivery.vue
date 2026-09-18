<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';

import { formatTime } from '#/utils/index';

interface Item {
  id: string;
  phone: string;
  category: string;
  weight: number;
  amount: number;
  time: string;
}

const list = ref<Item[]>([]);
let timer: NodeJS.Timeout | null = null;

// 垃圾分类及其权重区间与单价设置
const categories = [
  { name: '塑料', unitPrice: 1.2, class: 'cat-plastic' },
  { name: '纸类', unitPrice: 0.8, class: 'cat-paper' },
  { name: '金属', unitPrice: 2.5, class: 'cat-metal' },
  { name: '织物', unitPrice: 0.5, class: 'cat-fabric' },
  { name: '厨余', unitPrice: 0.1, class: 'cat-kitchen' },
  { name: '有害', unitPrice: 0, class: 'cat-hazard' },
];

const phonePrefixes = [
  '135',
  '137',
  '138',
  '139',
  '150',
  '158',
  '178',
  '182',
  '187',
  '189',
];

const generatePhone = () => {
  const prefix =
    phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)];
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}****${suffix}`;
};

const generate = (customDate?: Date): Item => {
  const cat = categories[Math.floor(Math.random() * categories.length)];
  const weight = Number((Math.random() * 2.5 + 0.3).toFixed(2));
  const amount = Number((weight * cat.unitPrice).toFixed(2));

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    phone: generatePhone(),
    category: cat.name,
    weight,
    amount,
    // 注意：格式化模板必须使用小写 yyyy 与 dd
    time: formatTime(customDate || new Date(), 'yyyy-MM-dd HH:mm:ss'),
  };
};

// 随机 10s ~ 20s 触发更新
const scheduleNextUpdate = () => {
  const randomDelay = Math.floor(Math.random() * 10_000) + 10_000;
  timer = setTimeout(() => {
    list.value.unshift(generate());
    if (list.value.length > 25) {
      list.value.pop();
    }
    scheduleNextUpdate();
  }, randomDelay);
};

onMounted(() => {
  // 初始化 12 条递减时间的数据
  const initialData: Item[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const pastTime = new Date(
      now.getTime() - (i * 360 + Math.floor(Math.random() * 240)) * 1000,
    );
    initialData.push(generate(pastTime));
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
        <span class="card-title">实时投递动态</span>
      </div>
      <span class="header-tip">实时监控</span>
    </div>

    <div class="table-header">
      <span class="col-phone">手机号</span>
      <span class="col-cat">品类</span>
      <span class="col-weight">重量(kg)</span>
      <span class="col-amount">环保金(元)</span>
      <span class="col-time">投递时间</span>
    </div>

    <div class="scroll-wrap">
      <TransitionGroup name="list" tag="div" class="list-container">
        <div v-for="item in list" :key="item.id" class="row-item">
          <span class="col-phone">{{ item.phone }}</span>
          <span class="col-cat">
            <i class="cat-tag">{{ item.category }}</i>
          </span>
          <span class="col-weight">{{ item.weight.toFixed(2) }}</span>
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
      background-color: #00d8ff;
      border-radius: 50%;
      box-shadow: 0 0 8px #00d8ff;
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
  grid-template-columns: 1fr 0.8fr 0.8fr 0.9fr 1.4fr;
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
  grid-template-columns: 1fr 0.8fr 0.8fr 0.9fr 1.4fr;
  gap: 6px;
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

  .col-cat {
    .cat-tag {
      padding: 1px 5px;
      font-size: 11px;
      font-style: normal;
      color: #22c55e;
      background: rgb(34 197 94 / 12%);
      border: 1px solid rgb(34 197 94 / 25%);
      border-radius: 3px;
    }
  }

  .col-weight {
    font-weight: 500;
    color: #fbbf24;
  }

  .col-amount {
    font-weight: 600;
    color: #f472b6;
  }

  .col-time {
    font-family: DIN, monospace, sans-serif;
    font-size: 11px;
    color: #64748b;
  }
}

/* 列表插入动画 */
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
