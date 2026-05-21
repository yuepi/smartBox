<script lang="ts" setup>
import { computed,onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Delete, Edit, Plus, Refresh, Search, View } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

import { type Device, getDeviceListApi } from '#/api/device/device';
import {
  addSortItemApi,
  deleteSortItemApi,
  editSortItemApi,
  getSortItemListApi,
  PackageTypeMap,
  type SortItem,
} from '#/api/operation/sortItem';
import {
  deleteSortTaskApi,
  editSortTaskApi,
  getSortTaskDetailApi,
  getSortTaskPageApi,
  SortStatusMap,
  type SortTask,
  type SortTaskPageParams,
} from '#/api/operation/sortTask';
import ColumnSelector from "#/components/ColumnSelector/index.vue";
import DictTag from "#/components/DictTag/index.vue";
import ExportFieldSelector from "#/components/ExportFieldSelector/index.vue";
import {
  defaultSortTaskColumns,
  SORT_TASK_STORAGE_KEY,
  type TableColumnConfig,
} from "#/constants/tableColumns";
import { useDicts } from "#/hooks/useDict";
import { ModuleCodeMap, useExport } from "#/hooks/useExport";

const { sort_status } = useDicts(["sort_status"]);
const { package_type } = useDicts(["package_type"]);
const { exporting, exportData } = useExport(ModuleCodeMap.SORT_TASK);

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultSortTaskColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

const getExportableFields = computed(() => {
  return visibleColumns.value.map((col) => ({
    prop: col.key,
    label: col.label,
  }));
});

const exportFieldVisible = ref(false);
const exportFields = ref<{ label: string; prop: string }[]>([]);

function openExportSelector() {
  exportFields.value = getExportableFields.value;
  exportFieldVisible.value = true;
}

