<script lang="ts" setup>
import type {
  HomeCategory,
  HomeCategorySaveParams,
} from '#/api/system/homeCategory';

import { computed, nextTick, reactive, ref } from 'vue';

import { ElMessage } from 'element-plus';

import {
  addHomeCategoryApi,
  editHomeCategoryApi,
  getHomeCategoryDetailApi,
} from '#/api/system/homeCategory';

const emit = defineEmits(['success']);

const visible = ref(false);
const loading = ref(false);
const formRef = ref();

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
const treeOptions = computed(() => [
  {
    categoryId: 0,
    categoryName: '顶级类目',
    level: 0,
    children: categoryOptions.value,
  },
]);

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
    categoryId: undefined,
    parentId: 0,
    level: 1,
    categoryName: '',
    sort: 1,
    status: 0,
  });

  await nextTick();
  formRef.value?.clearValidate();

  if (row?.categoryId) {
    // 编辑逻辑
    loading.value = true;
    try {
      const res = await getHomeCategoryDetailApi(row.categoryId);
      Object.assign(formData, res);
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
  await formRef.value?.validate();
  loading.value = true;
  try {
    if (isEdit.value) {
      await editHomeCategoryApi(formData);
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
    width="500px"
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
