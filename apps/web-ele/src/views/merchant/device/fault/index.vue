<script lang="ts" setup>
import type { DeviceFault, DeviceFaultPageParams } from '#/api/device/deviceFault';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from '@vben/common-ui';

import {
  deleteDeviceFaultApi,
  getDeviceFaultPageApi,
} from '#/api/device/deviceFault';
import { defaultFaultColumns, FAULT_STORAGE_KEY } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

import FaultDetail from './FaultDetail.vue';
import FaultEdit from './FaultEdit.vue';

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultFaultColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const faultDetailRef = ref();
const faultEditRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<DeviceFault[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);
const dateRange = ref<string[]>([]);

// 故障状态选项
const faultStatusOptions = [
  { label: '全部', value: undefined },
  { label: '故障中', value: 0 },
  { label: '已恢复', value: 1 },
  { label: '已处理', value: 2 },
];

// 查询参数
const queryParams = reactive<DeviceFaultPageParams>({
  pageNo: 1,
  pageSize: 10,
  deviceNo: undefined,
  faultCode: undefined,
  faultName: undefined,
  faultStatus: undefined,
  startTime: undefined,
  endTime: undefined,
});

// --- 监听时间范围 ---
watch(dateRange, (newVal) => {
  if (newVal?.length === 2) {
    queryParams.startTime = newVal[0];
    queryParams.endTime = newVal[1];
  } else {
    queryParams.startTime = undefined;
    queryParams.endTime = undefined;
  }
});

// --- 辅助函数 ---
function getFaultStatusText(status: number): string {
  const map: Record<number, string> = { 0: '故障中', 1: '已恢复', 2: '已处理' };
  return map[status] || '未知';
}

function getFaultStatusType(status: number): string {
  const map: Record<number, string> = { 0: 'danger', 1: 'warning', 2: 'success' };
  return map[status] || 'info';
}

function formatDuration(seconds: number): string {
  if (!seconds && seconds !== 0) return '-';
  if (seconds < 60) return `${seconds}秒`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟${seconds % 60}秒`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}小时${minutes}分钟`;
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getDeviceFaultPageApi(queryParams);
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
function handleView(row: DeviceFault) {
  faultDetailRef.value?.open(row);
}

// --- 处理 ---
function handleEdit(row: DeviceFault) {
  faultEditRef.value?.open(row);
}

// --- 删除 ---
async function handleDelete(row?: DeviceFault) {
  // eslint-disable-next-line no-useless-assignment
  let ids: number[] = [];
  if (row) {
    ids = [row.deviceFaultId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${ids.length} 条故障记录吗？`, '提示', { type: 'warning' });
    for (const id of ids) {
      await deleteDeviceFaultApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条记录`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: DeviceFault[]) {
  selectedIds.value = selection.map((item) => item.deviceFaultId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.deviceNo = undefined;
  queryParams.faultCode = undefined;
  queryParams.faultName = undefined;
  queryParams.faultStatus = undefined;
  queryParams.startTime = undefined;
  queryParams.endTime = undefined;
  dateRange.value = [];
  queryParams.pageNo = 1;
  loadData();
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <BaseTableLayout
v-model:query-params="queryParams" v-model:more-params="moreParams" :loading="loading"
      :total="total" @search="loadData" @reset="resetQuery"
>
      <!-- 📥 基础筛选项 -->
      <template #search-basic>
        <el-form-item>
          <el-input
v-model="queryParams.deviceNo" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">设备编号:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-input
v-model="queryParams.faultCode" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">故障编码:</span>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-input
v-model="queryParams.faultName" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">故障名称:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.faultStatus" clearable style="width: 200px">
            <template #prefix>
              <span class="text-sm text-gray-400 mr-0.5">故障状态:</span>
            </template>
            <el-option v-for="item in faultStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-date-picker
v-model="dateRange" type="datetimerange" range-separator="至" start-placeholder="开始时间"
            end-placeholder="结束时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 350px"
/>
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <!-- <template #search-advanced>
      </template> -->

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <ExportButton :module-code="ModuleCodeMap.FAULT" :fields="visibleColumns" :find-cond="queryParams" />
        <el-button type="danger" plain icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete()">
          批量删除
        </el-button>
        <transition name="el-fade-in">
          <span v-if="selectedIds.length > 0" class="selected-alert-badge ml-2 text-sm text-gray-400">
            已选 <span class="text-red-500 font-medium">{{ selectedIds.length }}</span> 项
          </span>
        </transition>
      </template>

      <!-- 📥 工具栏右侧 -->
      <template #toolbar-right>
        <ColumnSelector
:storage-key="FAULT_STORAGE_KEY" :default-columns="defaultFaultColumns"
          @update:columns="handleColumnsUpdate"
/>
      </template>

      <!-- 📥 表格 -->
      <template #table>
        <el-table
:data="tableData" border stripe style="width: 100%; height: 100%"
          @selection-change="handleSelectionChange"
>
          <el-table-column type="selection" width="50" align="center" />

          <el-table-column
v-for="col in visibleColumns" :key="col.key" :prop="col.key" :label="col.label"
            :width="typeof col.width === 'number' ? col.width : undefined" :min-width="col.minWidth" :align="col.align"
>
            <template #default="{ row }">
              <template v-if="col.key === 'duration'">
                {{ formatDuration(row.duration) }}
              </template>
              <template v-else-if="col.key === 'faultStatus'">
                <el-tag :type="getFaultStatusType(row.faultStatus)" size="small" round effect="light">
                  {{ getFaultStatusText(row.faultStatus) }}
                </el-tag>
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right" align="center">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" type="primary" @click="handleView(row)">
                  详情
                </el-button>
                <el-button v-if="row.faultStatus !== 2" size="small" type="success" @click="handleEdit(row)">
                  处理
                </el-button>
                <el-button size="small" type="danger" @click="handleDelete(row)">
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </template>
    </BaseTableLayout>

    <!-- ===== 弹窗们 ===== -->
    <FaultDetail ref="faultDetailRef" />
    <FaultEdit ref="faultEditRef" @success="loadData" />
  </Page>
</template>

<style scoped>
.selected-alert-badge {
  display: inline-block;
}
</style>
