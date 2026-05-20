<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

import { Page } from "@vben/common-ui";

import {
  Delete,
  DeleteFilled,
  Edit,
  Plus,
  Refresh,
  Search,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import { type Device, getDeviceListApi } from "#/api/device/device";
import {
  addDeviceHatchApi,
  deleteDeviceHatchApi,
  type DeviceHatch,
  type DeviceHatchPageParams,
  editDeviceHatchApi,
  getDeviceHatchDetailApi,
  getDeviceHatchPageApi,
} from "#/api/device/deviceHatch";
import {
  type DevicePackage,
  getDevicePackageListApi,
} from "#/api/device/devicePackage";
import ColumnSelector from "#/components/ColumnSelector/index.vue";
import ExportFieldSelector from "#/components/ExportFieldSelector/index.vue";
import {
  defaultHatchColumns,
  HATCH_STORAGE_KEY,
  type TableColumnConfig,
} from "#/constants/tableColumns";
import { ModuleCodeMap, useExport } from "#/hooks/useExport";

const { exporting, exportData } = useExport(ModuleCodeMap.DEVICE_HATCH);

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultHatchColumns]);

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
const tableData = ref<DeviceHatch[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 表单弹窗控制
const formVisible = ref(false);
const formTitle = ref("");
const formData = ref<Partial<DeviceHatch>>({});
const formSubmitting = ref(false);

// 下拉选项
const deviceOptions = ref<Device[]>([]);
const packageOptions = ref<DevicePackage[]>([]);

// 仓口状态选项
const hatchStatusOptions = [
  { label: "全部", value: undefined },
  { label: "未满", value: 0 },
  { label: "已满", value: 1 },
];

// 状态选项
const statusOptions = [
  { label: "启用", value: 0 },
  { label: "禁用", value: 1 },
];

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
  return status === 0 ? "未满" : "已满";
}

function getHatchStatusType(status: number): string {
  return status === 0 ? "success" : "danger";
}

function getStatusText(status: number): string {
  return status === 0 ? "启用" : "禁用";
}

// --- 加载选项 ---
async function loadOptions() {
  try {
    const [deviceRes, packageRes] = await Promise.all([
      getDeviceListApi({ status: 0 }),
      getDevicePackageListApi({ status: 0 }),
    ]);
    deviceOptions.value = deviceRes || [];
    packageOptions.value = packageRes || [];
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
    ElMessage.error("加载数据失败");
  } finally {
    loading.value = false;
  }
}

// --- 清空仓口（重置重量）---
async function handleClean(row: DeviceHatch) {
  try {
    await ElMessageBox.confirm(
      `确定要清空仓口【${row.hatchName}】吗？清空后当前重量将归零。`,
      "清空仓口",
      {
        type: "warning",
        confirmButtonText: "确定",
        cancelButtonText: "取消",
      }
    );

    // 调用清空接口（如果没有单独接口，可以通过编辑接口设置 currentWeight=0）
    await editDeviceHatchApi({
      deviceHatchId: row.deviceHatchId,
      currentWeight: 0,
      hatchStatus: 0,
    });
    ElMessage.success("清空成功");
    loadData();
  } catch {
    // 取消操作
  }
}

// --- 新增/编辑 ---
function handleAdd() {
  formTitle.value = "新增仓口";
  formData.value = {
    status: 0,
    hatchStatus: 0,
    currentWeight: 0,
    weightThreshold: 100,
  };
  formVisible.value = true;
}

async function handleEdit(row: DeviceHatch) {
  try {
    formTitle.value = "编辑仓口";
    const res = await getDeviceHatchDetailApi(row.deviceHatchId);
    formData.value = res || {};
    formVisible.value = true;
  } catch {
    ElMessage.error("获取仓口信息失败");
  }
}

async function handleSubmit() {
  if (!formData.value.hatchName?.trim()) {
    ElMessage.warning("请输入仓口名称");
    return;
  }
  if (!formData.value.deviceId) {
    ElMessage.warning("请选择所属设备");
    return;
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.deviceHatchId
      ? editDeviceHatchApi
      : addDeviceHatchApi;
    await api(formData.value);
    ElMessage.success(formData.value.deviceHatchId ? "修改成功" : "新增成功");
    formVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    formSubmitting.value = false;
  }
}

