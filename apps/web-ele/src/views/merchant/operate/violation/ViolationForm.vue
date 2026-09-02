<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';

import { reactive, ref } from 'vue';

import { ElMessage } from 'element-plus';

import { addSortViolationApi, editSortViolationApi } from '#/api/operation/violation';

const emit = defineEmits(['success']);

const visible = ref(false);
const loading = ref(false);
const formRef = ref<FormInstance>();

const formData = reactive({
  id: undefined as number | undefined,
  description: '',
  violationImages: [] as string[],
});

const rules: FormRules = {};

function open(row?: any) {
  visible.value = true;
  if (row) {
    Object.assign(formData, {
      id: row.id,
      description: row.description,
      violationImages: row.violationImages || [],
    });
  } else {
    formData.id = undefined;
    formData.description = '';
    formData.violationImages = [];
  }
}

async function handleSubmit() {
  if (!formRef.value) return;
  await formRef.value.validate(async (valid) => {
    if (!valid) return;
    try {
      loading.value = true;
      if (formData.id) {
        await editSortViolationApi(formData);
        ElMessage.success('更新违规记录成功');
      } else {
        await addSortViolationApi(formData);
        ElMessage.success('新增违规记录成功');
      }
      visible.value = false;
      emit('success');
    } catch (error) {
      console.error(error);
    } finally {
      loading.value = false;
    }
  });
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="formData.id ? '编辑违规记录' : '新增违规记录'"
    width="600px"
    destroy-on-close
  >
    <el-form ref="formRef" :model="formData" :rules="rules" label-width="100px">
      <el-form-item label="违规描述" prop="description">
        <el-input v-model="formData.description" type="textarea" :rows="3" placeholder="请输入详细描述" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
