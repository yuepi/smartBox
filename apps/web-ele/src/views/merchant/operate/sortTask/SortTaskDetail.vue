<script lang="ts" setup>
import type { SortTask } from '#/api/operation/sortTask';

import { getSortTaskDetailApi } from '#/api/operation/sortTask';

const { sort_status } = useDicts(['sort_status']);

const visible = ref(false);
const detailData = ref<null | SortTask>(null);

async function open(row: SortTask) {
  visible.value = true;
  try {
    const res = await getSortTaskDetailApi(row.sortTaskId);
    detailData.value = res;
  } catch {
    ElMessage.error('获取详情失败');
    visible.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="分拣任务详情" width="600px" append-to-body>
    <el-descriptions :column="2" border v-if="detailData">
      <el-descriptions-item label="分拣单号" :span="2">{{ detailData.sortNo }}</el-descriptions-item>
      <el-descriptions-item label="关联清运任务">{{ detailData.cleanTaskId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="设备名称">{{ detailData.deviceName || detailData.deviceId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="仓口号">{{ detailData.hatchNo || detailData.hatchId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="包袋编号">{{ detailData.deviceBagNo || detailData.deviceBagId || '-' }}</el-descriptions-item>
      <el-descriptions-item label="总重量">{{ detailData.totalWeight?.toFixed(2) || 0 }} kg</el-descriptions-item>
      <el-descriptions-item label="分拣重量">
        <span class="font-bold text-primary">{{ detailData.realWeight?.toFixed(2) || 0 }} kg</span>
      </el-descriptions-item>
      <el-descriptions-item label="分拣人员">{{ detailData.sortUserName || '-' }}</el-descriptions-item>
      <el-descriptions-item label="分拣状态">
        <DictTag :options="sort_status" :value="detailData.sortStatus" />
      </el-descriptions-item>
      <el-descriptions-item label="完成时间">{{ detailData.sortTime || '-' }}</el-descriptions-item>
      <el-descriptions-item label="备注" :span="2">{{ detailData.remark || '-' }}</el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
