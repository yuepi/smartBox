<script lang="ts" setup>
import type { CleanTask } from '#/api/operation/cleanTask';

import { getCleanTaskDetailApi } from '#/api/operation/cleanTask';

const { task_status } = useDicts(['task_status']);

const visible = ref(false);
const detailData = ref<CleanTask | null>(null);

async function open(row: CleanTask) {
  visible.value = true;
  try {
    const res = await getCleanTaskDetailApi(row.cleanTaskId);
    detailData.value = res;
  } catch {
    ElMessage.error('获取详情失败');
    visible.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    title="清运任务详情"
    width="600px"
    append-to-body
  >
    <el-descriptions :column="2" border v-if="detailData">
      <el-descriptions-item label="任务单号" :span="2">
        {{ detailData.taskNo }}
      </el-descriptions-item>
      <el-descriptions-item label="所属小区">
        {{ detailData.deptName || detailData.deptId || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="设备名称">
        {{ detailData.deviceName || detailData.deviceId || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="仓口号">
        {{ detailData.hatchNo ? `${detailData.hatchNo}` : '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="满仓重量">
        {{ detailData.fullWeight?.toFixed(2) || 0 }} kg
      </el-descriptions-item>
      <el-descriptions-item label="清运人员">
        {{ detailData.cleanUserName || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="计划时间">
        {{ detailData.planTime || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="完成时间">
        {{ detailData.finishTime || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="任务状态">
        <DictTag :options="task_status" :value="detailData.taskStatus" />
      </el-descriptions-item>
      <el-descriptions-item label="备注" :span="2">
        {{ detailData.remark || '-' }}
      </el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
