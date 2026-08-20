<script lang="ts" setup>
import type { DeviceHatch, DeviceHatchPageParams } from '#/api/device/deviceHatch';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from '@vben/common-ui';

import { getDeviceListApi } from '#/api/device/device';
import {
  deleteDeviceHatchApi,
  getDeviceHatchPageApi,
} from '#/api/device/deviceHatch';
import { defaultHatchColumns, HATCH_STORAGE_KEY } from '#/constants/tableColumns';
import { ModuleCodeMap } from '#/hooks/useExport';

import HatchForm from './HatchForm.vue';
import LogDialog from './LogDialog.vue';

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultHatchColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const hatchFormRef = ref();
const logDialogVisible = ref(false);
const currentLogHatchId = ref(0);
const currentLogHatchName = ref('');

// --- 日志 ---
function handleLog(row: DeviceHatch) {
  currentLogHatchId.value = row.deviceHatchId;
  currentLogHatchName.value = row.hatchName;
  logDialogVisible.value = true;
}

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<DeviceHatch[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const moreParams = ref(false);

// 下拉选项
const deviceOptions = ref<Device[]>([]);

// 查询参数
const queryParams = reactive<DeviceHatchPageParams>({
  pageNo: 1,
  pageSize: 10,
  deviceId: undefined,
  hatchStatus: undefined,
  status: undefined,
});

// --- 辅助函数 ---
function getHatchStatusText(status: number): string {
  return status === 0 ? '未满' : '已满';
}

function getHatchStatusType(status: number): string {
  return status === 0 ? 'success' : 'danger';
}

function getStatusText(status: number): string {
  return status === 0 ? '启用' : '禁用';
}

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
    const res = await getDeviceHatchPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

// --- 新增 ---
function handleAdd() {
  hatchFormRef.value?.open();
}

// --- 编辑 ---
function handleEdit(row: DeviceHatch) {
  hatchFormRef.value?.open(row);
}

// --- 删除 ---
async function handleDelete(row?: DeviceHatch) {
  let ids: number[] = [];
  if (row) {
    ids = [row.deviceHatchId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning('请选择要删除的记录');
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${ids.length} 条仓口吗？`, '提示', { type: 'warning' });
    for (const id of ids) {
      await deleteDeviceHatchApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条仓口`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: DeviceHatch[]) {
  selectedIds.value = selection.map((item) => item.deviceHatchId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.deviceId = undefined;
  queryParams.hatchStatus = undefined;
  queryParams.status = undefined;
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
v-model:query-params="queryParams" v-model:more-params="moreParams" :loading="loading"
      :total="total" @search="loadData" @reset="resetQuery"
>
      <!-- 📥 基础筛选项 -->
      <template #search-basic>
        <el-form-item>
          <el-select v-model="queryParams.deviceId" clearable filterable style="width: 200px" @change="handleQuery">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">所属设备:</span>
            </template>
            <el-option
v-for="item in deviceOptions" :key="item.deviceId" :label="item.deviceName"
              :value="item.deviceId"
/>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="queryParams.hatchStatus" clearable style="width: 200px">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">仓口状态:</span>
            </template>
            <el-option label="未满" :value="0" />
            <el-option label="已满" :value="1" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-select v-model="queryParams.status" clearable style="width: 200px">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">状态:</span>
            </template>
            <el-option label="启用" :value="0" />
            <el-option label="禁用" :value="1" />
          </el-select>
        </el-form-item>
      </template>

      <!-- 📥 高级筛选项 -->
      <template #search-advanced>
      </template>

      <!-- 📥 工具栏左侧 -->
      <template #toolbar-left>
        <el-button type="primary" icon="Plus" @click="handleAdd">新增仓口</el-button>
        <ExportButton :module-code="ModuleCodeMap.DEVICE_HATCH" :fields="visibleColumns" :find-cond="queryParams" />
        <el-button type="danger" plain icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete()">
          批量删除
        </el-button>
        <transition name="el-fade-in">
          <span v-if="selectedIds.length > 0" class="selected-alert-badge ml-2 text-xs text-gray-400">
            已选 <span class="text-red-500 font-medium">{{ selectedIds.length }}</span> 项
          </span>
        </transition>
      </template>

      <!-- 📥 工具栏右侧 -->
      <template #toolbar-right>
        <ColumnSelector
:storage-key="HATCH_STORAGE_KEY" :default-columns="defaultHatchColumns"
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
            :show-overflow-tooltip="col.showOverflowTooltip || false"
>
            <template #default="{ row }">
              <template v-if="col.key === 'hatchNo'">
                {{ row.hatchNo }}
              </template>
              <template v-else-if="col.key === 'currentWeight'">
                <span :class="{ 'text-orange-500': row.currentWeight >= (row.weightThreshold || 100) }">
                  {{ (row.currentWeight || 0).toFixed(2) }} kg
                </span>
              </template>
              <template v-else-if="col.key === 'weightThreshold'">
                {{ (row.weightThreshold || 100).toFixed(2) }} kg
              </template>
              <template v-else-if="col.key === 'hatchStatus'">
                <el-tag :type="getHatchStatusType(row.hatchStatus)" size="small" round effect="light">
                  {{ getHatchStatusText(row.hatchStatus) }}
                </el-tag>
              </template>
              <template v-else-if="col.key === 'lastCleanTime'">
                {{ row.lastCleanTime || '-' }}
              </template>
              <template v-else-if="col.key === 'status'">
                <el-tag :type="row.status === 0 ? 'success' : 'danger'" size="small" round effect="light">
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
              <template v-else-if="col.key === 'deviceId'">
                {{ row.deviceName || row.deviceId || '-' }}
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="150" fixed="right" align="center">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button size="small" type="info" @click="handleLog(row)">
                  日志
                </el-button>
                <el-button size="small" type="primary" @click="handleEdit(row)">
                  编辑
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
    <HatchForm ref="hatchFormRef" @success="handleQuery" />

    <LogDialog
v-model:visible="logDialogVisible" :device-hatch-id="currentLogHatchId"
      :device-hatch-name="currentLogHatchName"
/>
  </Page>
</template>

<style scoped>
.text-orange-500 {
  font-weight: 500;
  color: #e6a23c;
}

.selected-alert-badge {
  display: inline-block;
}
</style>
