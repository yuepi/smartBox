<script lang="ts" setup>
import type { RecycleItem } from '#/api/operation/recycleItem';

import { reactive, ref, watch } from 'vue';

import {
  addRecycleItemApi,
  editRecycleItemApi,
  getRecycleItemDetailApi,
} from '#/api/operation/recycleItem';
import UploadImage from '#/components/UploadImage/index.vue';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const visible = ref(false);
const loading = ref(false);
const submitLoading = ref(false);
const isEdit = ref(false);
const formRef = ref();

// 图片上传组件绑定列表 (回收物品为单图，限制 1 张)
const imageFileList = ref<string[]>([]);

const formData = reactive<RecycleItem>({
  recycleItemId: undefined,
  category: '',
  brand: '',
  name: '',
  imageUrl: '',
  price: undefined,
  spec: '',
  useCondition: '',
  status: 0,
  remark: '',
});

const rules = {
  category: [{ required: true, message: '请输入品类', trigger: 'blur' }],
  name: [{ required: true, message: '请输入物品名称', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
};

// 监听图片列表变动，同步更新 formData.imageUrl (取数组第 1 张图片)
watch(
  imageFileList,
  (val) => {
    formData.imageUrl = val && val.length > 0 ? val[0] : '';
  },
  { deep: true },
);

// 重置表单
function resetForm() {
  Object.assign(formData, {
    recycleItemId: undefined,
    category: '',
    brand: '',
    name: '',
    imageUrl: '',
    price: undefined,
    spec: '',
    useCondition: '',
    status: 0,
    remark: '',
  });
  imageFileList.value = [];
  formRef.value?.clearValidate();
}

async function open(row?: RecycleItem) {
  visible.value = true;
  isEdit.value = !!row?.recycleItemId;
  resetForm();

  if (isEdit.value && row?.recycleItemId) {
    loading.value = true;
    try {
      const detail = await getRecycleItemDetailApi(row.recycleItemId);
      Object.assign(formData, detail);

      // 回显图片：转为数组传给 UploadImage 组件
      imageFileList.value = detail.imageUrl ? [detail.imageUrl] : [];
    } finally {
      loading.value = false;
    }
  }
}

async function handleSubmit() {
  await formRef.value?.validate();
  submitLoading.value = true;
  try {
    if (isEdit.value) {
      await editRecycleItemApi(formData);
      ElMessage.success('修改成功');
    } else {
      await addRecycleItemApi(formData);
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
  <ElDialog
    v-model="visible"
    :title="isEdit ? '编辑回收物品' : '新增回收物品'"
    width="580px"
    append-to-body
    destroy-on-close
  >
    <el-form
      ref="formRef"
      v-loading="loading"
      :model="formData"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="品类" prop="category">
        <el-input
          v-model="formData.category"
          placeholder="例如：电视、冰箱、洗衣机"
        />
      </el-form-item>

      <el-form-item label="物品名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="例如：滚筒洗衣机 TG100"
        />
      </el-form-item>

      <el-form-item label="品牌" prop="brand">
        <el-input v-model="formData.brand" placeholder="例如：小天鹅、海尔" />
      </el-form-item>

      <el-form-item label="规格" prop="spec">
        <el-input v-model="formData.spec" placeholder="例如：10kg/变频" />
      </el-form-item>

      <el-form-item label="使用情况" prop="useCondition">
        <el-input
          v-model="formData.useCondition"
          placeholder="例如：全新、九成新、有破损"
        />
      </el-form-item>

      <el-form-item label="参考价格" prop="price">
        <el-input-number
          v-model="formData.price"
          :min="0"
          :precision="2"
          :step="10"
          class="w-full"
          placeholder="仅记录，统一现场结算"
          controls-position="right"
        />
      </el-form-item>

      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio :value="0">启用</el-radio>
          <el-radio :value="1">禁用</el-radio>
        </el-radio-group>
      </el-form-item>

      <!-- 单图上传组件 -->
      <el-form-item label="物品图片" prop="imageUrl">
        <UploadImage
          v-model="imageFileList"
          :limit="1"
          :file-size="5"
          :file-type="['png', 'jpg', 'jpeg']"
        />
      </el-form-item>

      <el-form-item label="备注" prop="remark">
        <el-input
          v-model="formData.remark"
          type="textarea"
          :rows="3"
          placeholder="例如：需检查外观及开机功能"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        type="primary"
        :loading="submitLoading"
        @click="handleSubmit"
      >
        保存
      </el-button>
    </template>
  </ElDialog>
</template>
