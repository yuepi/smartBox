<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

import { Page } from "@vben/common-ui";

import {
  Delete,
  Edit,
  Plus,
  Refresh,
  Search,
  View,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import { type Device, getDeviceListApi } from "#/api/device/device";
import {
  type DeviceHatch,
  getDeviceHatchListApi,
} from "#/api/device/deviceHatch";
import {
  addCleanTaskApi,
  type CleanTask,
  type CleanTaskPageParams,
  deleteCleanTaskApi,
  editCleanTaskApi,
  getCleanTaskDetailApi,
  getCleanTaskPageApi,
  TaskStatusMap,
} from "#/api/operation/cleanTask";
import { type Dept, getMerchantDeptListApi } from "#/api/system/dept";
import ColumnSelector from "#/components/ColumnSelector/index.vue";
import ExportFieldSelector from "#/components/ExportFieldSelector/index.vue";
import {
  CLEAN_TASK_STORAGE_KEY,
  defaultCleanTaskColumns,
  type TableColumnConfig,
} from "#/constants/tableColumns";
import { useDicts } from "#/hooks/useDict";
import { ModuleCodeMap, useExport } from "#/hooks/useExport";

const { task_status } = useDicts(["task_status"]);
const { exporting, exportData } = useExport(ModuleCodeMap.CLEAN_TASK);

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultCleanTaskColumns]);

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
const tableData = ref<CleanTask[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 表单弹窗
const formVisible = ref(false);
const formTitle = ref("");
const formData = ref<Partial<CleanTask>>({});
const formSubmitting = ref(false);

// 详情弹窗
const detailVisible = ref(false);
const detailData = ref<CleanTask | null>(null);

// 下拉选项
const deviceOptions = ref<Device[]>([]);
const hatchOptions = ref<DeviceHatch[]>([]);
const deptOptions = ref<Dept[]>([]);

// 任务状态选项
const taskStatusOptions = [
  { label: "全部", value: undefined },
  ...Object.entries(TaskStatusMap).map(([key, val]) => ({
    label: val.label,
    value: Number(key),
  })),
];

// 查询参数
const queryParams = reactive<CleanTaskPageParams>({
  pageNo: 1,
  pageSize: 10,
  taskNo: undefined,
  deptId: undefined,
  deviceId: undefined,
  taskStatus: undefined,
});

// --- 辅助函数 ---
function getTaskStatusText(status: number): string {
  return TaskStatusMap[status]?.label || "未知";
}

function getTaskStatusType(status: number): string {
  return TaskStatusMap[status]?.type || "info";
}

// --- 加载选项 ---
async function loadOptions() {
  try {
    const [deviceRes, deptRes] = await Promise.all([
      getDeviceListApi({ status: 0 }),
      getMerchantDeptListApi({ status: 0 }),
    ]);
    deviceOptions.value = deviceRes || [];
    deptOptions.value = deptRes || [];
  } catch (error) {
    console.error(error);
  }
}

// 加载仓口选项
async function loadHatchOptions(deviceId: number) {
  if (!deviceId) {
    hatchOptions.value = [];
    return;
  }
  try {
    const res = await getDeviceHatchListApi({ deviceId, status: 0 });
    hatchOptions.value = res || [];
  } catch (error) {
    console.error(error);
  }
}

// 监听设备变化
async function onDeviceChange(deviceId: number) {
  formData.value.hatchId = undefined;
  await loadHatchOptions(deviceId);
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getCleanTaskPageApi(queryParams);
    tableData.value = res.records || [];
    total.value = res.total || 0;
  } catch (error) {
    console.error(error);
    ElMessage.error("加载数据失败");
  } finally {
    loading.value = false;
  }
}

// --- 新增/编辑 ---
function handleAdd() {
  formTitle.value = "新增清运任务";
  formData.value = {
    taskStatus: 0,
  };
  formVisible.value = true;
}

async function handleEdit(row: CleanTask) {
  try {
    formTitle.value = "编辑清运任务";
    const res = await getCleanTaskDetailApi(row.cleanTaskId);
    formData.value = res || {};
    if (formData.value.deviceId) {
      await loadHatchOptions(formData.value.deviceId);
    }
    formVisible.value = true;
  } catch {
    ElMessage.error("获取任务信息失败");
  }
}

