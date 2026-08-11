<!-- components/DeviceImagePreview.vue -->
<script lang="ts" setup>
import type { DeviceHatch } from '#/api/device/deviceHatch';

import { operateDeviceApi } from '#/api/device/device';
import { getDeviceHatchListApi } from '#/api/device/deviceHatch';

const emit = defineEmits<{
  (e: 'success'): void;
  (e: 'close'): void;
}>();

interface ImageItem {
  hatchId?: number;
  hatchName?: string;
  imageUrl: string;
  loading: boolean;
  errorMsg: string;
}

const visible = ref(false);
const globalLoading = ref(false);
const deviceId = ref(0);
const opType = ref<7 | 13>(7);
const dialogTitle = ref('');

// Tab 选中的索引字符串
const activeTab = ref<string>('0');
// 抓拍/截图 图像数据数组
const imageList = ref<ImageItem[]>([]);

// 轮询控制
const MAX_ATTEMPTS = 12; // 30秒超时
const timers = ref<Map<string, ReturnType<typeof setTimeout>>>(new Map());

const clearAllTimers = () => {
  timers.value.forEach((timer) => clearTimeout(timer));
  timers.value.clear();
};

// 轮询获取单张图片
const pollImageForHatch = (
  targetDeviceId: number,
  type: 7 | 13,
  hatchId?: number,
  attempts = 0,
  key = 'default'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (attempts >= MAX_ATTEMPTS) {
      reject(new Error('获取图片超时，请重试'));
      return;
    }

    operateDeviceApi({
      operateType: type,
      deviceId: targetDeviceId,
      ...(hatchId ? { deviceHatchId: hatchId } : {}),
    })
      .then((res) => {
        if (res?.screenshotReady === true && res?.imageUrl) {
          resolve(res.imageUrl);
        } else if (res?.screenshotReady === false) {
          const timer = setTimeout(() => {
            pollImageForHatch(targetDeviceId, type, hatchId, attempts + 1, key)
              .then(resolve)
              .catch(reject);
          }, 2500);
          timers.value.set(key, timer);
        } else {
          reject(new Error('获取图片失败'));
        }
      })
      .catch(reject);
  });
};

/**
 * 极简调用方法：外部无需传任何仓口参数！
 * @param id 设备ID
 * @param type 7=屏幕截图 | 13=桶内抓拍
 */
const open = async (id: number, type: 7 | 13) => {
  clearAllTimers();
  deviceId.value = id;
  opType.value = type;
  dialogTitle.value = type === 7 ? '屏幕截图' : '桶内抓拍';
  imageList.value = [];
  activeTab.value = '0';
  visible.value = true;
  globalLoading.value = true;

  try {
    // 场景 A：屏幕截图 (7) —— 绝对不查仓口，直接单图请求
    if (type === 7) {
      imageList.value = [{ hatchName: '设备屏幕', imageUrl: '', loading: true, errorMsg: '' }];
      globalLoading.value = false;

      const url = await pollImageForHatch(id, type, undefined, 0, 'screen');
      imageList.value[0].imageUrl = url;
      imageList.value[0].loading = false;
      return;
    }

    // 场景 B：桶内抓拍 (13) —— 组件内部自主查询仓口
    const hatchesRes = await getDeviceHatchListApi({ deviceId: id, status: 0 });
    const hatches: DeviceHatch[] = hatchesRes || [];

    if (hatches.length === 0) {
      // 若设备没配置仓口，兜底走单张无仓口 ID 请求
      imageList.value = [{ hatchName: '桶内画面', imageUrl: '', loading: true, errorMsg: '' }];
      globalLoading.value = false;

      const url = await pollImageForHatch(id, type, undefined, 0, 'no-hatch');
      imageList.value[0].imageUrl = url;
      imageList.value[0].loading = false;
    } else {
      // 查到几个仓口，就自动并发请求几个仓口
      imageList.value = hatches.map((h) => ({
        hatchId: h.deviceHatchId,
        hatchName: h.hatchName || `仓口 ${h.deviceHatchId}`,
        imageUrl: '',
        loading: true,
        errorMsg: '',
      }));
      globalLoading.value = false;

      // 并发轮询所有仓口
      hatches.forEach(async (hatch, index) => {
        const key = `hatch-${hatch.deviceHatchId}`;
        try {
          const url = await pollImageForHatch(id, type, hatch.deviceHatchId, 0, key);
          if (imageList.value[index]) {
            imageList.value[index].imageUrl = url;
            imageList.value[index].loading = false;
          }
        } catch (error: any) {
          if (imageList.value[index]) {
            imageList.value[index].loading = false;
            imageList.value[index].errorMsg = error?.message || '抓拍失败';
          }
        }
      });
    }
  } catch (error: any) {
    globalLoading.value = false;
    ElMessage.error(error?.message || '初始化失败');
  }
};

