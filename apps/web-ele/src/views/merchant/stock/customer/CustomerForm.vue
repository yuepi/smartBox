<script lang="ts" setup>
import type { Customer } from '#/api/stock/customer';

import { addCustomerApi, editCustomerApi } from '#/api/stock/customer';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const { default_status } = useDicts(['default_status']);

const visible = ref(false);
const title = ref('');
const loading = ref(false);
const formData = ref<Partial<Customer>>({
  status: 0,
});

const formRules = reactive({
  customerName: [{ required: true, message: '请输入回收商名称', trigger: 'blur' }],
});

function open(row?: Customer) {
  if (row?.customerId) {
    title.value = '编辑回收商';
    formData.value = { ...row };
  } else {
    title.value = '新增回收商';
    formData.value = { status: 0 };
  }
  visible.value = true;
}

async function handleSubmit() {
  if (!formData.value.customerName?.trim()) {
    ElMessage.warning('请输入回收商名称');
    return;
  }

  loading.value = true;
  try {
    const api = formData.value.customerId ? editCustomerApi : addCustomerApi;
    await api(formData.value);
    ElMessage.success(formData.value.customerId ? '修改成功' : '新增成功');
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
    <el-form :model="formData" :rules="formRules" label-width="100px" label-position="right">
      <el-form-item label="回收商名称" prop="customerName" required>
        <el-input v-model="formData.customerName" placeholder="请输入回收商名称" />
      </el-form-item>

      <el-form-item label="联系人">
        <el-input v-model="formData.contact" placeholder="请输入联系人" />
      </el-form-item>

      <el-form-item label="电话">
        <el-input v-model="formData.phone" placeholder="请输入电话" />
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
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
