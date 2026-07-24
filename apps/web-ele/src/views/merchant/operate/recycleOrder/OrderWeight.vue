<script lang="ts" setup>
import { weightOperateApi } from '#/api/operation/recycleOrder';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const loading = ref(false);
const form = reactive({
  recycleOrderId: 0,
  operateType: 0,
  weight: 0,
});

function open(row: { recycleOrderId: number }) {
  form.recycleOrderId = row.recycleOrderId;
  form.operateType = 0;
  form.weight = 0;
  visible.value = true;
}

async function handleSubmit() {
  if (form.weight <= 0) {
    ElMessage.warning('请输入重量');
    return;
  }
  const action = form.operateType === 0 ? '补重' : '扣重';
  try {
    await ElMessageBox.confirm(`确定要对订单进行${action} ${form.weight} kg 吗？`, '提示', { type: 'warning' });
    loading.value = true;
    await weightOperateApi(form);
    ElMessage.success(`${action}成功`);
    visible.value = false;
    emit('success');
  } catch {
    // 取消操作
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="补重/扣重" width="450px" append-to-body>
    <el-form :model="form" label-width="100px">
      <el-form-item label="操作类型" required>
        <el-radio-group v-model="form.operateType">
          <el-radio :value="0">补重</el-radio>
          <el-radio :value="1">扣重</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="重量(kg)" required>
        <el-input-number
v-model="form.weight" :min="0.01" :precision="2" :step="0.1" placeholder="请输入重量"
          style="width: 100%"
/>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
