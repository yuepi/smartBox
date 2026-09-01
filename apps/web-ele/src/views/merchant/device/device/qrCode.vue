<script lang="ts" setup>
import type { QrcodeData } from '#/api/device/device';

import {
  batchDownDeviceQrcodeFileApi,
  batchDownDeviceQrcodeJsonApi,
  downOneDeviceQrcodeJsonApi,
} from '#/api/device/device';

const visible = ref(false);
const loading = ref(false);
const qrcodeList = ref<QrcodeData[]>([]);
const mode = ref<number>(0); // 0=展示, 1=下载（但下载直接走文件流，这里主要用于展示）

// 单条展示
async function showSingle(deviceId: number) {
  mode.value = 0;
  loading.value = true;
  visible.value = true;
  qrcodeList.value = [];
  try {
    const res = await downOneDeviceQrcodeJsonApi(deviceId);
    qrcodeList.value = res || [];
  } catch {
    ElMessage.error('获取二维码失败');
  } finally {
    loading.value = false;
  }
}

// 单条下载
async function downloadSingle(item: QrcodeData) {
  try {
    const url = item.base64QrCode || item.qrCodeUrl;
    if (!url) {
      ElMessage.warning('该二维码暂无下载链接');
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = `${item.qrCode || 'qrCode'}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    ElMessage.success('下载成功');
  } catch {
    ElMessage.error('下载失败');
  }
}

// 批量展示
async function showBatch(deviceIds: number[]) {
  if (!deviceIds || deviceIds.length === 0) {
    ElMessage.warning('请先选择设备');
    return;
  }
  mode.value = 0;
  loading.value = true;
  visible.value = true;
  qrcodeList.value = [];
  try {
    const res = await batchDownDeviceQrcodeJsonApi(deviceIds);
    qrcodeList.value = res || [];
    if (qrcodeList.value.length === 0) {
      ElMessage.info('暂无二维码数据');
    }
  } catch {
    ElMessage.error('获取二维码失败');
  } finally {
    loading.value = false;
  }
}

// 批量下载（打包成 zip）
async function downloadBatch(deviceIds: number[]) {
  if (!deviceIds || deviceIds.length === 0) {
    ElMessage.warning('请先选择设备');
    return;
  }
  loading.value = true;
  try {
    const blob = await batchDownDeviceQrcodeFileApi(deviceIds);
    const blobData = blob.data || blob;
    let downloadName = `qrcodes_${Date.now()}.zip`;
    const contentDisposition = blob.headers?.['content-disposition'];
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(
        /filename\*?=['"]?(?:UTF-8'')?([^"';]+)['"]?/i,
      );
      if (fileNameMatch && fileNameMatch[1]) {
        downloadName = decodeURIComponent(fileNameMatch[1]);
      }
    }
    const url = window.URL.createObjectURL(new Blob([blobData]));
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadName;
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    ElMessage.success('下载成功');
  } catch {
    ElMessage.error('批量下载失败');
  } finally {
    loading.value = false;
  }
}

// 关闭弹窗
function handleClose() {
  visible.value = false;
  qrcodeList.value = [];
}

// 暴露方法
defineExpose({
  showSingle,
  showBatch,
  downloadBatch,
});
</script>

<template>
  <el-dialog
    v-model="visible"
    title="设备二维码"
    width="900px"
    append-to-body
    class="rounded-xl"
    @close="handleClose"
  >
    <div v-loading="loading" class="min-height-[400px]">
      <el-scrollbar max-height="550px" always>
        <div v-if="qrcodeList.length === 0 && !loading" class="py-12">
          <el-empty description="暂无二维码数据" />
        </div>
        <div
          v-else
          class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2"
        >
          <div
            v-for="(item, index) in qrcodeList"
            :key="item.qrCode || index"
            class="group relative bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-3 border border-gray-100 dark:border-zinc-700 transition-all hover:shadow-md hover:border-primary/30"
          >
            <div class="mb-2">
              <div
                class="text-[11px] text-gray-400 uppercase tracking-wider mb-1"
              >
                QR Code No.
              </div>
              <div
                class="text-xs font-mono font-bold text-gray-700 dark:text-gray-200 truncate"
                :title="item.qrCode"
              >
                {{ item.qrCode || '-' }}
              </div>
            </div>
            <div
              class="relative aspect-square bg-white rounded-md overflow-hidden border border-gray-200 shadow-inner group-hover:border-primary/20"
            >
              <el-image
                :src="item.base64QrCode || item.qrCodeUrl"
                fit="contain"
                class="w-full h-full p-2"
                :preview-src-list="
                  qrcodeList.map((i) => i.base64QrCode || i.qrCodeUrl)
                "
                :initial-index="index"
                preview-teleported
              >
                <template #placeholder>
                  <div
                    class="flex items-center justify-center h-full bg-gray-50 text-gray-400"
                  >
                    <el-icon class="is-loading">
                      <Loading />
                    </el-icon>
                  </div>
                </template>
              </el-image>
              <div
                class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
              >
                <el-icon color="white" :size="24">
                  <View />
                </el-icon>
              </div>
            </div>
            <div class="mt-3">
              <el-button
                type="primary"
                plain
                size="small"
                class="w-full !rounded-md"
                icon="Download"
                @click="downloadSingle(item)"
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
        <span class="text-xs text-gray-400"
          >提示：点击图片可查看高清大图并轮播</span
        >
        <el-button @click="handleClose" class="!rounded-md">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>
