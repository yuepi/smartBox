<script lang="ts" setup>
import type {
  HomeCategory,
  HomeCategorySaveParams,
} from '#/api/system/homeCategory';

import { computed, nextTick, reactive, ref } from 'vue';

import { ElMessage } from 'element-plus';

import {
  addHomeCategoryApi,
  editHomeCategoryWithDefaultApi,
  getHomeCategoryDetailApi,
} from '#/api/system/homeCategory';
import UploadImage from '#/components/UploadImage/index.vue';
import { categoryImage } from './defaultImages';

const emit = defineEmits(['success']);

const visible = ref(false);
const loading = ref(false);
const formRef = ref();
const images = ref<string[]>([]);
const canPrice = computed(() => formData.level > 1 && !categoryOptions.value.some(item => item.parentId === formData.categoryId));

// 存储扁平数据转成的下拉树
const categoryOptions = ref<any[]>([]);

const formData = reactive<HomeCategorySaveParams>({
  categoryId: undefined,
  parentId: 0,
  level: 1,
  categoryName: '',
  sort: 1,
  status: 0,
});

const rules = {
  categoryName: [
    { required: true, message: '请输入类目名称', trigger: 'blur' },
  ],
  parentId: [{ required: true, message: '请选择上级类目', trigger: 'change' }],
  sort: [{ required: true, message: '请输入排序值', trigger: 'blur' }],
};

const isEdit = computed(() => !!formData.categoryId);

// 树形下拉选项（包含“顶级类目”）
const treeOptions = computed(() => {
  const nodes = categoryOptions.value.map(item => ({ ...item, children: [], disabled: item.level >= 3 || item.defaultServiceConfigured }));
  const map = new Map(nodes.map(item => [item.categoryId, item]));
  const roots: any[] = [];
  for (const item of nodes) {
    const parent = map.get(item.parentId);
    if (parent) parent.children.push(item);
    else roots.push(item);
  }
  return [
  {
    categoryId: 0,
    categoryName: '顶级类目',
    level: 0,
    children: roots,
  },
];
});

// 监听上级类目切换，自动计算层级 level
function handleParentChange(parentId: number) {
  if (parentId === 0) {
    formData.level = 1;
    return;
  }
  const findLevel = (nodes: any[], targetId: number): number => {
    for (const node of nodes) {
      if (node.categoryId === targetId) return node.level;
      if (node.children?.length) {
        const lvl = findLevel(node.children, targetId);
        if (lvl) return lvl;
      }
    }
    return 0;
  };
  const parentLevel = findLevel(categoryOptions.value, parentId);
  formData.level = parentLevel + 1;
}

// 打开弹窗方法
async function open(row?: Partial<HomeCategory>, optionsTree: any[] = []) {
  categoryOptions.value = optionsTree;
  visible.value = true;

  // 重置表单
  Object.assign(formData, {
    imageUrl: '',
    defaultPrice: undefined,
    pricingUnit: 'time',
    categoryId: undefined,
    parentId: 0,
    level: 1,
    categoryName: '',
    sort: 1,
    status: 0,
  });
  images.value = [];

  await nextTick();
  formRef.value?.clearValidate();

  if (row?.categoryId) {
    // 编辑逻辑
    loading.value = true;
    try {
      const res = await getHomeCategoryDetailApi(row.categoryId);
      Object.assign(formData, res);
      images.value = res.imageUrl ? [res.imageUrl] : [];
      formData.pricingUnit = res.pricingUnit || 'time';
    } finally {
      loading.value = false;
    }
  } else if (row?.parentId !== undefined) {
    // 添加子类目逻辑（预设 parentId）
    formData.parentId = row.parentId;
    handleParentChange(row.parentId);
  }
}

// 提交表单
async function handleSubmit() {
  if (loading.value) return;
  await formRef.value?.validate();
  loading.value = true;
  try {
    // 只上传一张平台分类图；不定价的分组不提交价格字段。
    formData.imageUrl = images.value[0] || '';
    if (!canPrice.value) { formData.defaultPrice = undefined; formData.pricingUnit = undefined; }
    if (isEdit.value) {
      // 此窗口只编辑分组，末级服务由完整服务编辑器处理。
      await editHomeCategoryWithDefaultApi({ ...formData, defaultPrice: undefined, pricingUnit: undefined });
      ElMessage.success('修改成功');
    } else {
      await addHomeCategoryApi(formData);
      ElMessage.success('新增成功');
    }
    visible.value = false;
    emit('success');
  } finally {
    loading.value = false;
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑类目' : '新增类目'"
    :width="isEdit && canPrice ? '900px' : '500px'"
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
      <el-form-item label="上级类目" prop="parentId">
        <el-tree-select
          v-model="formData.parentId"
          :data="treeOptions"
          :props="{ label: 'categoryName', children: 'children' }"
          node-key="categoryId"
          :disabled="isEdit"
          placeholder="请选择上级类目"
          check-strictly
          default-expand-all
          class="w-full"
          @change="handleParentChange"
        />
      </el-form-item>

      <el-form-item label="类目层级">
        <el-tag type="info">{{ formData.level }} 级类目</el-tag>
      </el-form-item>

      <el-form-item label="类目名称" prop="categoryName">
        <el-input
          v-model="formData.categoryName"
          placeholder="请输入类目名称"
          maxlength="20"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="显示排序" prop="sort">
        <el-input-number
          v-model="formData.sort"
          :min="0"
          :max="9999"
          class="!w-full"
        />
      </el-form-item>

      <el-form-item label="默认图片">
        <div v-if="!images.length" class="mr-3 text-center">
          <el-image :src="categoryImage({ categoryName: formData.categoryName })" fit="contain" style="width: 72px; height: 72px" />
          <div class="text-xs text-gray-500">系统默认</div>
        </div>
        <UploadImage v-model="images" :limit="1" />
        <div class="text-xs text-gray-500">未上传时按类目使用系统默认图；上传后优先使用自定义图片。</div>
      </el-form-item>
      <template v-if="canPrice && !isEdit">
        <el-form-item label="默认价格">
          <el-input-number v-model="formData.defaultPrice" :min="0.01" :max="999999.99" :precision="2" />
          <div class="text-xs text-gray-500">新商户复制默认配置时使用，不覆盖商户已有价格。</div>
        </el-form-item>
        <el-form-item label="报价单位">
          <el-select v-model="formData.pricingUnit"><el-option label="次" value="time" /><el-option label="台" value="pcs" /><el-option label="小时" value="hour" /></el-select>
        </el-form-item>
      </template>

      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio :value="0">正常</el-radio>
          <el-radio :value="1">停用</el-radio>
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
