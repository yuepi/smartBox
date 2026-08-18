<script lang="ts" setup>
import type { StockOut } from '#/api/stock/stockOut';
import type { StockOutItem } from '#/api/stock/stockOutItem';

import { getCustomerListApi } from '#/api/stock/customer';
import { addStockOutApi, editStockOutApi } from '#/api/stock/stockOut';
import { getWarehouseListApi } from '#/api/stock/warehouse';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const { stock_package_type } = useDicts(['stock_package_type']);

const visible = ref(false);
const title = ref('');
const loading = ref(false);
const formData = ref<Partial<StockOut>>({
  outStatus: 0,
  items: [],
});

const itemRows = ref<Partial<StockOutItem>[]>([
  { packageType: 0, outWeight: 0, saleUnitPrice: 0, saleAmount: 0 },
]);

const warehouseOptions = ref<{ label: string; value: number }[]>([]);
const customerOptions = ref<{ label: string; value: number }[]>([]);

async function loadOptions() {
  try {
    const [warehouseRes, customerRes] = await Promise.all([
      getWarehouseListApi({ status: 0 }),
      getCustomerListApi({ status: 0 }),
    ]);
    warehouseOptions.value = (warehouseRes || []).map((item) => ({
      label: item.warehouseName,
      value: item.warehouseId,
    }));
    customerOptions.value = (customerRes || []).map((item) => ({
      label: item.customerName,
      value: item.customerId,
    }));
  } catch {
    console.error('加载选项失败');
  }
}

function calcItemAmount(index: number) {
  const item = itemRows.value[index];
  item.saleAmount = item && item.outWeight && item.saleUnitPrice ? Number((item.outWeight * item.saleUnitPrice).toFixed(2)) : 0;
}

function addItemRow() {
  itemRows.value.push({
    packageType: 0,
    outWeight: 0,
    saleUnitPrice: 0,
    saleAmount: 0,
  });
}

function removeItemRow(index: number) {
  if (itemRows.value.length > 1) {
    itemRows.value.splice(index, 1);
  } else {
    ElMessage.warning('至少保留一行明细');
  }
}

function open(row?: StockOut) {
  if (row?.stockOutId) {
    title.value = '编辑出库单';
    formData.value = { ...row };
    if (row.items) {
      itemRows.value = row.items.map((item) => ({ ...item }));
    }
  } else {
    title.value = '新增出库单';
    formData.value = { outStatus: 0 };
    itemRows.value = [{ packageType: 0, outWeight: 0, saleUnitPrice: 0, saleAmount: 0 }];
  }
  loadOptions();
  visible.value = true;
}

async function handleSubmit() {
  if (!formData.value.warehouseId) {
    ElMessage.warning('请选择仓库');
    return;
  }
  if (!formData.value.customerId) {
    ElMessage.warning('请选择回收商');
    return;
  }

  formData.value.items = itemRows.value.filter((item) => item.outWeight && item.outWeight > 0);
  if (formData.value.items.length === 0) {
    ElMessage.warning('请至少添加一条有效明细');
    return;
  }

  loading.value = true;
  try {
    const api = formData.value.stockOutId ? editStockOutApi : addStockOutApi;
    await api(formData.value);
    ElMessage.success(formData.value.stockOutId ? '修改成功' : '新增成功');
    visible.value = false;
    emit('success');
  } catch {
    ElMessage.error('操作失败');
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" :title="title" width="850px" append-to-body>
    <el-form :model="formData" label-width="100px">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="仓库" required>
            <el-select v-model="formData.warehouseId" placeholder="请选择" style="width: 100%">
              <el-option
                v-for="item in warehouseOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="回收商" required>
            <el-select v-model="formData.customerId" placeholder="请选择" style="width: 100%">
              <el-option
                v-for="item in customerOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="备注">
        <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="请输入备注" />
      </el-form-item>

      <!-- 明细表格 -->
      <div class="mb-2">
        <span class="text-sm font-medium">出库明细</span>
        <el-button type="primary" plain size="small" class="ml-2" @click="addItemRow">添加行</el-button>
      </div>

      <el-table :data="itemRows" border stripe style="width: 100%">
        <el-table-column label="品类" width="130" align="center">
          <template #default="{ row }">
            <el-select v-model="row.packageType" placeholder="请选择" size="small">
              <el-option
                v-for="item in stock_package_type"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="出库重量(kg)" width="160" align="center">
          <template #default="{ row, $index }">
            <el-input-number
              v-model="row.outWeight"
              :min="0"
              :precision="2"
              :controls="false"
              size="small"
              style="width: 100%"
              @change="calcItemAmount($index)"
            />
          </template>
        </el-table-column>
        <el-table-column label="销售单价(元/kg)" width="160" align="center">
          <template #default="{ row, $index }">
            <el-input-number
              v-model="row.saleUnitPrice"
              :min="0"
              :precision="2"
              :controls="false"
              size="small"
              style="width: 100%"
              @change="calcItemAmount($index)"
            />
          </template>
        </el-table-column>
        <el-table-column label="销售金额(元)" width="150" align="center">
          <template #default="{ row }">
            {{ row.saleAmount?.toFixed(2) || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ $index }">
            <el-button link type="danger" icon="Delete" size="small" @click="removeItemRow($index)" />
          </template>
        </el-table-column>
      </el-table>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
