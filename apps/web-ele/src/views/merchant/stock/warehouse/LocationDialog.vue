<script lang="ts" setup>
import type { Warehouse } from '#/api/stock/warehouse';
import type { WarehouseLocation } from '#/api/stock/warehouseLocation';

import {
  deleteWarehouseLocationApi,
  getWarehouseLocationListApi,
} from '#/api/stock/warehouseLocation';

const { stock_package_type, default_status } = useDicts(['stock_package_type', 'default_status']);

const visible = ref(false);
const loading = ref(false);
const currentWarehouse = ref<null | Warehouse>(null);
const locationList = ref<WarehouseLocation[]>([]);

// 表单
const formVisible = ref(false);
const formTitle = ref('');
const formLoading = ref(false);
const formData = ref<Partial<WarehouseLocation>>({
  status: 0,
  packageType: 0,
  maxWeight: 0,
});

async function loadLocationList() {
  if (!currentWarehouse.value) return;
  loading.value = true;
  try {
    const res = await getWarehouseLocationListApi({
      warehouseId: currentWarehouse.value.warehouseId,
      status: 0,
    });
    locationList.value = res || [];
  } catch {
    ElMessage.error('加载货位列表失败');
  } finally {
    loading.value = false;
  }
}

function open(row: Warehouse) {
  currentWarehouse.value = row;
  visible.value = true;
  loadLocationList();
}

function handleAdd() {
  formTitle.value = '新增货位';
  formData.value = {
    warehouseId: currentWarehouse.value?.warehouseId,
    status: 0,
    packageType: 0,
    maxWeight: 0,
  };
  formVisible.value = true;
}

function handleEdit(row: WarehouseLocation) {
  formTitle.value = '编辑货位';
  formData.value = { ...row };
  formVisible.value = true;
}

async function handleDelete(row: WarehouseLocation) {
  try {
    await ElMessageBox.confirm(`确定要删除货位【${row.locationName}】吗？`, '提示', { type: 'warning' });
    await deleteWarehouseLocationApi(row.warehouseLocationId);
    ElMessage.success('删除成功');
    loadLocationList();
  } catch {
    // 取消删除
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="`货位管理 - ${currentWarehouse?.warehouseName}`"
    width="800px"
    append-to-body
  >
    <div class="mb-4">
      <el-button type="primary" plain icon="Plus" @click="handleAdd">新增货位</el-button>
    </div>

    <el-table v-loading="loading" :data="locationList" border stripe style="width: 100%">
      <el-table-column prop="locationCode" label="货位编码" width="150" align="center" />
      <el-table-column prop="locationName" label="货位名称" min-width="150" />
      <el-table-column prop="packageType" label="绑定物资" width="120" align="center">
        <template #default="{ row }">
          <DictTag :options="stock_package_type" :value="row.packageType" />
        </template>
      </el-table-column>
      <el-table-column prop="maxWeight" label="最大承重(kg)" width="130" align="center">
        <template #default="{ row }">
          {{ row.maxWeight || 0 }}
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100" align="center">
        <template #default="{ row }">
          <DictTag :options="default_status" :value="row.status" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" icon="Edit" @click="handleEdit(row)">编辑</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-empty v-if="!loading && locationList.length === 0" description="暂无货位数据" />

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>

  <!-- 货位表单 -->
  <el-dialog v-model="formVisible" :title="formTitle" width="500px" append-to-body>
    <el-form :model="formData" label-width="100px">
      <el-form-item label="货位编码" required>
        <el-input v-model="formData.locationCode" placeholder="请输入货位编码" />
      </el-form-item>
      <el-form-item label="货位名称" required>
        <el-input v-model="formData.locationName" placeholder="请输入货位名称" />
      </el-form-item>
      <el-form-item label="绑定物资">
        <el-select v-model="formData.packageType" placeholder="请选择" style="width: 100%">
          <el-option
            v-for="item in stock_package_type"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="最大承重(kg)">
        <el-input-number
          v-model="formData.maxWeight"
          :min="0"
          :precision="2"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="状态">
        <el-radio-group v-model="formData.status">
          <el-radio :value="0">启用</el-radio>
          <el-radio :value="1">禁用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="formVisible = false">取消</el-button>
      <el-button type="primary" :loading="formLoading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
