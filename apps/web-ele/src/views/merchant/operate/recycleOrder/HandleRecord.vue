<!-- src/views/merchant/operate/recycleOrder/HandleRecord.vue -->
<script lang="ts" setup>

import { getHandleRecordListApi } from '#/api/operation/recycleOrder';

const visible = ref(false);
const loading = ref(false);
const recordList = ref<any[]>([]);
const orderNo = ref('');

// 操作类型映射
const operateTypeMap: Record<string, { label: string; type: string }> = {
  abnormal: { label: '违规处理', type: 'danger' },
  audit: { label: '审核', type: 'primary' },
  cancel: { label: '取消异常', type: 'success' },
  directComplete: { label: '直接完成', type: 'success' },
  weight: { label: '补重/扣重', type: 'warning' },
  remark: { label: '添加备注', type: 'info' },
  create: { label: '创建订单', type: 'info' },
};

function getOperateTypeLabel(type: string): string {
  return operateTypeMap[type]?.label || type;
}

function getOperateTypeTag(type: string): string {
  return operateTypeMap[type]?.type || 'info';
}

async function open(row: { orderNo: string; recycleOrderId: number; }) {
  orderNo.value = row.orderNo;
  visible.value = true;
  loading.value = true;
  recordList.value = [];
  try {
    const res = await getHandleRecordListApi(row.recycleOrderId);
    recordList.value = res || [];
  } catch {
    ElMessage.error('获取操作记录失败');
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" :title="`操作记录 - ${orderNo}`" width="700px" append-to-body>
    <div v-loading="loading">
      <el-table :data="recordList" border stripe style="width: 100%">
        <el-table-column prop="operateType" label="操作类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getOperateTypeTag(row.operateType)" size="small" round effect="light">
              {{ getOperateTypeLabel(row.operateType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="operateDesc" label="操作描述" min-width="180" show-overflow-tooltip />
        <el-table-column prop="operatorName" label="操作人" width="120" align="center" />
        <el-table-column prop="operatorRole" label="角色" width="120" align="center" />
        <el-table-column prop="createdTime" label="操作时间" width="170" align="center" />
      </el-table>
      <el-empty v-if="!loading && recordList.length === 0" description="暂无操作记录" />
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
