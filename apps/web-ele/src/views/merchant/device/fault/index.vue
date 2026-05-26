<script lang="ts" setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';

import { Page } from "@vben/common-ui";

import { Edit, Refresh, Search, View } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import {
  deleteDeviceFaultApi,
  type DeviceFault,
  type DeviceFaultPageParams,
  editDeviceFaultApi,
  getDeviceFaultDetailApi,
  getDeviceFaultPageApi,
} from "#/api/device/deviceFault";
import ColumnSelector from "#/components/ColumnSelector/index.vue";
import ExportFieldSelector from "#/components/ExportFieldSelector/index.vue";
import {
  defaultFaultColumns,
  FAULT_STORAGE_KEY,
  type TableColumnConfig,
} from "#/constants/tableColumns";
import { ModuleCodeMap, useExport } from "#/hooks/useExport";

const { exporting, exportData } = useExport(ModuleCodeMap.FAULT);

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultFaultColumns]);

// 组件内部会处理 localStorage，页面只需要监听 update:columns
function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

// 可见的数据列
const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// 可导出的字段
const getExportableFields = computed(() => {
  return visibleColumns.value.map((col) => ({
    prop: col.key,
    label: col.label,
  }));
});

// 导出字段选择弹窗
const exportFieldVisible = ref(false);
const exportFields = ref<{ label: string; prop: string }[]>([]);

function openExportSelector() {
  exportFields.value = getExportableFields.value;
  exportFieldVisible.value = true;
}

