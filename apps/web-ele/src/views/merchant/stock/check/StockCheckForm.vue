<script lang="ts" setup>
import type { StockCheck } from '#/api/stock/stockCheck';
import type { StockCheckItem } from '#/api/stock/stockCheckItem';

import { getStockListApi } from '#/api/stock/stock';
import {
  addStockCheckApi,
  editStockCheckApi,
} from '#/api/stock/stockCheck';
import { getWarehouseListApi } from '#/api/stock/warehouse';
import { getWarehouseLocationListApi } from '#/api/stock/warehouseLocation';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const { stock_check_type, stock_package_type } = useDicts(['stock_check_type', 'stock_package_type']);

const visible = ref(false);
const title = ref('');
const loading = ref(false);

const formData = ref<Partial<StockCheck>>({
  checkType: 0,
  checkStatus: 0,
  items: [],
});

// 抽盘模式下选择的货位
const selectedLocationIds = ref<number[]>([]);
const locationOptions = ref<{ label: string; value: number }[]>([]);
const warehouseOptions = ref<{ label: string; value: number }[]>([]);
const warehouseLoading = ref(false);
const locationLoading = ref(false);

// 预览明细
const previewItems = ref<Partial<StockCheckItem>[]>([]);
const previewLoading = ref(false);

// 表单校验
const formRules = reactive({
  warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  checkType: [{ required: true, message: '请选择盘点类型', trigger: 'change' }],
});

// 加载仓库列表
async function loadWarehouseOptions() {
  warehouseLoading.value = true;
  try {
    const res = await getWarehouseListApi({ status: 0 });
    warehouseOptions.value = (res || []).map((item) => ({
      label: item.warehouseName,
      value: item.warehouseId,
    }));
  } catch {
    console.error('加载仓库列表失败');
  } finally {
    warehouseLoading.value = false;
  }
}

// 加载货位列表（抽盘时使用）
async function loadLocationOptions(warehouseId: number) {
  if (!warehouseId) {
    locationOptions.value = [];
    return;
  }
  locationLoading.value = true;
  try {
    const res = await getWarehouseLocationListApi({
      warehouseId,
      status: 0,
    });
    locationOptions.value = (res || []).map((item) => ({
      label: `${item.locationCode} - ${item.locationName}`,
      value: item.warehouseLocationId,
    }));
  } catch {
    console.error('加载货位列表失败');
  } finally {
    locationLoading.value = false;
  }
}

// 预览盘点明细（全盘或抽盘）
async function handlePreviewItems() {
  if (!formData.value.warehouseId) {
    ElMessage.warning('请先选择仓库');
    return;
  }

  previewLoading.value = true;
  try {
    // 全盘：获取仓库所有货位库存
    if (formData.value.checkType === 0) {
      const res = await getStockListApi({
        warehouseId: formData.value.warehouseId,
      });
      previewItems.value = (res || []).map((item) => ({
        locationId: item.locationId,
        packageType: item.packageType,
        stockWeight: item.stockWeight,
        realWeight: 0,
        profitWeight: 0,
        lossWeight: 0,
        reason: '',
      }));
    } else {
      // 抽盘：只取选中的货位
      if (selectedLocationIds.value.length === 0) {
        ElMessage.warning('请选择要盘点的货位');
        previewLoading.value = false;
        return;
      }
      const res = await getStockListApi({
        warehouseId: formData.value.warehouseId,
        locationIds: selectedLocationIds.value.join(','),
      });
      previewItems.value = (res || []).map((item) => ({
        locationId: item.locationId,
        packageType: item.packageType,
        stockWeight: item.stockWeight,
        realWeight: 0,
        profitWeight: 0,
        lossWeight: 0,
        reason: '',
      }));
    }

    if (previewItems.value.length === 0) {
      ElMessage.warning('该仓库暂无库存数据');
    } else {
      ElMessage.success(`已生成 ${previewItems.value.length} 条盘点明细`);
    }
  } catch {
    ElMessage.error('获取库存数据失败');
  } finally {
    previewLoading.value = false;
  }
}

// 监听仓库变化，加载货位选项
watch(
  () => formData.value.warehouseId,
  (newVal) => {
    if (newVal) {
      loadLocationOptions(newVal);
      previewItems.value = [];
    }
  }
);

// 监听盘点类型变化
watch(
  () => formData.value.checkType,
  () => {
    previewItems.value = [];
    selectedLocationIds.value = [];
  }
);

