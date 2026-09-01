<script lang="ts">
import { defineComponent, onMounted, onUnmounted, reactive, ref } from 'vue';

import { formatTime } from '#/utils/index';

interface DeliveryNotice {
  id: number;
  userPhone: string; // 脱敏手机号
  deviceId: string; // 设备编号
  weight: number; // 投递重量(kg)
  amount: number; // 预计金额(元)
  time: string; // 投递时间
  category: string; // 垃圾类型
}

export default defineComponent({
  setup() {
    // ===== 模拟数据生成 =====
    const categories = [
      '可回收',
      '厨余',
      '有害',
      '其他',
      '玻璃',
      '金属',
      '纸张',
      '塑料',
    ];
    const devices = [
      'A9HPG6EZXJR',
      'XK3M9N7WQPL',
      'B2D5F8H1JKL',
      'C4E7G0I3MNO',
      'D6F9H2J5PQR',
      'E8G1K4M7STU',
      'F0H3L6N9VWX',
      'G2J5M8P2YZA',
    ];
    const phones = [
      '138****1234',
      '159****5678',
      '177****9012',
      '136****3456',
      '188****7890',
      '150****2345',
      '139****6789',
      '158****0123',
      '176****4567',
      '137****8901',
      '152****3456',
      '186****7890',
    ];

    // 生成一条投递通知
    const generateNotice = (): DeliveryNotice => {
      const weight = +(Math.random() * 4 + 0.5).toFixed(1); // 0.5-4.5 kg
      const pricePerKg = +(Math.random() * 2 + 1).toFixed(1); // 1-3 元/kg
      return {
        id: Date.now() + Math.random() * 1000,
        userPhone: phones[Math.floor(Math.random() * phones.length)],
        deviceId: devices[Math.floor(Math.random() * devices.length)],
        weight,
        amount: +(weight * pricePerKg).toFixed(2),
        time: formatTime(new Date(), 'HH:mm:ss'),
        category: categories[Math.floor(Math.random() * categories.length)],
      };
    };

    // 初始生成3条
    const notices = reactive<DeliveryNotice[]>([]);
    let intervalInstance: any = null;
    const isPaused = ref(false);

    const addNotice = () => {
      const newNotice = generateNotice();
      notices.unshift(newNotice);
      // 保留最多20条
      if (notices.length > 20) {
        notices.pop();
      }
    };

    // 初始化几条数据
    const initNotices = () => {
      for (let i = 0; i < 8; i++) {
        const notice = generateNotice();
        // 时间往前推几分钟
        const date = new Date();
        date.setMinutes(date.getMinutes() - i * 3);
        notice.time = formatTime(date, 'HH:mm:ss');
        notices.push(notice);
      }
    };

    onMounted(() => {
      initNotices();
      // 每3-6秒随机新增一条
      intervalInstance = setInterval(
        () => {
          if (!isPaused.value) {
            addNotice();
          }
        },
        3000 + Math.random() * 3000,
      );
    });

    onUnmounted(() => {
      clearInterval(intervalInstance);
    });

    // 鼠标悬停暂停滚动
    const onMouseEnter = () => {
      isPaused.value = true;
    };
    const onMouseLeave = () => {
      isPaused.value = false;
    };

    return {
      notices,
      onMouseEnter,
      onMouseLeave,
    };
  },
});
</script>

<template>
  <div class="h-[450px] w-full rounded-lg">
    <div class="flex h-[450px] flex-col rounded-lg bg-black/60 p-4">
      <!-- 标题区域 -->
      <div class="mb-2 flex items-center gap-2">
        <i class="iconfont icon-tongji4 text-cyan-400"></i>
        <span class="text-white">实时投递动态</span>
        <dv-decoration-3 style="width: 100px; height: 20px" />
        <span class="ml-auto text-xs text-gray-400">实时更新</span>
      </div>

      <!-- 通知列表 -->
      <div
        class="flex-1 overflow-hidden rounded bg-black/30 p-2"
        @mouseenter="onMouseEnter"
        @mouseleave="onMouseLeave"
      >
        <div class="scroll-container h-full overflow-y-auto pr-1">
          <div
            v-for="item in notices"
            :key="item.id"
            class="mb-2 rounded bg-cyan-500/5 p-2 transition-all hover:bg-cyan-500/15"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-cyan-300">{{
                  item.userPhone
                }}</span>
                <span class="text-xs text-gray-400">在</span>
                <span
                  class="rounded bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-300"
                >
                  {{ item.deviceId }}
                </span>
              </div>
              <span class="text-xs text-gray-400">{{ item.time }}</span>
            </div>
            <div class="mt-1 flex items-center gap-3 text-sm">
              <span>
                投递
                <span class="font-bold text-yellow-300">{{ item.weight }}</span>
                kg
              </span>
              <!-- <span class="text-gray-500">|</span>
              <span class="rounded bg-green-500/20 px-1.5 py-0.5 text-xs text-green-300">
                {{ item.category }}
              </span> -->
              <span class="ml-auto">
                预计
                <span class="font-bold text-lime-400"
                  >¥{{ item.amount.toFixed(2) }}</span
                >
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scroll-container {
  scroll-behavior: smooth;

  /* 滚动条样式 */
  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: rgb(255 255 255 / 5%);
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgb(34 211 238 / 30%);
    border-radius: 2px;
  }
}
</style>