async function handleExportConfirm(selectedFields: string[]) {
  await exportData(queryParams, { columns: selectedFields });
}

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<DeviceFault[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 详情弹窗
const detailVisible = ref(false);
const detailData = ref<DeviceFault | null>(null);

// 处理故障弹窗
const editVisible = ref(false);
const editSubmitting = ref(false);
const editForm = reactive({
  deviceFaultId: 0,
  faultStatus: 1,
  dealRemark: "",
});

// 时间范围
const dateRange = ref<string[]>([]);

// 故障状态选项
const faultStatusOptions = [
  { label: "全部", value: undefined },
  { label: "故障中", value: 0 },
  { label: "已恢复", value: 1 },
  { label: "已处理", value: 2 },
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

// 故障状态统计
const faultStatusCount = computed(() => {
  const count: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
  tableData.value.forEach((item) => {
    count[item.faultStatus] = (count[item.faultStatus] || 0) + 1;
  });
  return count;
});

// 监听时间范围变化
watch(dateRange, (newVal) => {
  if (newVal && newVal.length === 2) {
    queryParams.startTime = newVal[0];
    queryParams.endTime = newVal[1];
  } else {
    queryParams.startTime = undefined;
    queryParams.endTime = undefined;
  }
});

// --- 辅助函数 ---
function getFaultStatusText(status: number): string {
  const map: Record<number, string> = { 0: "故障中", 1: "已恢复", 2: "已处理" };
  return map[status] || "未知";
}

function getFaultStatusType(status: number): string {
  const map: Record<number, string> = {
    0: "danger",
    1: "warning",
    2: "success",
  };
  return map[status] || "info";
}

function formatDuration(seconds: number): string {
  if (!seconds && seconds !== 0) return "-";
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
    ElMessage.error("加载数据失败");
  } finally {
    loading.value = false;
  }
}

// --- 详情 ---
async function handleView(row: DeviceFault) {
  try {
    const res = await getDeviceFaultDetailApi(row.deviceFaultId);
    detailData.value = res;
    detailVisible.value = true;
  } catch {
    ElMessage.error("获取详情失败");
  }
}

// --- 处理故障 ---
async function handleEdit(row: DeviceFault) {
  editForm.deviceFaultId = row.deviceFaultId;
  editForm.faultStatus = 1;
  editForm.dealRemark = "";
  editVisible.value = true;
}

async function submitEdit() {
  editSubmitting.value = true;
  try {
    await editDeviceFaultApi({
      deviceFaultId: editForm.deviceFaultId,
      faultStatus: editForm.faultStatus,
      dealRemark: editForm.dealRemark,
    });
    ElMessage.success("处理成功");
    editVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error("处理失败");
  } finally {
    editSubmitting.value = false;
  }
}

// --- 删除 ---
async function handleDelete(row?: DeviceFault) {
  let ids: number[] = [];

  if (row) {
    ids = [row.deviceFaultId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning("请选择要删除的记录");
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条故障记录吗？`,
      "提示",
      { type: "warning" }
    );

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
    <div class="p-4">
      <!-- 查询表单 -->
      <el-card shadow="never" class="border-none mb-4 !p-2">
        <el-form
          :inline="true"
          :model="queryParams"
          class="flex flex-wrap gap-x-2 gap-y-2 items-center"
        >
          <el-form-item class="!mb-0 !mr-2">
            <el-input
              v-model="queryParams.deviceNo"
              placeholder="请输入"
              clearable
              style="width: 200px"
              @keyup.enter="handleQuery"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">设备编号:</span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-input
              v-model="queryParams.faultCode"
              placeholder="请输入"
              clearable
              style="width: 200px"
              @keyup.enter="handleQuery"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">故障编码:</span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-input
              v-model="queryParams.faultName"
              placeholder="请输入"
              clearable
              style="width: 200px"
              @keyup.enter="handleQuery"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">故障名称:</span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select
              v-model="queryParams.faultStatus"
              clearable
              style="width: 200px"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">故障状态:</span>
              </template>
              <el-option
                v-for="item in faultStatusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-date-picker
              v-model="dateRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 350px"
            />
          </el-form-item>

          <el-form-item class="!mb-0 !mr-0 md:ml-auto flex items-center gap-1">
            <el-tooltip content="查询" placement="top">
              <el-button type="primary" :icon="Search" circle @click="handleQuery" />
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
            <el-button :loading="exporting" @click="openExportSelector">
              导出
            </el-button>
            <span v-if="selectedIds.length > 0" class="text-xs text-gray-400 ml-2">
              已选 <span class="text-red-500 font-medium">{{ selectedIds.length }}</span> 项
            </span>
          </div>

          <div class="flex items-center">
            <ColumnSelector
              :storage-key="FAULT_STORAGE_KEY"
              :default-columns="defaultFaultColumns"
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
          >
            <template #default="{ row }">
              <!-- 持续时长 -->
              <template v-if="col.key === 'duration'">
                {{ formatDuration(row.duration) }}
              </template>
              <!-- 故障状态 -->
              <template v-else-if="col.key === 'faultStatus'">
                <el-tag
                  :type="getFaultStatusType(row.faultStatus)"
                  size="small"
                  round
                  effect="light"
                >
                  {{ getFaultStatusText(row.faultStatus) }}
                </el-tag>
              </template>
              <!-- 处理人 -->
              <template v-else-if="col.key === 'dealUserName'">
                {{ row.dealUserName || "-" }}
              </template>
              <!-- 故障描述 -->
              <template v-else-if="col.key === 'faultRemark'">
                {{ row.faultRemark || "-" }}
              </template>
              <!-- 故障名称 -->
              <template v-else-if="col.key === 'faultName'">
                {{ row.faultName || "-" }}
              </template>
              <!-- 普通字段 -->
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <!-- 操作列固定写死 -->
          <el-table-column label="操作" width="180" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" :icon="View" @click="handleView(row)">
                详情
              </el-button>
              <el-button
                v-if="row.faultStatus !== 2"
                link
                type="success"
                :icon="Edit"
                @click="handleEdit(row)"
              >
                处理
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

    <!-- 导出字段选择组件 -->
    <ExportFieldSelector
      v-model:visible="exportFieldVisible"
      :fields="exportFields"
      :loading="exporting"
      @confirm="handleExportConfirm"
    />

    <!-- 详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="故障详情"
      width="600px"
      append-to-body
    >
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="故障ID">
{{
          detailData.deviceFaultId
        }}
</el-descriptions-item>
        <el-descriptions-item label="设备编号">
{{
          detailData.deviceNo
        }}
</el-descriptions-item>
        <el-descriptions-item label="仓口编号">
{{ detailData.hatchNo || "-" }}号仓
</el-descriptions-item>
        <el-descriptions-item label="故障编码">
{{
          detailData.faultCode
        }}
</el-descriptions-item>
        <el-descriptions-item label="故障名称">
{{
          detailData.faultName
        }}
</el-descriptions-item>
        <el-descriptions-item label="故障状态">
          <el-tag
            :type="getFaultStatusType(detailData.faultStatus)"
            size="small"
          >
            {{ getFaultStatusText(detailData.faultStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="发生时间">
{{
          detailData.startTime
        }}
</el-descriptions-item>
        <el-descriptions-item label="处理时间">
{{
          detailData.endTime || "-"
        }}
</el-descriptions-item>
        <el-descriptions-item label="持续时长">
{{
          formatDuration(detailData.duration)
        }}
</el-descriptions-item>
        <el-descriptions-item label="处理人">
{{
          detailData.dealUserName || "-"
        }}
</el-descriptions-item>
        <el-descriptions-item label="故障描述" :span="2">
{{
          detailData.faultRemark || "-"
        }}
</el-descriptions-item>
        <el-descriptions-item label="处理备注" :span="2">
{{
          detailData.dealRemark || "-"
        }}
</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 处理故障弹窗 -->
    <el-dialog
      v-model="editVisible"
      title="处理故障"
      width="500px"
      append-to-body
    >
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="故障状态" required>
          <el-radio-group v-model="editForm.faultStatus">
            <el-radio :value="1">已恢复</el-radio>
            <el-radio :value="2">已处理</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="处理备注">
          <el-input
            v-model="editForm.dealRemark"
            type="textarea"
            :rows="4"
            placeholder="请输入处理备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSubmitting" @click="submitEdit">
确定
</el-button>
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

.text-danger {
  color: #f56c6c;
}

.text-warning {
  color: #e6a23c;
}

.font-bold {
  font-weight: 600;
}
</style>
