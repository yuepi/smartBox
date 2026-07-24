<script lang="ts" setup>
const visible = ref(false);
const qrcodeUrl = ref('');

function open(url: string) {
  qrcodeUrl.value = url;
  visible.value = true;
}

function downloadImage() {
  if (qrcodeUrl.value) {
    const link = document.createElement('a');
    link.href = qrcodeUrl.value;
    link.download = 'qrcode.png';
    link.click();
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="包袋二维码" width="400px" append-to-body center>
    <div class="flex justify-center">
      <img v-if="qrcodeUrl" :src="qrcodeUrl" alt="二维码" style="width: 200px; height: 200px" />
      <el-empty v-else description="暂无二维码" />
    </div>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" @click="downloadImage">下载</el-button>
    </template>
  </el-dialog>
</template>
