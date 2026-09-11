<script lang="ts" setup>
import type { HomeCategory } from '#/api/system/homeCategory';
import type { HomeItem } from '#/api/system/housekeeping';

import { reactive, ref, watch } from 'vue';

import { ElMessage } from 'element-plus';

import { getHomeCategoryListApi } from '#/api/system/homeCategory';
import {
  addHomeItemApi,
  editHomeItemApi,
  getHomeItemDetailApi,
} from '#/api/system/housekeeping';
import UploadImage from '#/components/UploadImage/index.vue';

const emit = defineEmits(['success']);

const visible = ref(false);
const loading = ref(false);
const submitLoading = ref(false);
const formRef = ref();

const isEdit = ref(false);

// 树形结构类目数据
const categoryTreeOptions = ref<HomeCategory[]>([]);

// 图片上传组件绑定列表 (数组形式)
const imageFileList = ref<string[]>([]);

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
  categoryId: [{ required: true, message: '请选择所属类目', trigger: 'change' }],
  unit: [{ required: true, message: '请输入计费单位', trigger: 'blur' }],
};

/**
 * 将平铺数组转换为树形结构
 */
function handleListToTree(
  list: HomeCategory[],
  parentId = 0,
): HomeCategory[] {
  const tree: HomeCategory[] = [];
  for (const item of list) {
    if (item.parentId === parentId) {
      const children = handleListToTree(list, item.categoryId);
      if (children.length > 0) {
        item.children = children;
      }
      tree.push(item);
    }
  }
  return tree;
}

// 监听图片列表变动，同步更新 formData.imageUrls（逗号分割字符串）
watch(
  imageFileList,
  (val) => {
    formData.imageUrls = val && val.length > 0 ? val.join(',') : '';
  },
  { deep: true },
);

// 加载类目下拉数据并转为树形结构
async function loadCategories() {
  try {
    const list = await getHomeCategoryListApi();
    // 如果返回的数据包含 children 说明已是树形，否则手动转树形
    if (Array.isArray(list) && list.length > 0) {
      categoryTreeOptions.value = list[0]?.children ? list : handleListToTree(list, 0);
    } else {
      categoryTreeOptions.value = [];
    }
  } catch {
    categoryTreeOptions.value = [];
  }
}

async function open(row?: HomeItem) {
  visible.value = true;
  isEdit.value = !!row?.homeItemId;

  // 异步加载并处理类目树
  loadCategories();

  if (isEdit.value && row?.homeItemId) {
    loading.value = true;
    try {
      const detail = await getHomeItemDetailApi(row.homeItemId);
      Object.assign(formData, detail);

      // 回显图片：字符串拆分为数组传给 UploadImage
      imageFileList.value = detail.imageUrls ? detail.imageUrls
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean) : [];
    } finally {
      loading.value = false;
    }
  } else {
    // 重置表单数据
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
    imageFileList.value = [];
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
    <el-form
      ref="formRef"
      v-loading="loading"
      :model="formData"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="服务名称" prop="itemName">
        <el-input v-model="formData.itemName" placeholder="例如：柜式空调移机" />
      </el-form-item>

      <!-- 类目选择：TreeSelect 绑定转换后的树形数据 -->
      <el-form-item label="所属类目" prop="categoryId">
        <el-tree-select
          v-model="formData.categoryId"
          :data="categoryTreeOptions"
          :props="{ label: 'categoryName', value: 'categoryId', children: 'children' }"
          check-strictly
          node-key="categoryId"
          placeholder="请选择所属类目"
          class="w-full"
          clearable
          filterable
        />
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

      <!-- 服务图片：上传组件 -->
      <el-form-item label="服务图片" prop="imageUrls">
        <UploadImage
          v-model="imageFileList"
          :limit="5"
          :file-size="5"
          :file-type="['png', 'jpg', 'jpeg']"
        />
      </el-form-item>

      <el-form-item label="服务描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="例如：含拆机、安装、抽真空"
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
  </el-dialog>
</template>