function open(row?: StockCheck) {
  if (row?.stockCheckId) {
    title.value = '编辑盘点单';
    formData.value = { ...row };
    if (row.items) {
      previewItems.value = row.items.map((item) => ({ ...item }));
    }
  } else {
    title.value = '新增盘点单';
    formData.value = {
      checkType: 0,
      checkStatus: 0,
    };
    previewItems.value = [];
    selectedLocationIds.value = [];
  }
  loadWarehouseOptions();
  visible.value = true;
}

async function handleSubmit() {
  if (!formData.value.warehouseId) {
    ElMessage.warning('请选择仓库');
    return;
  }

  // 全盘模式下，需要先生成明细
  if (formData.value.checkType === 0 && previewItems.value.length === 0) {
    ElMessage.warning('请点击"预览明细"生成盘点数据');
    return;
  }

  // 抽盘模式下，检查是否选中货位且生成了明细
  if (formData.value.checkType === 1) {
    if (selectedLocationIds.value.length === 0) {
      ElMessage.warning('请选择要盘点的货位');
      return;
    }
    if (previewItems.value.length === 0) {
      ElMessage.warning('请点击"预览明细"生成盘点数据');
      return;
    }
  }

  loading.value = true;
  try {
    const api = formData.value.stockCheckId ? editStockCheckApi : addStockCheckApi;

    // 组装提交数据
    const submitData = {
      ...formData.value,
      items: previewItems.value.map((item) => ({
        locationId: item.locationId,
        packageType: item.packageType,
        stockWeight: item.stockWeight,
        realWeight: item.realWeight || 0,
        reason: item.reason || '',
      })),
    };

    await api(submitData);
    ElMessage.success(formData.value.stockCheckId ? '修改成功' : '新增成功');
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
  <el-dialog v-model="visible" :title="title" width="900px" append-to-body>
    <el-form :model="formData" :rules="formRules" label-width="100px">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="仓库" prop="warehouseId" required>
            <el-select
              v-model="formData.warehouseId"
              placeholder="请选择"
              style="width: 100%"
              :loading="warehouseLoading"
            >
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
          <el-form-item label="盘点类型" prop="checkType" required>
            <el-select v-model="formData.checkType" placeholder="请选择" style="width: 100%">
              <el-option
                v-for="item in stock_check_type"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <!-- 抽盘模式：选择货位 -->
      <el-form-item v-if="formData.checkType === 1" label="盘点货位">
        <el-select
          v-model="selectedLocationIds"
          multiple
          filterable
          placeholder="请选择要盘点的货位"
          style="width: 100%"
          :loading="locationLoading"
        >
          <el-option
            v-for="item in locationOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <div class="text-gray-400 text-xs mt-1">提示：选择一个或多个货位进行抽盘</div>
      </el-form-item>

      <el-form-item label="计划完成时间">
        <el-date-picker
          v-model="formData.planFinishTime"
          type="datetime"
          placeholder="选择计划完成时间"
          style="width: 100%"
        />
      </el-form-item>

      <el-form-item label="备注">
        <el-input v-model="formData.remark" type="textarea" :rows="2" placeholder="请输入备注" />
      </el-form-item>

      <!-- 预览/生成明细 -->
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium">盘点明细</span>
        <el-button
          type="primary"
          size="small"
          plain
          :loading="previewLoading"
          @click="handlePreviewItems"
        >
          {{ formData.checkType === 0 ? '生成全盘明细' : '预览抽盘明细' }}
        </el-button>
      </div>

      <el-table
        :data="previewItems"
        border
        stripe
        style="width: 100%"
        max-height="300"
        v-loading="previewLoading"
      >
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
        <el-table-column prop="stockWeight" label="账面重量(kg)" width="140" align="center">
          <template #default="{ row }">
            {{ row.stockWeight?.toFixed(2) || 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="realWeight" label="实际重量(kg)" width="140" align="center">
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
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.realWeight === 0 && row.stockWeight > 0" type="warning" size="small">
              待盘
            </el-tag>
            <el-tag v-else-if="row.profitWeight > 0" type="success" size="small">
              盘盈
            </el-tag>
            <el-tag v-else-if="row.lossWeight > 0" type="danger" size="small">
              盘亏
            </el-tag>
            <el-tag v-else type="info" size="small">
              持平
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="previewItems.length === 0 && !previewLoading" class="text-center text-gray-400 py-4 text-sm">
        点击「{{ formData.checkType === 0 ? '生成全盘明细' : '预览抽盘明细' }}」加载数据
      </div>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
