<script lang="ts" setup>
import { ref } from 'vue';

const visible = ref(false);
const detailData = ref<any>({});

function open(row: any) {
  detailData.value = row;
  visible.value = true;
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="违规记录详情" width="650px" destroy-on-close>
    <el-descriptions :column="2" border>
      <el-descriptions-item label="违规编号">{{ detailData.sortViolationId }}</el-descriptions-item>
      <el-descriptions-item label="包袋二维码">{{ detailData.bagQrCode }}</el-descriptions-item>
      <el-descriptions-item label="违规类型">{{ detailData.violationType || '-' }}</el-descriptions-item>
      <el-descriptions-item label="状态">{{ detailData.status || '-' }}</el-descriptions-item>
      <el-descriptions-item label="登记时间" :span="2">{{ detailData.createdTime }}</el-descriptions-item>
      <el-descriptions-item label="违规描述" :span="2">{{ detailData.violationDesc || '-' }}</el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
