<script lang="ts" setup>
import type { RecycleOrder } from '#/api/operation/recycleOrder';

import { getRecycleOrderPageApi } from '#/api/operation/recycleOrder';
import { getRecentDays } from '#/utils/date';

const { order_status } = useDicts(['order_status']);

const visible = ref(false);
const loading = ref(false);
const memberId = ref(0);
const memberName = ref('');
const orders = ref<RecycleOrder[]>([]);

async function open(row: { memberId: number }) {
  memberId.value = row.memberId;
  memberName.value = `会员ID: ${row.memberId}`;
  visible.value = true;
  loading.value = true;

  const { startTime, endTime } = getRecentDays(7);
  try {
    const res = await getRecycleOrderPageApi({
      memberId: row.memberId,
      startTime,
      endTime,
      pageNo: 1,
      pageSize: 10,
    });
    orders.value = res.records || [];
  } catch {
    ElMessage.error('获取近期订单失败');
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="`近期订单 - ${memberName}`"
    width="900px"
    append-to-body
    @close="orders = []"
  >
    <div v-loading="loading">
      <el-table :data="orders" border stripe style="width: 100%">
        <el-table-column
          prop="orderNo"
          label="订单编号"
          min-width="200"
          align="center"
          show-overflow-tooltip
        />
        <el-table-column
          prop="weight"
          label="投递重量"
          width="110"
          align="center"
        >
          <template #default="{ row }"
            >{{ row.weight?.toFixed(2) || 0 }} kg</template
          >
        </el-table-column>
        <el-table-column
          prop="realAmount"
          label="实际金额"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <span class="font-medium text-primary"
              >¥ {{ (row.realAmount || 0).toFixed(2) }}</span
            >
          </template>
        </el-table-column>
        <el-table-column
          prop="orderStatus"
          label="订单状态"
          width="100"
          align="center"
        >
          <template #default="{ row }">
            <DictTag :options="order_status" :value="row.orderStatus" />
          </template>
        </el-table-column>
        <el-table-column
          prop="createdTime"
          label="创建时间"
          width="160"
          align="center"
        />
      </el-table>
      <div v-if="orders.length === 0 && !loading" class="text-center py-8">
        <el-empty description="近7天暂无订单" :image-size="80" />
      </div>
    </div>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
