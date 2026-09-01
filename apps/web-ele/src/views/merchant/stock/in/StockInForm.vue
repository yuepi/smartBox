<script lang="ts" setup>
import type { StockIn } from '#/api/stock/stockIn';
import type { StockInItem } from '#/api/stock/stockInItem';

import { addStockInApi, editStockInApi } from '#/api/stock/stockIn';
import { getWarehouseListApi } from '#/api/stock/warehouse';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const { stock_package_type } = useDicts(['stock_package_type']);

const visible = ref(false);
const title = ref('');
const loading = ref(false);
const formData = ref<Partial<StockIn>>({
  inStatus: 0,
  items: [],
});

// 明细行
const itemRows = ref<Partial<StockInItem>[]>([
  { packageType: 0, inWeight: 0, costUnitPrice: 0, costAmount: 0 },
]);

const warehouseOptions = ref<{ label: string; value: number }[]>([]);

async function loadWarehouseOptions() {
  try {
    const res = await getWarehouseListApi({ status: 0 });
    warehouseOptions.value = (res || []).map((item) => ({
      label: item.warehouseName,
      value: item.warehouseId,
    }));
  } catch {
    console.error('加载仓库列表失败');
  }
}

// 计算明细金额
function calcItemAmount(index: number) {
  const item = itemRows.value[index];
  item.costAmount =
    item && item.inWeight && item.costUnitPrice
      ? Number((item.inWeight * item.costUnitPrice).toFixed(2))
      : 0;
}

// 添加明细行
function addItemRow() {
  itemRows.value.push({
    packageType: 0,
    inWeight: 0,
    costUnitPrice: 0,
    costAmount: 0,
  });
}

// 删除明细行
function removeItemRow(index: number) {
  if (itemRows.value.length > 1) {
    itemRows.value.splice(index, 1);
  } else {
    ElMessage.warning('至少保留一行明细');
  }
}

function open(row?: StockIn) {
  if (row?.stockInId) {
    title.value = '编辑入库单';
    formData.value = { ...row };
    // 加载明细数据
    if (row.items) {
      itemRows.value = row.items.map((item) => ({ ...item }));
    }
  } else {
    title.value = '新增入库单';
    formData.value = { inStatus: 0 };
    itemRows.value = [
      { packageType: 0, inWeight: 0, costUnitPrice: 0, costAmount: 0 },
    ];
  }
  loadWarehouseOptions();
  visible.value = true;
}

async function handleSubmit() {
  if (!formData.value.warehouseId) {
    ElMessage.warning('请选择仓库');
    return;
  }

  // 组装明细数据
  formData.value.items = itemRows.value.filter(
    (item) => item.inWeight && item.inWeight > 0,
  );

  if (formData.value.items.length === 0) {
    ElMessage.warning('请至少添加一条有效明细');
    return;
  }

  loading.value = true;
  try {
    const api = formData.value.stockInId ? editStockInApi : addStockInApi;
    await api(formData.value);
    ElMessage.success(formData.value.stockInId ? '修改成功' : '新增成功');
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
  <el-dialog v-model="visible" :title="title" width="800px" append-to-body>
    <el-form :model="formData" label-width="100px">
      <el-form-item label="仓库" required>
        <el-select
          v-model="formData.warehouseId"
          placeholder="请选择"
          style="width: 100%"
        >
          <el-option
            v-for="item in warehouseOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="备注">
        <el-input
          v-model="formData.remark"
          type="textarea"
          :rows="2"
          placeholder="请输入备注"
        />
      </el-form-item>

      <!-- 明细表格 -->
      <div class="mb-2">
        <span class="text-sm font-medium">入库明细</span>
        <el-button
          type="primary"
          plain
          size="small"
          class="ml-2"
          @click="addItemRow"
          >添加行</el-button
        >
      </div>

      <el-table :data="itemRows" border stripe style="width: 100%">
        <el-table-column label="品类" width="130" align="center">
          <template #default="{ row, $index }">
            <el-select
              v-model="row.packageType"
              placeholder="请选择"
              size="small"
            >
              <el-option
                v-for="item in stock_package_type"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="入库重量(kg)" width="160" align="center">
          <template #default="{ row, $index }">
            <el-input-number
              v-model="row.inWeight"
              :min="0"
              :precision="2"
              :controls="false"
              size="small"
              style="width: 100%"
              @change="calcItemAmount($index)"
            />
          </template>
        </el-table-column>
        <el-table-column label="成本单价(元/kg)" width="160" align="center">
          <template #default="{ row, $index }">
            <el-input-number
              v-model="row.costUnitPrice"
              :min="0"
              :precision="2"
              :controls="false"
              size="small"
              style="width: 100%"
              @change="calcItemAmount($index)"
            />
          </template>
        </el-table-column>
        <el-table-column label="成本金额(元)" width="150" align="center">
          <template #default="{ row }">
            {{ row.costAmount?.toFixed(2) || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" align="center">
          <template #default="{ $index }">
            <el-button
              link
              type="danger"
              icon="Delete"
              size="small"
              @click="removeItemRow($index)"
            />
          </template>
        </el-table-column>
      </el-table>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit"
        >确定</el-button
      >
    </template>
  </el-dialog>
</template>
