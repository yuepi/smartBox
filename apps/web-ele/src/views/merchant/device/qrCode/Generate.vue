<script lang="ts" setup>
import type { GenerateQrcodeParams } from '#/api/device/qrCode';

import { generateQrcodeApi } from '#/api/device/qrCode';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const { qrcode_type } = useDicts(['qrcode_type']);

const visible = ref(false);
const loading = ref(false);
const form = reactive<GenerateQrcodeParams>({
  qrcodeType: 0,
  qrcodeTotal: 10,
});

function open() {
  form.qrcodeType = 0;
  form.qrcodeTotal = 10;
  visible.value = true;
}

async function handleSubmit() {
  if (!form.qrcodeTotal || form.qrcodeTotal < 1) {
    ElMessage.warning('请输入生成数量');
    return;
  }
  loading.value = true;
  try {
    await generateQrcodeApi(form);
    ElMessage.success(`成功生成 ${form.qrcodeTotal} 个二维码`);
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
  <el-dialog v-model="visible" title="生成二维码" width="500px" append-to-body>
    <el-form :model="form" label-width="100px">
      <el-form-item label="二维码类型" required>
        <el-select
          v-model="form.qrcodeType"
          placeholder="请选择"
          style="width: 100%"
        >
          <el-option
            v-for="item in qrcode_type"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="生成数量" required>
        <el-input-number
          v-model="form.qrcodeTotal"
          :min="1"
          :max="1000"
          style="width: 100%"
        />
        <div class="text-gray-400 text-xs mt-1">最多一次生成1000个二维码</div>
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
