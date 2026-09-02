<script lang="ts" setup>
import type { VersionQueryParams, VersionUpdate } from '#/api/system/version';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElMessage, ElMessageBox } from 'element-plus';

import { deleteVersionApi, getVersionPageApi } from '#/api/system/version';
import {
  defaultVersionColumns,
  VERSION_STORAGE_KEY,
} from '#/constants/tableColumns';

import EditModal from './editModal.vue';

// --- 列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultVersionColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 状态 ---
const editModalRef = ref();
const loading = ref(false);
const tableData = ref<VersionUpdate[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

const queryParams = reactive<VersionQueryParams>({
  pageNo: 1,
  pageSize: 10,
  version: undefined,
  title: undefined,
  status: undefined,
});

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getVersionPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

// 采用安全重置，确保不破坏 queryParams 的对象响应式
function resetQuery() {
  Object.assign(queryParams, {
    pageNo: 1,
    pageSize: 10,
    version: undefined,
    title: undefined,
    status: undefined,
  });
  loadData();
}

function handleSelectionChange(selection: VersionUpdate[]) {
  selectedIds.value = selection.map((item) => item.versionUpdateId);
}

// --- 增删改 ---
function handleAdd() {
  editModalRef.value?.open();
}

function handleEdit(row: VersionUpdate) {
  editModalRef.value?.open(row.versionUpdateId);
}

async function handleDelete(row?: VersionUpdate) {
  const ids = row ? [row.versionUpdateId] : selectedIds.value;
  if (ids.length === 0) {
    ElMessage.warning('请选择要删除的记录');
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条记录吗？`,
      '提示',
      {
        type: 'warning',
      },
    );
    for (const id of ids) {
      await deleteVersionApi(id);
    }
    ElMessage.success('删除成功');
    selectedIds.value = [];
    loadData();
  } catch {
    // 取消
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <BaseTableLayout
      v-model:query-params="queryParams"
      v-model:more-params="moreParams"
      :loading="loading"
      :total="total"
      @search="loadData"
      @reset="resetQuery"
    >
      <!-- 基础搜索区域 -->
      <template #search-basic>
        <el-form-item>
          <el-input
            v-model="queryParams.version"
            placeholder="请输入"
            clearable
            style="width: 180px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">版本号:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="queryParams.title"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">标题:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-select
            v-model="queryParams.status"
            clearable
            placeholder="请选择"
            style="width: 160px"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">状态:</span>
            </template>
            <el-option :value="1" label="已发布" />
            <el-option :value="0" label="草稿" />
          </el-select>
        </el-form-item>
      </template>

      <!-- 左侧操作工具栏 -->
      <template #toolbar-left>
        <el-button type="primary" plain icon="Plus" @click="handleAdd">
          新增版本
        </el-button>
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="selectedIds.length === 0"
          @click="handleDelete()"
        >
          批量删除
        </el-button>
      </template>

      <!-- 右侧筛选列选择工具栏 -->
      <template #toolbar-right>
        <ColumnSelector
          :storage-key="VERSION_STORAGE_KEY"
          :default-columns="defaultVersionColumns"
          @update:columns="handleColumnsUpdate"
        />
      </template>

      <!-- 数据表格区 -->
      <template #table>
        <el-table
          :data="tableData"
          border
          stripe
          style="width: 100%; height: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="50" align="center" />

          <el-table-column
            v-for="col in visibleColumns"
            :key="col.key"
            :prop="col.key"
            :label="col.label"
            :width="col.width"
            :min-width="col.minWidth"
            :align="col.align"
            :show-overflow-tooltip="col.showOverflowTooltip"
          >
            <template #default="{ row }">
              <template v-if="col.key === 'status'">
                <el-tag
                  :type="row.status === 1 ? 'success' : 'info'"
                  size="small"
                >
                  {{ row.status === 1 ? '已发布' : '草稿' }}
                </el-tag>
              </template>
              <template v-else-if="col.key === 'newCount'">
                <span class="text-primary font-medium">{{
                  row.newCount || 0
                }}</span>
              </template>
              <template v-else-if="col.key === 'optimizeCount'">
                <span class="text-success font-medium">{{
                  row.optimizeCount || 0
                }}</span>
              </template>
              <template v-else-if="col.key === 'fixCount'">
                <span class="text-warning font-medium">{{
                  row.fixCount || 0
                }}</span>
              </template>
              <template v-else>
                {{ row[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column
            label="操作"
            width="150"
            fixed="right"
            align="center"
          >
            <template #default="{ row }">
              <el-button
                size="small"
                type="primary"
                link
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                size="small"
                type="danger"
                link
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <EditModal ref="editModalRef" @success="loadData" />
  </Page>
</template>