async function handleSubmit() {
  if (!formData.value.deviceId) {
    ElMessage.warning("请选择设备");
    return;
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.cleanTaskId ? editCleanTaskApi : addCleanTaskApi;
    await api(formData.value);
    ElMessage.success(formData.value.cleanTaskId ? "修改成功" : "新增成功");
    formVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    formSubmitting.value = false;
  }
}

// --- 详情 ---
async function handleView(row: CleanTask) {
  try {
    const res = await getCleanTaskDetailApi(row.cleanTaskId);
    detailData.value = res;
    detailVisible.value = true;
  } catch {
    ElMessage.error("获取详情失败");
  }
}

// --- 删除 ---
async function handleDelete(row?: CleanTask) {
  let ids: number[] = [];

  if (row) {
    ids = [row.cleanTaskId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning("请选择要删除的记录");
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条任务吗？`,
      "提示",
      { type: "warning" }
    );

    for (const id of ids) {
      await deleteCleanTaskApi(id);
    }

    ElMessage.success(`成功删除 ${ids.length} 条任务`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: CleanTask[]) {
  selectedIds.value = selection.map((item) => item.cleanTaskId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.taskNo = undefined;
  queryParams.deptId = undefined;
  queryParams.deviceId = undefined;
  queryParams.taskStatus = undefined;
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
    <div class="p-0">
      <!-- 查询表单 -->
      <el-card shadow="never" class="border-none mb-4 !p-2">
        <el-form
          :inline="true"
          :model="queryParams"
          class="flex flex-wrap gap-x-2 gap-y-2 items-center"
        >
          <el-form-item class="!mb-0 !mr-2">
            <el-input
              v-model="queryParams.taskNo"
              placeholder="请输入"
              clearable
              style="width: 200px"
              @keyup.enter="handleQuery"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">任务单号:</span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-tree-select
              v-model="queryParams.deptId"
              :data="deptOptions"
              :props="{
                value: 'deptId',
                label: 'deptName',
                children: 'children',
              }"
              placeholder="请选择"
              clearable
              check-strictly
              style="width: 200px"
              class="tree-prefix-dept"
            />
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select
              v-model="queryParams.taskStatus"
              clearable
              style="width: 200px"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">任务状态:</span>
              </template>
              <el-option
                v-for="item in taskStatusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-0 md:ml-auto flex items-center gap-1">
            <el-tooltip content="查询" placement="top">
              <el-button
                type="primary"
                :icon="Search"
                circle
                @click="handleQuery"
              />
            </el-tooltip>
            <el-tooltip content="重置" placement="top">
              <el-button :icon="Refresh" circle @click="resetQuery" />
            </el-tooltip>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 -->
      <el-card shadow="never" class="border-none !p-2">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <el-button type="primary" plain :icon="Plus" @click="handleAdd">
              新增任务
            </el-button>
            <el-button :loading="exporting" @click="openExportSelector">
              导出
            </el-button>
            <el-button
              type="danger"
              plain
              :icon="Delete"
              :disabled="selectedIds.length === 0"
              @click="handleDelete()"
            >
              批量删除
            </el-button>
            <span
              v-if="selectedIds.length > 0"
              class="text-xs text-gray-400 ml-2"
            >
              已选
              <span class="text-red-500 font-medium">{{
                selectedIds.length
              }}</span>
              项
            </span>
          </div>

          <div class="flex items-center">
            <ColumnSelector
              :storage-key="CLEAN_TASK_STORAGE_KEY"
              :default-columns="defaultCleanTaskColumns"
              @update:columns="handleColumnsUpdate"
            />
          </div>
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
          <el-table-column type="selection" width="50" align="center" />

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
              <!-- 任务状态 -->
              <template v-if="col.key === 'taskStatus'">
                <DictTag :options="task_status" :value="row.taskStatus" />
              </template>
              <!-- 满仓重量 -->
              <template v-else-if="col.key === 'fullWeight'">
                {{ row.fullWeight?.toFixed(2) || 0 }} kg
              </template>
              <!-- 所属小区 -->
              <template v-else-if="col.key === 'deptName'">
                {{ row.deptName || row.deptId || "-" }}
              </template>
              <!-- 仓口号 -->
              <template v-else-if="col.key === 'hatchNo'">
                {{ row.hatchNo ? `${row.hatchNo}` : "-" }}
              </template>
              <!-- 清运人员 -->
              <template v-else-if="col.key === 'cleanUserName'">
                {{ row.cleanUserName || "-" }}
              </template>
              <!-- 计划时间 -->
              <template v-else-if="col.key === 'planTime'">
                {{ row.planTime || "-" }}
              </template>
              <!-- 完成时间 -->
              <template v-else-if="col.key === 'finishTime'">
                {{ row.finishTime || "-" }}
              </template>
              <!-- 备注 -->
              <template v-else-if="col.key === 'remark'">
                {{ row.remark || "-" }}
              </template>
              <!-- 普通字段 -->
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <!-- 操作列固定写死 -->
          <el-table-column
            label="操作"
            width="250"
            fixed="right"
            align="center"
          >
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                :icon="View"
                @click="handleView(row)"
              >
                详情
              </el-button>
              <el-button
                link
                type="primary"
                :icon="Edit"
                @click="handleEdit(row)"
              >
                编辑
              </el-button>
              <el-button
                link
                type="danger"
                :icon="Delete"
                @click="handleDelete(row)"
              >
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="flex justify-end mt-4">
          <el-pagination
            v-model:current-page="queryParams.pageNo"
            v-model:page-size="queryParams.pageSize"
            :total="total"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="loadData"
            @current-change="loadData"
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

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="formVisible"
      :title="formTitle"
      width="550px"
      append-to-body
    >
      <el-form :model="formData" label-width="100px">
        <el-form-item label="所属小区">
          <el-tree-select
            v-model="formData.deptId"
            :data="deptOptions"
            :props="{
              value: 'deptId',
              label: (data) => {
                // 父节点显示加标识
                if (data.children && data.children.length > 0) {
                  return `${data.deptName} (不可选)`;
                }
                return data.deptName;
              },
              children: 'children',
              disabled: (data) => {
                // 有子节点的就是父节点，禁用父节点
                return data.children && data.children.length > 0;
              },
            }"
            default-expand-all
            placeholder="请选择"
            clearable
            check-strictly
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="选择设备" required>
          <el-select
            v-model="formData.deviceId"
            placeholder="请选择设备"
            clearable
            filterable
            style="width: 100%"
            @change="onDeviceChange"
          >
            <el-option
              v-for="item in deviceOptions"
              :key="item.deviceId"
              :label="item.deviceName"
              :value="item.deviceId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="选择仓口">
          <el-select
            v-model="formData.hatchId"
            placeholder="请先选择设备"
            clearable
            style="width: 100%"
            :disabled="!formData.deviceId"
          >
            <el-option
              v-for="item in hatchOptions"
              :key="item.deviceHatchId"
              :label="`${item.hatchNo}号仓 - ${item.hatchName}`"
              :value="item.deviceHatchId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="清运人员">
          <el-input
            v-model="formData.cleanUserName"
            placeholder="请输入清运人员姓名"
          />
        </el-form-item>
        <el-form-item label="计划时间">
          <el-date-picker
            v-model="formData.planTime"
            type="datetime"
            placeholder="选择计划清运时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="2"
            placeholder="请输入备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="formSubmitting"
          @click="handleSubmit"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="清运任务详情"
      width="600px"
      append-to-body
    >
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="任务单号" :span="2">
          {{ detailData.taskNo }}
        </el-descriptions-item>
        <el-descriptions-item label="所属小区">
          {{ detailData.deptId || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="设备ID">
          {{ detailData.deviceId || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="仓口号">
          {{ detailData.hatchNo ? `${detailData.hatchNo}` : "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="满仓重量">
          {{ detailData.fullWeight?.toFixed(2) || 0 }} kg
        </el-descriptions-item>
        <el-descriptions-item label="清运人员">
          {{ detailData.cleanUserName || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="计划时间">
          {{ detailData.planTime || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="完成时间">
          {{ detailData.finishTime || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="任务状态">
          <el-tag :type="getTaskStatusType(detailData.taskStatus)" size="small">
            {{ getTaskStatusText(detailData.taskStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">
          {{ detailData.remark || "-" }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
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

/* 部门树选择器前缀 */
.tree-prefix-dept :deep(.el-select__wrapper) {
  position: relative;
  padding-left: 45px !important;
}

.tree-prefix-dept :deep(.el-select__wrapper)::before {
  position: absolute;
  top: 50%;
  left: 12px;
  font-size: 12px;
  font-weight: 400;
  color: #909399;
  pointer-events: none;
  content: "部门:";
  transform: translateY(-50%);
}
</style>
