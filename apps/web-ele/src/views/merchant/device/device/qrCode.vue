<script lang="ts" setup>
import { ref } from "vue";
import { ElMessage } from "element-plus";
import { Download } from "@element-plus/icons-vue";
import { getQrcodeListApi } from '#/api/device/qrCode';
import type { Qrcode } from '#/api/device/qrCode';
import { downOneDeviceQrcodeFileApi, downOneDeviceQrcodeJsonApi } from "#/api/device/device";

const visible = ref(false);
const deviceId = ref<number>();
const qrcodeList = ref<Qrcode[]>([]);
const loading = ref(false);

async function open(row: any) {
  visible.value = true;
  deviceId.value = row.deviceId;
  try {
    loading.value = true;
    const res = await getQrcodeListApi({ deviceId: row.deviceId });
    qrcodeList.value = res || [];
  } catch {
    ElMessage.error("获取二维码失败");
  } finally {
    loading.value = false;
  }
}

async function downloadSingleImage(item: Qrcode) {
  try {
    await downOneDeviceQrcodeFileApi(item.qrcodeId);
    ElMessage.success("图片导出成功");
  } catch {}
}

async function downloadSingleJson(item: Qrcode) {
  try {
    await downOneDeviceQrcodeJsonApi(item.qrcodeId);
    ElMessage.success("JSON配置导出成功");
  } catch {}
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="设备二维码资产清单" width="680px" append-to-body>
    <div v-loading="loading" class="min-h-[200px] p-2">
      <el-empty v-if="!qrcodeList.length" description="暂无关联二维码" />
      <div v-else class="grid grid-cols-3 gap-4">
        <div v-for="item in qrcodeList" :key="item.qrcodeId" class="border border-gray-100 rounded p-2 flex flex-col items-center bg-gray-50/50">
          <el-image :src="item.qrcodeUrl" :preview-src-list="qrcodeList.map(q => q.qrcodeUrl)" class="w-32 h-32 rounded shadow-inner" fit="cover" />
          <span class="text-xs text-gray-500 mt-2 font-medium">通道: {{ item.channelNo }}</span>
          <div class="flex gap-1 w-full mt-2">
            <el-button type="primary" size="small" plain class="flex-1" :icon="Download" @click="downloadSingleImage(item)">图片</el-button>
            <el-button type="success" size="small" plain class="flex-1" :icon="Download" @click="downloadSingleJson(item)">JSON</el-button>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>