async function handleExportConfirm(selectedFields: string[]) {
  await exportData(queryParams, selectedFields);
}

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<SortTask[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 详情弹窗
const detailVisible = ref(false);
const detailData = ref<null | SortTask>(null);

// 明细弹窗
const itemVisible = ref(false);
const itemLoading = ref(false);
const itemList = ref<SortItem[]>([]);
const currentSortTask = ref<null | SortTask>(null);

// 明细表单
const itemFormVisible = ref(false);
const itemFormTitle = ref('');
const itemFormData = ref<Partial<SortItem>>({});
const itemFormSubmitting = ref(false);

// 下拉选项
const deviceOptions = ref<Device[]>([]);

// 分类类型选项
const packageTypeOptions = [
  { label: '混合', value: 0 },
  { label: '织物', value: 1 },
  { label: '金属', value: 2 },
  { label: '塑料', value: 3 },
];

// 分拣状态选项
const sortStatusOptions = [
  { label: '全部', value: undefined },
  ...Object.entries(SortStatusMap).map(([key, val]) => ({
    label: val.label,
    value: Number(key),
  })),
];

// 查询参数
const queryParams = reactive<SortTaskPageParams>({
  pageNo: 1,
  pageSize: 10,
  sortNo: undefined,
  cleanTaskId: undefined,
  deviceId: undefined,
  sortStatus: undefined,
});

// --- 辅助函数 ---
function getSortStatusText(status: number): string {
  return SortStatusMap[status]?.label || '未知';
}

function getSortStatusType(status: number): string {
  return SortStatusMap[status]?.type || 'info';
}

function getPackageTypeText(type: number): string {
  return PackageTypeMap[type]?.label || '未知';
}

function getPackageTypeColor(type: number): string {
  return PackageTypeMap[type]?.color || 'info';
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
async function handleView(row: SortTask) {
  try {
    const res = await getSortTaskDetailApi(row.sortTaskId);
    detailData.value = res;
    detailVisible.value = true;
  } catch {
    ElMessage.error('获取详情失败');
  }
}

// --- 分拣明细管理 ---
async function handleManageItems(row: SortTask) {
  currentSortTask.value = row;
  itemVisible.value = true;
  await loadItemList();
}

async function loadItemList() {
  if (!currentSortTask.value) return;

  itemLoading.value = true;
  try {
    const res = await getSortItemListApi(currentSortTask.value.sortTaskId);
    itemList.value = res || [];
  } catch {
    ElMessage.error('加载明细失败');
  } finally {
    itemLoading.value = false;
  }
}

function handleAddItem() {
  if (!currentSortTask.value) return;
  itemFormTitle.value = '新增分拣明细';
  itemFormData.value = {
    sortTaskId: currentSortTask.value.sortTaskId,
    packageType: 0,
    weight: 0,
  };
  itemFormVisible.value = true;
}

async function handleEditItem(row: SortItem) {
  itemFormTitle.value = '编辑分拣明细';
  itemFormData.value = { ...row };
  itemFormVisible.value = true;
}

async function handleItemSubmit() {
  if (!itemFormData.value.packageType && itemFormData.value.packageType !== 0) {
    ElMessage.warning('请选择分类类型');
    return;
  }
  if (!itemFormData.value.weight || itemFormData.value.weight <= 0) {
    ElMessage.warning('请输入有效的重量');
    return;
  }

  itemFormSubmitting.value = true;
  try {
    const api = itemFormData.value.sortItemId ? editSortItemApi : addSortItemApi;
    await api(itemFormData.value);
    ElMessage.success(itemFormData.value.sortItemId ? '修改成功' : '新增成功');
    itemFormVisible.value = false;
    await loadItemList();
    // 刷新任务列表（总重量可能变化）
    loadData();

  } catch {
    ElMessage.error('操作失败');
  } finally {
    itemFormSubmitting.value = false;
  }
}

async function handleDeleteItem(row: SortItem) {
  try {
    await ElMessageBox.confirm(`确定要删除这条分拣明细吗？`, '提示', { type: 'warning' });
    await deleteSortItemApi(row.sortItemId);
    ElMessage.success('删除成功');
    await loadItemList();
    loadData();
  } catch {
    // 取消删除
  }
}

// --- 状态变更 ---
async function handleStatusChange(row: SortTask, status: number) {
  const action = SortStatusMap[status]?.label || '未知';
  try {
    await ElMessageBox.confirm(`确定要将任务状态改为【${action}】吗？`, '提示', { type: 'warning' });
    await editSortTaskApi({
      sortTaskId: row.sortTaskId,
      sortStatus: status,
      sortTime: status === 2 ? new Date().toISOString().slice(0, 19).replace('T', ' ') : undefined,
    });
    ElMessage.success('状态更新成功');
    handleQuery();

  } catch {
    // 取消操作
  }
}

// --- 删除任务 ---
async function handleDelete(row?: SortTask) {
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
    await ElMessageBox.confirm(`确定要删除选中的 ${ids.length} 条分拣任务吗？`, '提示', { type: 'warning' });

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
    <div class="p-4">
      <!-- 统计卡片 -->
      <!-- <el-row :gutter="16" class="mb-4">
        <el-col :span="6">
          <el-card shadow="hover" class="text-center">
            <div class="text-gray-500 text-sm">任务总数</div>
            <div class="text-2xl font-bold text-primary">{{ total }}</div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="text-center">
            <div class="text-gray-500 text-sm">待分拣</div>
            <div class="text-2xl font-bold text-warning">
              {{tableData.filter((item) => item.sortStatus === 0).length}}
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="text-center">
            <div class="text-gray-500 text-sm">分拣中</div>
            <div class="text-2xl font-bold text-primary">
              {{tableData.filter((item) => item.sortStatus === 1).length}}
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="text-center">
            <div class="text-gray-500 text-sm">已完成</div>
            <div class="text-2xl font-bold text-success">
              {{tableData.filter((item) => item.sortStatus === 2).length}}
            </div>
          </el-card>
        </el-col>
      </el-row> -->

      <!-- 查询表单 -->
      <el-card shadow="never" class="mb-4">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="分拣单号">
            <el-input
v-model="queryParams.sortNo" placeholder="请输入分拣单号" clearable style="width: 180px"
              @keyup.enter="handleQuery"
/>
          </el-form-item>
          <el-form-item label="设备名称">
            <el-select v-model="queryParams.deviceId" placeholder="请选择设备" clearable filterable style="width: 160px">
              <el-option
v-for="item in deviceOptions" :key="item.deviceId" :label="item.deviceName"
                :value="item.deviceId"
/>
            </el-select>
          </el-form-item>
          <el-form-item label="分拣状态">
            <el-select v-model="queryParams.sortStatus" placeholder="全部" clearable style="width: 120px">
              <el-option v-for="item in sortStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
            <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
            <el-button :loading="exporting" @click="openExportSelector">导出</el-button>
            <el-button type="danger" plain :icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete()">
              批量删除
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 -->
      <el-card shadow="never">
        <div class="flex justify-end mb-2">
    <ColumnSelector
      :storage-key="SORT_TASK_STORAGE_KEY"
      :default-columns="defaultSortTaskColumns"
      @update:columns="handleColumnsUpdate"
    />
  </div>
      <el-table
  v-loading="loading"
  :data="tableData"
  border
  stripe
  style="width: 100%"
  @selection-change="handleSelectionChange"
>
  <!-- 选择列固定写死 -->
  <el-table-column type="selection" width="55" align="center" />

  <!-- 动态数据列 -->
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
      <!-- 分拣状态 -->
      <template v-if="col.key === 'sortStatus'">
        <DictTag :options="sort_status" :value="row.sortStatus" />
      </template>
      <!-- 设备名称 -->
      <template v-else-if="col.key === 'deviceName'">
        {{ row.deviceName || row.deviceId || '-' }}
      </template>
      <!-- 总重量 -->
      <template v-else-if="col.key === 'totalWeight'">
        {{ row.totalWeight?.toFixed(2) || 0 }} kg
      </template>
      <!-- 分拣重量 -->
      <template v-else-if="col.key === 'realWeight'">
        <span class="font-medium text-primary">
          {{ row.realWeight?.toFixed(2) || 0 }} kg
        </span>
      </template>
      <!-- 分拣人员 -->
      <template v-else-if="col.key === 'sortUserName'">
        {{ row.sortUserName || '-' }}
      </template>
      <!-- 分拣完成时间 -->
      <template v-else-if="col.key === 'sortTime'">
        {{ row.sortTime || '-' }}
      </template>
      <!-- 备注 -->
      <template v-else-if="col.key === 'remark'">
        {{ row.remark || '-' }}
      </template>
      <!-- 普通字段 -->
      <template v-else>
        {{ (row as any)[col.key] ?? '-' }}
      </template>
    </template>
  </el-table-column>

  <!-- 操作列固定写死 -->
  <el-table-column label="操作" width="250" fixed="right" align="center">
    <template #default="{ row }">
      <el-button link type="primary" :icon="View" @click="handleView(row)">详情</el-button>
      <el-button link type="primary" :icon="Plus" @click="handleManageItems(row)">明细</el-button>
      <el-button v-if="row.sortStatus === 0" link type="primary" @click="handleStatusChange(row, 1)">
        开始分拣
      </el-button>
      <el-button v-if="row.sortStatus === 1" link type="success" @click="handleStatusChange(row, 2)">
        完成分拣
      </el-button>
      <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
    </template>
  </el-table-column>
</el-table>

        <!-- 分页 -->
        <div class="flex justify-end mt-4">
          <el-pagination
v-model:current-page="queryParams.pageNo" v-model:page-size="queryParams.pageSize"
            :total="total" :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadData" @current-change="loadData"
/>
        </div>
      </el-card>
    </div>

    <ExportFieldSelector
  v-model:visible="exportFieldVisible"
  :fields="exportFields"
  :loading="exporting"
  @confirm="handleExportConfirm"
/>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="分拣任务详情" width="600px" append-to-body>
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="分拣单号" :span="2">{{ detailData.sortNo }}</el-descriptions-item>
        <el-descriptions-item label="关联清运任务">{{ detailData.cleanTaskId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="设备ID">{{ detailData.deviceId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="仓口号">{{ detailData.hatchId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="包袋ID">{{ detailData.deviceBagId || '-' }}</el-descriptions-item>
        <el-descriptions-item label="总重量">{{ detailData.totalWeight?.toFixed(2) || 0 }} kg</el-descriptions-item>
        <el-descriptions-item label="分拣重量">
          <span class="font-bold text-primary">{{ detailData.realWeight?.toFixed(2) || 0 }} kg</span>
        </el-descriptions-item>
        <el-descriptions-item label="分拣人员">{{ detailData.sortUserName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="分拣状态">
          <el-tag :type="getSortStatusType(detailData.sortStatus)" size="small">
            {{ getSortStatusText(detailData.sortStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="完成时间">{{ detailData.sortTime || '-' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detailData.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 分拣明细弹窗 -->
    <el-dialog
v-model="itemVisible" :title="`分拣明细 - ${currentSortTask?.sortNo}`" width="700px" append-to-body
      @close="itemList = []"
>
      <div class="mb-4">
        <el-button type="primary" :icon="Plus" @click="handleAddItem">新增明细</el-button>
      </div>
      <el-table v-loading="itemLoading" :data="itemList" border stripe style="width: 100%">
        <el-table-column prop="sortItemId" label="明细ID" width="80" align="center" />
        <el-table-column prop="packageType" label="分类类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getPackageTypeColor(row.packageType)" size="small">
              {{ getPackageTypeText(row.packageType) }}
            </el-tag>
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
            <el-button link type="primary" :icon="Edit" @click="handleEditItem(row)">编辑</el-button>
            <el-button link type="danger" :icon="Delete" @click="handleDeleteItem(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="itemVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 分拣明细表单弹窗 -->
    <el-dialog v-model="itemFormVisible" :title="itemFormTitle" width="450px" append-to-body>
      <el-form :model="itemFormData" label-width="80px">
        <el-form-item label="分类类型" required>
          <el-select v-model="itemFormData.packageType" placeholder="请选择" style="width: 100%">
            <el-option v-for="item in packageTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类名称">
          <el-input v-model="itemFormData.packageName" placeholder="请输入分类名称（可选）" />
        </el-form-item>
        <el-form-item label="重量(kg)" required>
          <el-input-number v-model="itemFormData.weight" :min="0" :precision="2" :step="0.1" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="itemFormVisible = false">取消</el-button>
        <el-button type="primary" :loading="itemFormSubmitting" @click="handleItemSubmit">确定</el-button>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped>
.text-primary {
  color: #409eff;
}

.text-success {
  color: #67c23a;
}

.text-warning {
  color: #e6a23c;
}

.font-bold {
  font-weight: 600;
}
</style>
