<script lang="ts" setup>
import { remarkOperateApi } from '#/api/operation/recycleOrder';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const loading = ref(false);
const form = reactive({
  recycleOrderId: 0,
  remark: '',
  needSecondaryReview: 0, // 🌟 0=否, 1=是
});

// 🌟 是否显示二次审核（只有审核中状态才显示）
const showSecondaryReview = ref(false);

function open(row: { orderStatus: number; recycleOrderId: number; }) {
  form.recycleOrderId = row.recycleOrderId;
  form.remark = '';
  form.needSecondaryReview = 0; // 默认否

  showSecondaryReview.value = row.orderStatus === 3;

  visible.value = true;
}

async function handleSubmit() {
  if (!form.remark.trim()) {
    ElMessage.warning('请输入备注内容');
    return;
  }
  loading.value = true;
  try {
    // 🌟 只有展示二次审核时才传该字段
    const params: any = {
      recycleOrderId: form.recycleOrderId,
      remark: form.remark,
    };
    if (showSecondaryReview.value) {
      params.needSecondaryReview = form.needSecondaryReview;
    }

    await remarkOperateApi(params);
    ElMessage.success('添加备注成功');
    visible.value = false;
    emit('success');
  } catch {
    ElMessage.error('添加备注失败');
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="添加备注" width="500px" append-to-body>
    <el-form :model="form" label-width="100px">
      <el-form-item label="备注" required>
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="4"
          placeholder="请输入备注内容"
        />
      </el-form-item>

      <el-form-item v-if="showSecondaryReview" label="二次审核">
        <el-radio-group v-model="form.needSecondaryReview">
          <el-radio :value="0">否</el-radio>
          <el-radio :value="1">是</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">
        确定
      </el-button>
    </template>
  </el-dialog>
</template>