// --- 删除 ---
async function handleDelete(row?: DeviceHatch) {
  let ids: number[] = [];

  if (row) {
    ids = [row.deviceHatchId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning("请选择要删除的记录");
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条仓口吗？`,
      "提示",
      { type: "warning" }
    );

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
    <div class="p-4">
      <!-- 查询表单 -->
      <el-card shadow="never" class="mb-4">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="所属设备">
            <el-select
              v-model="queryParams.deviceId"
              placeholder="请选择设备"
              clearable
              filterable
              style="width: 200px"
              @change="handleQuery"
            >
              <el-option
                v-for="item in deviceOptions"
                :key="item.deviceId"
                :label="item.deviceName"
                :value="item.deviceId"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="仓口状态">
            <el-select
              v-model="queryParams.hatchStatus"
              placeholder="全部"
              clearable
              style="width: 100px"
            >
              <el-option
                v-for="item in hatchStatusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select
              v-model="queryParams.status"
              placeholder="全部"
              clearable
              style="width: 100px"
            >
              <el-option
                v-for="item in statusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleQuery">
查询
</el-button>
            <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
            <el-button type="primary" plain :icon="Plus" @click="handleAdd">
新增
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
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 -->
      <el-card shadow="never">
        <div class="flex justify-end mb-2">
          <ColumnSelector
            :storage-key="HATCH_STORAGE_KEY"
            :default-columns="defaultHatchColumns"
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
              <!-- 仓口编号 -->
              <template v-if="col.key === 'hatchNo'">
                {{ row.hatchNo }}
              </template>
              <!-- 当前重量 -->
              <template v-else-if="col.key === 'currentWeight'">
                <span
                  :class="{
                    'text-orange-500':
                      row.currentWeight >= (row.weightThreshold || 100),
                  }"
                >
                  {{ (row.currentWeight || 0).toFixed(2) }} kg
                </span>
              </template>
              <!-- 满仓阈值 -->
              <template v-else-if="col.key === 'weightThreshold'">
                {{ (row.weightThreshold || 100).toFixed(2) }} kg
              </template>
              <!-- 仓口状态 -->
              <template v-else-if="col.key === 'hatchStatus'">
                <el-tag
                  :type="getHatchStatusType(row.hatchStatus)"
                  size="small"
                >
                  {{ getHatchStatusText(row.hatchStatus) }}
                </el-tag>
              </template>
              <!-- 最后清运时间 -->
              <template v-else-if="col.key === 'lastCleanTime'">
                {{ row.lastCleanTime || "-" }}
              </template>
              <!-- 状态 -->
              <template v-else-if="col.key === 'status'">
                <el-tag
                  :type="row.status === 0 ? 'success' : 'danger'"
                  size="small"
                >
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
              <!-- 所属设备ID（显示设备名称） -->
              <template v-else-if="col.key === 'deviceId'">
                {{ row.deviceName || row.deviceId || "-" }}
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
            width="280"
            fixed="right"
            align="center"
          >
            <template #default="{ row }">
              <el-button
                link
                type="warning"
                :icon="DeleteFilled"
                @click="handleClean(row)"
              >
                清空
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
      width="800px"
      append-to-body
    >
      <el-form :model="formData" label-width="110px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="仓口名称" required>
              <el-input
                v-model="formData.hatchName"
                placeholder="请输入仓口名称"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="仓口编号">
              <el-input
                v-model="formData.hatchNo"
                placeholder="请输入仓口编号"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="所属设备" required>
          <el-select
            v-model="formData.deviceId"
            placeholder="请选择设备"
            clearable
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="item in deviceOptions"
              :key="item.deviceId"
              :label="item.deviceName"
              :value="item.deviceId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="绑定套餐">
          <el-select
            v-model="formData.devicePackageId"
            placeholder="请选择计费套餐"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="item in packageOptions"
              :key="item.devicePackageId"
              :label="item.packageName"
              :value="item.devicePackageId"
            />
          </el-select>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="当前重量(kg)">
              <el-input-number
                v-model="formData.currentWeight"
                :min="0"
                :max="500"
                :precision="2"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="满仓阈值(kg)">
              <el-input-number
                v-model="formData.weightThreshold"
                :min="0"
                :max="500"
                :precision="2"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="状态">
          <el-radio-group v-model="formData.status">
            <el-radio :value="0">启用</el-radio>
            <el-radio :value="1">禁用</el-radio>
          </el-radio-group>
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
  </Page>
</template>

<style scoped>
.text-orange-500 {
  font-weight: 500;
  color: #e6a23c;
}
</style>
