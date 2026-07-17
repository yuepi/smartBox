<script lang="ts" setup>
import type { BatchQrcodeData } from '#/api/device/qrCode';

import { batchDownQrcodeJsonApi } from '#/api/device/qrCode';

const emit = defineEmits<{
  (e: 'download', item: BatchQrcodeData): void;
}>();
const visible = ref(false);
const loading = ref(false);
const title = ref('');
const qrcodeList = ref<BatchQrcodeData[]>([]);

async function open(qrcodeIds: number[], dialogTitle: string) {
  title.value = dialogTitle;
  loading.value = true;
  visible.value = true;
  qrcodeList.value = [];

  try {
    const res = await batchDownQrcodeJsonApi({ qrcodeIds });
    qrcodeList.value = res || [];
  } catch {
    // 错误已由拦截器处理
  } finally {
    loading.value = false;
  }
}

function handleDownload(item: BatchQrcodeData) {
  emit('download', item);
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" :title="title" width="900px" append-to-body class="rounded-xl">
    <div v-loading="loading" class="min-height-[400px]">
      <el-scrollbar max-height="550px" always>
        <div v-if="qrcodeList.length === 0 && !loading" class="py-12">
          <el-empty description="暂无二维码数据" />
        </div>
        <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
          <div
            v-for="(item, index) in qrcodeList"
            :key="item.qrcodeId || index"
            class="group relative bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-3 border border-gray-100 dark:border-zinc-700 transition-all hover:shadow-md hover:border-primary/30"
          >
            <div class="mb-2">
              <div class="text-[11px] text-gray-400 uppercase tracking-wider mb-1">
                QR Code No.
              </div>
              <div
                class="text-xs font-mono font-bold text-gray-700 dark:text-gray-200 truncate"
                :title="item.qrcodeCode"
              >
                {{ item.qrcodeCode }}
              </div>
            </div>
            <div
              class="relative aspect-square bg-white rounded-md overflow-hidden border border-gray-200 shadow-inner group-hover:border-primary/20"
            >
              <el-image
                :src="item.base64QrCode || item.qrcodeUrl"
                fit="contain"
                class="w-full h-full p-2"
                :preview-src-list="qrcodeList.map((i) => i.base64QrCode || i.qrcodeUrl)"
                :initial-index="index"
                preview-teleported
              >
                <template #placeholder>
                  <div class="flex items-center justify-center h-full bg-gray-50 text-gray-400">
                    <el-icon class="is-loading"><Loading /></el-icon>
                  </div>
                </template>
              </el-image>
              <div
                class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
              >
                <el-icon color="white" :size="24"><View /></el-icon>
              </div>
            </div>
            <div class="mt-3">
              <el-button
                type="primary"
                plain
                size="small"
                class="w-full !rounded-md"
                :icon="Download"
                @click="handleDownload(item)"
              >
                下载单图
              </el-button>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <template #footer>
      <div class="flex justify-between items-center px-2">
        <span class="text-xs text-gray-400">提示：点击图片可查看高清大图并轮播</span>
        <el-button @click="visible = false" class="!rounded-md">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>
