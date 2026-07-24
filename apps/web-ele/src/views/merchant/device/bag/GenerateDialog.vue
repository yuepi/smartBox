<script lang="ts" setup>
import { generateDeviceBagApi } from '#/api/device/deviceBag';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const loading = ref(false);
const num = ref(10);

function open() {
  num.value = 10;
  visible.value = true;
}

async function handleSubmit() {
  if (num.value < 1 || num.value > 100) {
    ElMessage.warning('生成数量应在 1-100 之间');
    return;
  }
  loading.value = true;
  try {
    await generateDeviceBagApi({ deviceBagNum: num.value });
    ElMessage.success(`成功生成 ${num.value} 个包袋`);
    visible.value = false;
    emit('success');
  } catch {
    ElMessage.error('生成失败');
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog v-model="visible" title="生成包袋" width="400px" append-to-body>
    <el-form label-width="100px">
      <el-form-item label="生成数量">
        <el-input-number v-model="num" :min="1" :max="100" style="width: 100%" />
        <div class="text-gray-400 text-sm mt-1">最多可生成100个包袋</div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
