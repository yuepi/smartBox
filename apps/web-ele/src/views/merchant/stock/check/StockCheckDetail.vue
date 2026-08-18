<script lang="ts" setup>
import type { StockCheck } from '#/api/stock/stockCheck';
import type { StockCheckItem } from '#/api/stock/stockCheckItem';

import { getStockCheckDetailApi } from '#/api/stock/stockCheck';
import { getStockCheckItemListByStockCheckIdApi } from '#/api/stock/stockCheckItem';

const { stock_check_type, stock_check_status, stock_package_type } = useDicts([
  'stock_check_type',
  'stock_check_status',
  'stock_package_type',
]);

const visible = ref(false);
const loading = ref(false);
const detailData = ref<null | StockCheck>(null);
const itemList = ref<StockCheckItem[]>([]);

async function open(row: StockCheck) {
  visible.value = true;
  loading.value = true;
  try {
    const [detailRes, itemRes] = await Promise.all([
      getStockCheckDetailApi(row.stockCheckId),
      getStockCheckItemListByStockCheckIdApi(row.stockCheckId),
    ]);
    detailData.value = detailRes;
    itemList.value = itemRes || [];
  } catch {
    ElMessage.error('获取详情失败');
  } finally {
    loading.value = false;
  }
}

// 计算汇总
const summary = computed(() => {
  let totalProfit = 0;
  let totalLoss = 0;
  itemList.value.forEach((item) => {
    totalProfit += item.profitWeight || 0;
    totalLoss += item.lossWeight || 0;
  });
  return { totalProfit, totalLoss };
});

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="盘点单详情" width="850px" append-to-body>
    <div v-loading="loading">
      <!-- 基本信息 -->
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="盘点单号">{{ detailData.checkNo }}</el-descriptions-item>
        <el-descriptions-item label="盘点类型">
          <DictTag :options="stock_check_type" :value="detailData.checkType" />
        </el-descriptions-item>
        <el-descriptions-item label="盘点状态">
          <DictTag :options="stock_check_status" :value="detailData.checkStatus" />
        </el-descriptions-item>
        <el-descriptions-item label="盘点人">{{ detailData.checkUserName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="盘点时间">{{ detailData.checkTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="计划完成时间">{{ detailData.planFinishTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="盘盈总重">
          <span class="text-success">{{ detailData.totalProfitWeight?.toFixed(2) || 0 }} kg</span>
        </el-descriptions-item>
        <el-descriptions-item label="盘亏总重">
          <span class="text-danger">{{ detailData.totalLossWeight?.toFixed(2) || 0 }} kg</span>
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detailData.remark || '-' }}</el-descriptions-item>
      </el-descriptions>

      <!-- 明细列表 -->
      <div class="mt-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium">盘点明细</span>
          <span class="text-xs text-gray-400">
            盘盈: <span class="text-success">{{ summary.totalProfit.toFixed(2) }}</span> kg
            | 盘亏: <span class="text-danger">{{ summary.totalLoss.toFixed(2) }}</span> kg
          </span>
        </div>
        <el-table :data="itemList" border stripe style="width: 100%">
          <el-table-column prop="locationId" label="货位ID" width="100" align="center">
            <template #default="{ row }">
              {{ row.locationId || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="packageType" label="品类" width="120" align="center">
            <template #default="{ row }">
              <DictTag :options="stock_package_type" :value="row.packageType" />
            </template>
          </el-table-column>
          <el-table-column prop="stockWeight" label="账面重量(kg)" width="130" align="center">
            <template #default="{ row }">
              {{ row.stockWeight?.toFixed(2) || 0 }}
            </template>
          </el-table-column>
          <el-table-column prop="realWeight" label="实际重量(kg)" width="130" align="center">
            <template #default="{ row }">
              {{ row.realWeight?.toFixed(2) || 0 }}
            </template>
          </el-table-column>
          <el-table-column prop="profitWeight" label="盘盈(kg)" width="120" align="center">
            <template #default="{ row }">
              <span class="text-success">{{ row.profitWeight?.toFixed(2) || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="lossWeight" label="盘亏(kg)" width="120" align="center">
            <template #default="{ row }">
              <span class="text-danger">{{ row.lossWeight?.toFixed(2) || 0 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="reason" label="差异原因" min-width="150">
            <template #default="{ row }">
              {{ row.reason || '-' }}
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!loading && itemList.length === 0" description="暂无明细数据" />
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
