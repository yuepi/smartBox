<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { Delete, Edit, Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getDictDataPageApi, deleteDictDataApi } from '#/api/system/dict/dictData';
import type { DictData } from '#/api/system/dict/dictData';

import DataEditModal from './dataEdit.vue';

const props = defineProps<{ dictId?: number }>();

const loading = ref(false);
const moreParams = ref(false);
const tableData = ref<DictData[]>([]);
const total = ref(0);
const dataEditModalRef = ref();

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  dictId: undefined as number | undefined,
  itemLabel: undefined,
  status: undefined,
});

// 暴露给父组件调用的刷新入口
async function refresh(id: number) {
  queryParams.dictId = id;
  queryParams.pageNo = 1;
  loadData();
}

defineExpose({ refresh });

async function loadData() {
  if (!queryParams.dictId) return;
  try {
    loading.value = true;
    const res = await getDictDataPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch {
    ElMessage.error('加载字典项失败');
  } finally {
    loading.value = false;
  }
}

async function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

async function handleReset() {
  queryParams.itemLabel = undefined;
  queryParams.status = undefined;
  handleQuery();
}


async function handleDelete(row: DictData) {
  try {
    await ElMessageBox.confirm(`确定要删除字典项 "${row.itemLabel}" 吗？`, '提示', { type: 'warning' });
    await deleteDictDataApi(row.dictDataId);
    ElMessage.success('删除成功');
    loadData();
  } catch { }
}
</script>

<template>
  <div>
    <BaseTableLayout v-model:queryParams="queryParams" :loading="loading" :total="total"
      v-model:more-params="moreParams" @search="loadData" @reset="handleReset">
      <template #title>
        <span class="font-medium text-gray-800 dark:text-gray-200">字典项列表</span>
      </template>

      <template #toolbar-left>
        <el-button type="primary" :icon="Plus" :disabled="!dictId"
          @click="dataEditModalRef.open(undefined, dictId)">新增项</el-button>
      </template>

      <template #search-basic>
        <el-form-item>
          <el-input v-model="queryParams.itemLabel" placeholder="请输入" clearable style="width: 180px"
            :disabled="!dictId">
            <template #prefix><span class="text-xs text-gray-400">字典标签:</span></template>
          </el-input>
        </el-form-item>
      </template>

      <template #search-advanced>
        <el-form-item>
          <el-select v-model="queryParams.status" placeholder="请选择" clearable style="width: 180px">
            <template #prefix><span class="text-xs text-gray-400 mr-0.5">状态:</span></template>
            <el-option label="正常" value="0" />
            <el-option label="停用" value="1" />
          </el-select>
        </el-form-item>
      </template>

      <template #table>
        <el-table v-loading="loading" :data="tableData" border size="small">
          <el-table-column prop="itemLabel" label="字典标签" min-width="100" show-overflow-tooltip>
            <template #default="{ row }">
              <el-tag :type="row.listClass" size="small" effect="light" round>{{ row.itemLabel }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="itemValue" label="字典值" width="70" align="center" />
          <el-table-column prop="status" label="状态" width="60" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === 0 ? 'success' : 'danger'" size="small" effect="light" round>{{ row.status
                === 0 ? '正常' : '停用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sort" label="排序" width="60" align="center" />
          <el-table-column label="操作" width="70" align="center" fixed="right">
            <template #default="{ row }">
              <div class="flex justify-center gap-1">
                <el-tooltip content="修改" placement="top" :enterable="false">
                  <el-button :icon="Edit" link type="primary" @click="dataEditModalRef.open(row, dictId)" />
                </el-tooltip>
                <el-tooltip content="删除" placement="top" :enterable="false">
                  <el-button :icon="Delete" link type="danger" @click="handleDelete(row)" />
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>
    <DataEditModal ref="dataEditModalRef" @success="loadData" />
  </div>
</template>