// 重新抓拍单个节点
const handleRetryItem = async (index: number) => {
  const item = imageList.value[index];
  if (!item) return;

  item.loading = true;
  item.errorMsg = '';
  const key = item.hatchId ? `hatch-${item.hatchId}` : 'retry';

  try {
    const url = await pollImageForHatch(deviceId.value, opType.value, item.hatchId, 0, key);
    item.imageUrl = url;
  } catch (error: any) {
    item.errorMsg = error?.message || '抓拍失败';
  } finally {
    item.loading = false;
  }
};

const handleClose = () => {
  clearAllTimers();
  visible.value = false;
  emit('close');
};

defineExpose({ open, close: handleClose });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="650px"
    append-to-body
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- 全局连接状态 -->
    <div v-if="globalLoading" class="flex flex-col items-center justify-center py-12">
      <el-icon class="is-loading text-4xl text-primary"><Loading /></el-icon>
      <span class="text-gray-400 mt-4">正在读取设备仓口配置...</span>
    </div>

    <!-- 预览与展示 -->
    <div v-else>
      <!-- 多仓口自动生成 Tab 页签 -->
      <el-tabs v-if="imageList.length > 1" v-model="activeTab" type="card">
        <el-tab-pane
          v-for="(item, idx) in imageList"
          :key="item.hatchId || idx"
          :label="item.hatchName"
          :name="String(idx)"
        />
      </el-tabs>

      <!-- 图像展示区域 -->
      <template v-for="(item, idx) in imageList" :key="idx">
        <div v-show="String(idx) === activeTab" class="py-2">
          <!-- 1. 加载中 -->
          <div v-if="item.loading" class="flex flex-col items-center justify-center py-10">
            <el-icon class="is-loading text-4xl text-primary"><Loading /></el-icon>
            <span class="text-gray-400 mt-4">正在获取 {{ item.hatchName }} 照片...</span>
            <span class="text-xs text-gray-400 mt-2">预计等待 3-10 秒</span>
          </div>

          <!-- 2. 失败 -->
          <div v-else-if="item.errorMsg" class="flex flex-col items-center justify-center py-10">
            <el-icon class="text-4xl text-danger"><CircleClose /></el-icon>
            <span class="text-gray-500 mt-4">{{ item.errorMsg }}</span>
            <el-button class="mt-4" type="primary" size="small" @click="handleRetryItem(idx)">
              重新抓拍
            </el-button>
          </div>

          <!-- 3. 图片结果 -->
          <div v-else-if="item.imageUrl" class="flex justify-center">
            <el-image
              :src="item.imageUrl"
              fit="contain"
              style="max-width: 100%; max-height: 480px;"
              :preview-src-list="imageList.map((i) => i.imageUrl).filter(Boolean)"
              preview-teleported
            />
          </div>

          <!-- 4. 空状态 -->
          <div v-else class="py-10 flex justify-center">
            <el-empty description="暂无图片数据" />
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
      <el-button
        v-if="imageList[Number(activeTab)]?.imageUrl"
        type="primary"
        @click="window.open(imageList[Number(activeTab)].imageUrl, '_blank')"
      >
        查看原图
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.is-loading {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }

  to { transform: rotate(360deg); }
}
</style>
