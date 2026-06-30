<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';
import { Delete, Edit, Plus } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getDictPageApi, deleteDictApi } from '#/api/system/dict/dict';
import type { Dict } from '#/api/system/dict/dict';

import EditModal from './edit.vue';

const emit = defineEmits(['rowClick']);

const loading = ref(false);
const tableData = ref<Dict[]>([]);
const total = ref(0);
const editModalRef = ref();
const moreParams = ref(false);

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  dictName: undefined,
  dictCode: undefined,
});

async function loadData() {
  try {
    loading.value = true;
    const res = await getDictPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch {
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

async function handleDelete(row: Dict) {
  try {
    await ElMessageBox.confirm(`确定要删除字典 "${row.dictName}" 吗？`, '提示', { type: 'warning' });
    await deleteDictApi(row.dictId);
    ElMessage.success('删除成功');
    loadData();
  } catch { }
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.dictName = undefined;
  queryParams.dictCode = undefined;
  queryParams.pageNo = 1;
  loadData();
}

onMounted(loadData);
</script>

<template>
  <div>
    <BaseTableLayout v-model:queryParams="queryParams" :loading="loading" :total="total"
      v-model:more-params="moreParams" @search="loadData" @reset="resetQuery">
      <template #title>
        <span class="font-medium text-gray-800 dark:text-gray-200">字典列表</span>
      </template>

      <template #toolbar-left>
        <el-button type="primary" :icon="Plus" @click="editModalRef.open()">新增</el-button>
      </template>

      <template #search-basic>
        <el-form-item>
          <el-input v-model="queryParams.dictName" placeholder="请输入" clearable style="width: 180px">
            <template #prefix><span class="text-xs text-gray-400">字典名称:</span></template>
          </el-input>
        </el-form-item>
      </template>

      <template #search-advanced>
        <el-form-item>
          <el-input v-model="queryParams.dictCode" placeholder="请输入" clearable style="width: 180px"
            @keyup.enter="loadData">
            <template #prefix><span class="text-xs text-gray-400 mr-0.5">字典编码:</span></template>
          </el-input>
        </el-form-item>
      </template>

      <template #table>
        <el-table v-loading="loading" :data="tableData" border size="small" highlight-current-row
          @row-click="(row) => emit('rowClick', row.dictId)">
          <el-table-column prop="dictName" label="字典名称" min-width="110" show-overflow-tooltip />
          <el-table-column prop="dictCode" label="字典编码" min-width="110" show-overflow-tooltip />
          <el-table-column label="操作" width="70" align="center" fixed="right">
            <template #default="{ row }">
              <div class="flex justify-center gap-1">
                <el-tooltip content="修改" placement="top" :enterable="false">
                  <el-button :icon="Edit" link type="primary" @click.stop="editModalRef.open(row)" />
                </el-tooltip>
                <el-tooltip content="删除" placement="top" :enterable="false">
                  <el-button :icon="Delete" link type="danger" @click.stop="handleDelete(row)" />
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <EditModal ref="editModalRef" @success="loadData" />
  </div>

</template>
