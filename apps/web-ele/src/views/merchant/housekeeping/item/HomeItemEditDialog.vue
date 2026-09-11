<script lang="ts" setup>
import type { HomeItem } from '#/api/system/housekeeping';

import { reactive, ref } from 'vue';

import { ElMessage } from 'element-plus';

import { addHomeItemApi, editHomeItemApi, getHomeItemDetailApi } from '#/api/system/housekeeping';

const emit = defineEmits(['success']);

const visible = ref(false);
const loading = ref(false);
const submitLoading = ref(false);
const formRef = ref();

const isEdit = ref(false);
const formData = reactive<HomeItem>({
  homeItemId: undefined,
  categoryId: undefined,
  itemName: '',
  unit: '次',
  description: '',
  imageUrls: '',
  sort: 1,
  status: 0,
});

const rules = {
  itemName: [{ required: true, message: '请输入服务名称', trigger: 'blur' }],
  unit: [{ required: true, message: '请输入计费单位', trigger: 'blur' }],
};

async function open(row?: HomeItem) {
  visible.value = true;
  isEdit.value = !!row?.homeItemId;

  if (isEdit.value && row?.homeItemId) {
    loading.value = true;
    try {
      const detail = await getHomeItemDetailApi(row.homeItemId);
      Object.assign(formData, detail);
    } finally {
      loading.value = false;
    }
  } else {
    Object.assign(formData, {
      homeItemId: undefined,
      categoryId: undefined,
      itemName: '',
      unit: '次',
      description: '',
      imageUrls: '',
      sort: 1,
      status: 0,
    });
  }
}

async function handleSubmit() {
  await formRef.value?.validate();
  submitLoading.value = true;
  try {
    if (isEdit.value) {
      await editHomeItemApi(formData);
      ElMessage.success('修改成功');
    } else {
      await addHomeItemApi(formData);
      ElMessage.success('新增成功');
    }
    visible.value = false;
    emit('success');
  } finally {
    submitLoading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑家政服务项' : '新增家政服务项'"
    width="580px"
    append-to-body
    destroy-on-close
  >
    <el-form ref="formRef" v-loading="loading" :model="formData" :rules="rules" label-width="100px">
      <el-form-item label="服务名称" prop="itemName">
        <el-input v-model="formData.itemName" placeholder="例如：柜式空调移机" />
      </el-form-item>

      <el-form-item label="分类ID" prop="categoryId">
        <el-input-number v-model="formData.categoryId" :min="1" placeholder="分类ID" class="w-full" />
      </el-form-item>

      <el-form-item label="计费单位" prop="unit">
        <el-input v-model="formData.unit" placeholder="例如：次、小时、台" />
      </el-form-item>

      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="formData.sort" :min="1" class="w-full" />
      </el-form-item>

      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio :value="0">启用</el-radio>
          <el-radio :value="1">禁用</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="图片链接" prop="imageUrls">
        <el-input v-model="formData.imageUrls" type="textarea" :rows="2" placeholder="多张图片用逗号分割" />
      </el-form-item>

      <el-form-item label="服务描述" prop="description">
        <el-input v-model="formData.description" type="textarea" :rows="3" placeholder="例如：含拆机、安装、抽真空" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitLoading" @click="handleSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>
