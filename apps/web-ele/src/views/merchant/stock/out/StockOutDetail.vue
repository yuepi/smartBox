<script lang="ts" setup>
import type { StockOut } from '#/api/stock/stockOut';
import type { StockOutItem } from '#/api/stock/stockOutItem';

import { getStockOutDetailApi } from '#/api/stock/stockOut';
import { getStockOutItemListByStockOutIdApi } from '#/api/stock/stockOutItem';

const { stock_out_status } = useDicts(['stock_out_status']);

const visible = ref(false);
const loading = ref(false);
const detailData = ref<null | StockOut>(null);
const itemList = ref<StockOutItem[]>([]);

async function open(row: StockOut) {
  visible.value = true;
  loading.value = true;
  try {
    const [detailRes, itemRes] = await Promise.all([
      getStockOutDetailApi(row.stockOutId),
      getStockOutItemListByStockOutIdApi(row.stockOutId),
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
  <el-dialog v-model="visible" title="出库单详情" width="800px" append-to-body>
    <div v-loading="loading">
      <!-- 基本信息 -->
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="出库单号">{{
          detailData.outNo
        }}</el-descriptions-item>
        <el-descriptions-item label="出库状态">
          <DictTag :options="stock_out_status" :value="detailData.outStatus" />
        </el-descriptions-item>
        <el-descriptions-item label="总重量"
          >{{ detailData.totalOutWeight?.toFixed(2) }} kg</el-descriptions-item
        >
        <el-descriptions-item label="销售总金额"
          >¥ {{ detailData.totalSaleAmount?.toFixed(2) }}</el-descriptions-item
        >
        <el-descriptions-item label="回收商">{{
          detailData.customerId || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="操作人">{{
          detailData.operateUserName || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="出库时间">{{
          detailData.outTime || '-'
        }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{
          detailData.remark || '-'
        }}</el-descriptions-item>
      </el-descriptions>

      <!-- 明细列表 -->
      <div class="mt-4">
        <div class="text-sm font-medium mb-2">出库明细</div>
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
            prop="outWeight"
            label="出库重量(kg)"
            width="140"
            align="center"
          >
            <template #default="{ row }">
              {{ row.outWeight?.toFixed(2) || 0 }}
            </template>
          </el-table-column>
          <el-table-column
            prop="saleUnitPrice"
            label="销售单价(元/kg)"
            width="150"
            align="center"
          >
            <template #default="{ row }">
              {{ row.saleUnitPrice?.toFixed(2) || 0 }}
            </template>
          </el-table-column>
          <el-table-column
            prop="saleAmount"
            label="销售金额(元)"
            width="150"
            align="center"
          >
            <template #default="{ row }">
              {{ row.saleAmount?.toFixed(2) || 0 }}
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
