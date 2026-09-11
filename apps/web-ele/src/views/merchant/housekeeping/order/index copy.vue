<script lang="ts" setup>
import type { HomeOrder, HomeOrderStatus } from '#/api/system/housekeeping';

import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import {
  acceptHomeOrderApi,
  cancelHomeOrderApi,
  finishHomeOrderApi,
  getHomeOrderListApi,
  refundHomeOrderApi,
  startHomeOrderApi,
} from '#/api/system/housekeeping';

const loading = ref(false);
const rawList = ref<HomeOrder[]>([]);
const activeTab = ref<string>('all');

// 状态映射配置
const statusConfig: Record<HomeOrderStatus, { label: string; type: any }> = {
  0: { label: '未支付', type: 'info' },
  1: { label: '待接单', type: 'warning' },
  2: { label: '已接单', type: 'primary' },
  3: { label: '服务中', type: 'primary' },
  4: { label: '已完成', type: 'success' },
  6: { label: '已取消', type: 'info' },
  7: { label: '退款中', type: 'danger' },
};

// 获取列表数据
async function loadData() {
  loading.value = true;
  try {
    const res = await getHomeOrderListApi();
    rawList.value = res || [];
  } catch (error) {
    console.error(error);
    ElMessage.error('获取家政订单失败');
  } finally {
    loading.value = false;
  }
}

// 依据 Tab 过滤
const filteredList = computed(() => {
  if (activeTab.value === 'pending') {
    return rawList.value.filter((item) => item.status === 1);
  }
  if (activeTab.value === 'processing') {
    return rawList.value.filter((item) => [2, 3].includes(item.status));
  }
  if (activeTab.value === 'completed') {
    return rawList.value.filter((item) => item.status === 4);
  }
  if (activeTab.value === 'refund') {
    return rawList.value.filter((item) => [6, 7].includes(item.status));
  }
  return rawList.value;
});

// 4.2 接单
async function handleAccept(row: HomeOrder) {
  await ElMessageBox.confirm('确认接单吗？', '提示', { type: 'info' });
  await acceptHomeOrderApi(row.homeOrderId);
  ElMessage.success('接单成功');
  loadData();
}

// 4.3 开始服务
async function handleStart(row: HomeOrder) {
  await ElMessageBox.confirm('确认开始服务吗？', '提示', { type: 'info' });
  await startHomeOrderApi(row.homeOrderId);
  ElMessage.success('服务已开始');
  loadData();
}

// 4.4 完成结算
async function handleFinish(row: HomeOrder) {
  await ElMessageBox.confirm('确认已完成服务并结算吗？完成结算后款项将划入账户。', '提示', { type: 'warning' });
  await finishHomeOrderApi(row.homeOrderId);
  ElMessage.success('订单已完成结算');
  loadData();
}

// 4.5 取消订单
async function handleCancel(row: HomeOrder) {
  await ElMessageBox.confirm('确认取消该订单吗？已支付订单将发起退款。', '警告', { type: 'warning' });
  await cancelHomeOrderApi(row.homeOrderId);
  ElMessage.success('订单已取消');
  loadData();
}

// 4.6 执行退款
async function handleRefund(row: HomeOrder) {
  await ElMessageBox.confirm('确认同意并退款给用户吗？退款将直接返还至会员钱包。', '退款确认', { type: 'warning' });
  await refundHomeOrderApi(row.homeOrderId);
  ElMessage.success('退款成功');
  loadData();
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="p-4 bg-white rounded-md">
    <div class="flex justify-between items-center mb-4">
      <el-tabs v-model="activeTab" class="demo-tabs">
        <el-tab-pane label="全部订单" name="all" />
        <el-tab-pane label="待接单" name="pending" />
        <el-tab-pane label="处理中" name="processing" />
        <el-tab-pane label="已完成" name="completed" />
        <el-tab-pane label="退款/取消" name="refund" />
      </el-tabs>
      <el-button type="primary" icon="Refresh" @click="loadData">刷新列表</el-button>
    </div>

    <el-table v-loading="loading" :data="filteredList" border stripe style="width: 100%">
      <el-table-column prop="homeOrderId" label="订单ID" width="100" align="center" />
      <el-table-column prop="itemName" label="服务项目" min-width="150" show-overflow-tooltip />
      <el-table-column prop="memberName" label="客户" width="120" />
      <el-table-column prop="memberPhone" label="联系电话" width="130" align="center" />
      <el-table-column prop="payAmount" label="支付金额" width="110" align="center">
        <template #default="{ row }">
          <span class="text-red-500 font-bold">￥{{ row.payAmount ?? 0 }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="statusConfig[row.status]?.type" size="small">
            {{ statusConfig[row.status]?.label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="appointmentTime" label="预约时间" width="170" align="center" />
      <el-table-column prop="address" label="服务地址" min-width="180" show-overflow-tooltip />

      <el-table-column label="操作" width="220" fixed="right" align="center">
        <template #default="{ row }">
          <div class="action-buttons">
            <!-- 待接单：状态 1 -->
            <el-button v-if="row.status === 1" size="small" type="primary" @click="handleAccept(row)">
              接单
            </el-button>

            <!-- 已接单：状态 2 -->
            <el-button v-if="row.status === 2" size="small" type="primary" @click="handleStart(row)">
              开始服务
            </el-button>

            <!-- 服务中：状态 3 -->
            <el-button v-if="row.status === 3" size="small" type="success" @click="handleFinish(row)">
              完成结算
            </el-button>

            <!-- 退款中：状态 7 -->
            <el-button v-if="row.status === 7" size="small" type="danger" @click="handleRefund(row)">
              退款
            </el-button>

            <!-- 待接单/处理中允许取消：状态 1, 2, 3 -->
            <el-button
              v-if="[1, 2, 3].includes(row.status)"
              size="small"
              type="warning"
              @click="handleCancel(row)"
            >
              取消
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>