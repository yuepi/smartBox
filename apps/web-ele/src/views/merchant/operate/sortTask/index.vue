<script lang="ts" setup>
import type { SortTask, SortTaskPageParams } from '#/api/operation/sortTask';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { getDeviceListApi } from '#/api/device/device';
import {
  deleteSortTaskApi,
  editSortTaskApi,
  getSortTaskPageApi,
} from '#/api/operation/sortTask';
import {
  defaultSortTaskColumns,
  SORT_TASK_STORAGE_KEY,
} from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

import SortItemDialog from './SortItemDialog.vue';
import SortTaskDetail from './SortTaskDetail.vue';

const { sort_status } = useDicts(['sort_status']);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultSortTaskColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const detailRef = ref();
const itemDialogRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<SortTask[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

// 下拉选项
const deviceOptions = ref<Device[]>([]);

// 查询参数
const queryParams = reactive<SortTaskPageParams>({
  pageNo: 1,
  pageSize: 10,
  sortNo: undefined,
  cleanTaskId: undefined,
  deviceId: undefined,
  sortStatus: undefined,
});

// --- 加载选项 ---
async function loadOptions() {
  try {
    const deviceRes = await getDeviceListApi({ status: 0 });
    deviceOptions.value = deviceRes || [];
  } catch (error) {
    console.error(error);
  }
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getSortTaskPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

// --- 详情 ---
function handleView(row: SortTask) {
  detailRef.value?.open(row);
}

// --- 明细 ---
function handleManageItems(row: SortTask) {
  itemDialogRef.value?.open(row);
}

// --- 状态变更 ---
async function handleStatusChange(row: SortTask, status: number) {
  const statusMap: Record<number, string> = {
    0: '待分拣',
    1: '分拣中',
    2: '已完成',
  };
  try {
    await ElMessageBox.confirm(
      `确定要将任务状态改为【${statusMap[status] || '未知'}】吗？`,
      '提示',
      { type: 'warning' },
    );
    await editSortTaskApi({
      sortTaskId: row.sortTaskId,
      sortStatus: status,
      sortTime:
        status === 2
          ? new Date().toISOString().slice(0, 19).replace('T', ' ')
          : undefined,
    });
    ElMessage.success('状态更新成功');
    handleQuery();
  } catch {
    // 取消操作
  }
}

// --- 删除 ---
async function handleDelete(row?: SortTask) {
  // eslint-disable-next-line no-useless-assignment
  let ids: number[] = [];
  if (row) {
    ids = [row.sortTaskId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条分拣任务吗？`,
      '提示',
      { type: 'warning' },
    );
    for (const id of ids) {
      await deleteSortTaskApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条任务`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: SortTask[]) {
  selectedIds.value = selection.map((item) => item.sortTaskId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.sortNo = undefined;
  queryParams.cleanTaskId = undefined;
  queryParams.deviceId = undefined;
  queryParams.sortStatus = undefined;
  queryParams.pageNo = 1;
  loadData();
}

onMounted(() => {
  loadOptions();
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
      <!-- 📥 基础筛选项 -->
      <template #search-basic>
        <el-form-item>
          <el-input
            v-model="queryParams.sortNo"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">分拣单号:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-select
            v-model="queryParams.deviceId"
            clearable
            filterable
            style="width: 200px"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">设备名称:</span>
            </template>
            <el-option
              v-for="item in deviceOptions"
              :key="item.deviceId"
              :label="item.deviceName"
              :value="item.deviceId"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select
            v-model="queryParams.sortStatus"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">分拣状态:</span>
            </template>
            <el-option
              v-for="item in sort_status"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <!-- <template #search-advanced>
      </template> -->

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <ExportButton
          :module-code="ModuleCodeMap.SORT_TASK"
          :fields="visibleColumns"
          :find-cond="queryParams"
        />
        <el-button
          type="danger"
          plain
          icon="Delete"
          :disabled="selectedIds.length === 0"
          @click="handleDelete()"
        >
          批量删除
        </el-button>
        <transition name="el-fade-in">
          <span
            v-if="selectedIds.length > 0"
            class="selected-alert-badge ml-2 text-sm text-gray-400"
          >
            已选
            <span class="text-red-500 font-medium">{{
              selectedIds.length
            }}</span>
            项
          </span>
        </transition>
      </template>

      <!-- 📥 工具栏右侧 -->
      <template #toolbar-right>
        <ColumnSelector
          :storage-key="SORT_TASK_STORAGE_KEY"
          :default-columns="defaultSortTaskColumns"
          @update:columns="handleColumnsUpdate"
        />
      </template>

      <!-- 📥 表格 -->
      <template #table>
        <el-table
          :data="tableData"
          border
          stripe
          style="width: 100%; height: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" align="center" />

          <el-table-column
            v-for="col in visibleColumns"
            :key="col.key"
            :prop="col.key"
            :label="col.label"
            :width="typeof col.width === 'number' ? col.width : undefined"
            :min-width="col.minWidth"
            :align="col.align"
            :show-overflow-tooltip="col.showOverflowTooltip || false"
          >
            <template #default="{ row }">
              <template v-if="col.key === 'sortStatus'">
                <DictTag :options="sort_status" :value="row.sortStatus" />
              </template>
              <template
                v-else-if="
                  col.key === 'totalWeight' || col.key === 'realWeight'
                "
              >
                {{ (row as any)[col.key]?.toFixed(2) || 0 }} kg
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column
            label="操作"
            width="200"
            fixed="right"
            align="center"
          >
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" type="primary" @click="handleView(row)">
                  详情
                </el-button>
                <el-button
                  size="small"
                  type="primary"
                  @click="handleManageItems(row)"
                >
                  明细
                </el-button>
                <el-button
                  v-if="row.sortStatus === 0"
                  size="small"
                  type="primary"
                  @click="handleStatusChange(row, 1)"
                >
                  开始分拣
                </el-button>
                <el-button
                  v-if="row.sortStatus === 1"
                  size="small"
                  type="success"
                  @click="handleStatusChange(row, 2)"
                >
                  完成分拣
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  @click="handleDelete(row)"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <!-- ===== 弹窗们 ===== -->
    <SortTaskDetail ref="detailRef" />
    <SortItemDialog ref="itemDialogRef" @success="loadData" />
  </Page>
</template>

<style scoped>
.selected-alert-badge {
  display: inline-block;
}
</style>
