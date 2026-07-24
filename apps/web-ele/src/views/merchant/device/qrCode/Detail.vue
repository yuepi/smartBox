<script lang="ts" setup>
import type { Qrcode } from '#/api/device/qrCode';

import { getQrcodeDetailApi } from '#/api/device/qrCode';

const { qrcode_type, qrcode_bind_status, qrcode_status } = useDicts([
  'qrcode_type',
  'qrcode_bind_status',
  'qrcode_status'
]);

const visible = ref(false);
const detailData = ref<null | Qrcode>(null);

async function open(qrcodeId: number) {
  visible.value = true;
  detailData.value = null;
  try {
    const res = await getQrcodeDetailApi(qrcodeId);
    detailData.value = res;
  } catch {
    ElMessage.error('获取详情失败');
    visible.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="二维码详情" width="800px" append-to-body>
    <el-descriptions :column="2" border v-if="detailData">
      <el-descriptions-item label="二维码ID">
        {{ detailData.qrcodeId }}
      </el-descriptions-item>
      <el-descriptions-item label="二维码编号">
        {{ detailData.qrcodeCode }}
      </el-descriptions-item>
      <el-descriptions-item label="二维码类型">
        <DictTag :options="qrcode_type" :value="detailData.qrcodeType" />
      </el-descriptions-item>
      <el-descriptions-item label="绑定状态">
        <DictTag :options="qrcode_bind_status" :value="detailData.bindFlag" />
      </el-descriptions-item>
      <el-descriptions-item label="绑定业务ID">
        {{ detailData.bizId || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="状态">
        <DictTag :options="qrcode_status" :value="detailData.status" />
      </el-descriptions-item>
      <el-descriptions-item label="二维码地址" :span="2">
        <el-link :href="detailData.qrcodeUrl" target="_blank" type="primary">
          {{ detailData.qrcodeUrl || '-' }}
        </el-link>
      </el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
