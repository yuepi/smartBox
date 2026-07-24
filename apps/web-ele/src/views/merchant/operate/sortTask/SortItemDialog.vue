<script lang="ts" setup>
import type { SortItem } from '#/api/operation/sortItem';
import type { SortTask } from '#/api/operation/sortTask';

import {
  addSortItemApi,
  deleteSortItemApi,
  editSortItemApi,
  getSortItemListApi,
} from '#/api/operation/sortItem';

const emit = defineEmits<{
  (e: 'success'): void;
}>();

const { package_type } = useDicts(['package_type']);

const visible = ref(false);
const loading = ref(false);
const currentTask = ref<null | SortTask>(null);
const itemList = ref<SortItem[]>([]);

// 明细表单
const formVisible = ref(false);
const formTitle = ref('');
const formData = ref<Partial<SortItem>>({});
const formLoading = ref(false);

// 分类类型选项
const packageTypeOptions = [
  { label: '混合', value: 0 },
  { label: '织物', value: 1 },
  { label: '金属', value: 2 },
  { label: '塑料', value: 3 },
];

async function open(row: SortTask) {
  currentTask.value = row;
  visible.value = true;
  await loadItemList();
}

async function loadItemList() {
  if (!currentTask.value) return;
  loading.value = true;
  try {
    const res = await getSortItemListApi(currentTask.value.sortTaskId);
    itemList.value = res || [];
  } catch {
    ElMessage.error('加载明细失败');
  } finally {
    loading.value = false;
  }
}

function handleAddItem() {
  if (!currentTask.value) return;
  formTitle.value = '新增分拣明细';
  formData.value = {
    sortTaskId: currentTask.value.sortTaskId,
    packageType: 0,
    weight: 0,
  };
  formVisible.value = true;
}

function handleEditItem(row: SortItem) {
  formTitle.value = '编辑分拣明细';
  formData.value = { ...row };
  formVisible.value = true;
}

async function handleFormSubmit() {
  if (formData.value.packageType === undefined || formData.value.packageType === null) {
    ElMessage.warning('请选择分类类型');
    return;
  }
  if (!formData.value.weight || formData.value.weight <= 0) {
    ElMessage.warning('请输入有效的重量');
    return;
  }

  formLoading.value = true;
  try {
    const api = formData.value.sortItemId ? editSortItemApi : addSortItemApi;
    await api(formData.value);
    ElMessage.success(formData.value.sortItemId ? '修改成功' : '新增成功');
    formVisible.value = false;
    await loadItemList();
    emit('success');
  } catch {
    ElMessage.error('操作失败');
  } finally {
    formLoading.value = false;
  }
}

async function handleDeleteItem(row: SortItem) {
  try {
    await ElMessageBox.confirm('确定要删除这条分拣明细吗？', '提示', { type: 'warning' });
    await deleteSortItemApi(row.sortItemId);
    ElMessage.success('删除成功');
    await loadItemList();
    emit('success');
  } catch {
    // 取消删除
  }
}

defineExpose({ open });
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="`分拣明细 - ${currentTask?.sortNo}`"
    width="700px"
    append-to-body
    @close="itemList = []"
  >
    <div class="mb-4">
      <el-button type="primary" icon="Plus" @click="handleAddItem">新增明细</el-button>
    </div>
    <el-table v-loading="loading" :data="itemList" border stripe style="width: 100%">
      <el-table-column prop="sortItemId" label="明细ID" width="80" align="center" />
      <el-table-column prop="packageType" label="分类类型" width="100" align="center">
        <template #default="{ row }">
          <DictTag :options="package_type" :value="row.packageType" />
        </template>
      </el-table-column>
      <el-table-column prop="packageName" label="分类名称" min-width="150" align="left" />
      <el-table-column prop="weight" label="重量(kg)" width="120" align="right">
        <template #default="{ row }">
          {{ row.weight?.toFixed(2) || 0 }} kg
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" align="center">
        <template #default="{ row }">
          <el-button link type="primary" icon="Edit" @click="handleEditItem(row)">编辑</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDeleteItem(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
    </template>
  </el-dialog>

  <!-- 分拣明细表单弹窗 -->
  <el-dialog v-model="formVisible" :title="formTitle" width="450px" append-to-body>
    <el-form :model="formData" label-width="80px">
      <el-form-item label="分类类型" required>
        <el-select v-model="formData.packageType" placeholder="请选择" style="width: 100%">
          <el-option
            v-for="item in packageTypeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="分类名称">
        <el-input v-model="formData.packageName" placeholder="请输入分类名称（可选）" />
      </el-form-item>
      <el-form-item label="重量(kg)" required>
        <el-input-number v-model="formData.weight" :min="0" :precision="2" :step="0.1" style="width: 100%" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="formVisible = false">取消</el-button>
      <el-button type="primary" :loading="formLoading" @click="handleFormSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
