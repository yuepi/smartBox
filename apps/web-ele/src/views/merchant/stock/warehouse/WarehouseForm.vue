<script lang="ts" setup>
import type { Warehouse } from '#/api/stock/warehouse';

import { addWarehouseApi, editWarehouseApi } from '#/api/stock/warehouse';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const { warehouse_type, default_status } = useDicts([
  'warehouse_type',
  'default_status',
]);

const visible = ref(false);
const title = ref('');
const loading = ref(false);
const formData = ref<Partial<Warehouse>>({
  status: 0,
  warehouseType: 0,
});

const formRules = reactive({
  warehouseName: [
    { required: true, message: '请输入仓库名称', trigger: 'blur' },
  ],
});

function open(row?: Warehouse) {
  if (row?.warehouseId) {
    title.value = '编辑仓库';
    formData.value = { ...row };
  } else {
    title.value = '新增仓库';
    formData.value = { status: 0, warehouseType: 0 };
  }
  visible.value = true;
}

async function handleSubmit() {
  if (!formData.value.warehouseName?.trim()) {
    ElMessage.warning('请输入仓库名称');
    return;
  }

  loading.value = true;
  try {
    const api = formData.value.warehouseId ? editWarehouseApi : addWarehouseApi;
    await api(formData.value);
    ElMessage.success(formData.value.warehouseId ? '修改成功' : '新增成功');
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
  <el-dialog v-model="visible" :title="title" width="550px" append-to-body>
    <el-form
      :model="formData"
      :rules="formRules"
      label-width="100px"
      label-position="right"
    >
      <el-form-item label="仓库名称" prop="warehouseName" required>
        <el-input
          v-model="formData.warehouseName"
          placeholder="请输入仓库名称"
        />
      </el-form-item>

      <el-form-item label="仓库类型">
        <el-select
          v-model="formData.warehouseType"
          placeholder="请选择"
          style="width: 100%"
        >
          <el-option
            v-for="item in warehouse_type"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="联系人">
        <el-input v-model="formData.contact" placeholder="请输入联系人" />
      </el-form-item>

      <el-form-item label="联系电话">
        <el-input v-model="formData.phone" placeholder="请输入联系电话" />
      </el-form-item>

      <el-form-item label="地址">
        <el-input v-model="formData.address" placeholder="请输入地址" />
      </el-form-item>

      <el-form-item label="状态">
        <el-radio-group v-model="formData.status">
          <el-radio :value="0">启用</el-radio>
          <el-radio :value="1">禁用</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit"
        >确定</el-button
      >
    </template>
  </el-dialog>
</template>
