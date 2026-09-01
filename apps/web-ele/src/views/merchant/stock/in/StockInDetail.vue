<script lang="ts" setup>
import type { StockIn } from '#/api/stock/stockIn';
import type { StockInItem } from '#/api/stock/stockInItem';

import { getStockInDetailApi } from '#/api/stock/stockIn';
import { getStockInItemListByStockInIdApi } from '#/api/stock/stockInItem';

const { stock_in_status } = useDicts(['stock_in_status']);

const visible = ref(false);
const loading = ref(false);
const detailData = ref<null | StockIn>(null);
const itemList = ref<StockInItem[]>([]);

async function open(row: StockIn) {
  visible.value = true;
  loading.value = true;
  try {
    const [detailRes, itemRes] = await Promise.all([
      getStockInDetailApi(row.stockInId),
      getStockInItemListByStockInIdApi(row.stockInId),
    ]);
    detailData.value = detailRes;
    itemList.value = itemRes || [];
  } catch {
    ElMessage.error('获取详情失败');
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="入库单详情" width="800px" append-to-body>
    <div v-loading="loading">
      <!-- 基本信息 -->
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="入库单号">{{
          detailData.inNo
        }}</el-descriptions-item>
        <el-descriptions-item label="入库状态">
          <DictTag :options="stock_in_status" :value="detailData.inStatus" />
        </el-descriptions-item>
        <el-descriptions-item label="总重量"
          >{{ detailData.totalWeight?.toFixed(2) }} kg</el-descriptions-item
        >
        <el-descriptions-item label="总成本"
          >¥ {{ detailData.totalCostAmount?.toFixed(2) }}</el-descriptions-item
        >
        <el-descriptions-item label="操作人">{{
          detailData.operateUserName || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="完成时间">{{
          detailData.finishTime || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{
          detailData.remark || '-'
        }}</el-descriptions-item>
      </el-descriptions>

      <!-- 明细列表 -->
      <div class="mt-4">
        <div class="text-sm font-medium mb-2">入库明细</div>
        <el-table :data="itemList" border stripe style="width: 100%">
          <el-table-column
            prop="packageType"
            label="品类"
            width="120"
            align="center"
          >
            <template #default="{ row }">
              <DictTag :options="stock_package_type" :value="row.packageType" />
            </template>
          </el-table-column>
          <el-table-column
            prop="inWeight"
            label="入库重量(kg)"
            width="140"
            align="center"
          >
            <template #default="{ row }">
              {{ row.inWeight?.toFixed(2) || 0 }}
            </template>
          </el-table-column>
          <el-table-column
            prop="costUnitPrice"
            label="成本单价(元/kg)"
            width="150"
            align="center"
          >
            <template #default="{ row }">
              {{ row.costUnitPrice?.toFixed(2) || 0 }}
            </template>
          </el-table-column>
          <el-table-column
            prop="costAmount"
            label="成本金额(元)"
            width="150"
            align="center"
          >
            <template #default="{ row }">
              {{ row.costAmount?.toFixed(2) || 0 }}
            </template>
          </el-table-column>
          <el-table-column
            prop="locationId"
            label="货位ID"
            width="100"
            align="center"
          >
            <template #default="{ row }">
              {{ row.locationId || '-' }}
            </template>
          </el-table-column>
        </el-table>
        <el-empty
          v-if="!loading && itemList.length === 0"
          description="暂无明细数据"
        />
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>
