<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

import { Page } from "@vben/common-ui";

import { Delete, Edit, Plus, Refresh, Search } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import {
  addDeviceConfigApi,
  deleteDeviceConfigApi,
  type DeviceConfig,
  type DeviceConfigPageParams,
  editDeviceConfigApi,
  getDeviceConfigDetailApi,
  getDeviceConfigPageApi,
} from "#/api/device/deviceConfig";
import { ModuleCodeMap, useExport } from "#/hooks/useExport";
const { exporting, exportData } = useExport(ModuleCodeMap.DEVICE);
import ColumnSelector from "#/components/ColumnSelector/index.vue";
import ExportFieldSelector from "#/components/ExportFieldSelector/index.vue";
import {
  CONFIG_STORAGE_KEY,
  defaultConfigColumns,
  type TableColumnConfig,
} from "#/constants/tableColumns";
import { useDicts } from "#/hooks/useDict";
const { device_brand } = useDicts(["device_brand"]);

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultConfigColumns]);

// 组件内部会处理 localStorage，页面只需要监听 update:columns
function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

// 可见的数据列（不包含选择列和操作列）
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
const tableData = ref<DeviceConfig[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 表单弹窗控制
const formVisible = ref(false);
const formTitle = ref("");
const formData = ref<Partial<DeviceConfig>>({});
const formSubmitting = ref(false);

// 顶部灯光类型选项
const topLightTypeOptions = [
  { label: "定时", value: 0 },
  { label: "感应", value: 1 },
  { label: "常亮", value: 2 },
];

// 箱外灯光类型选项
const outLightTypeOptions = [
  { label: "定时", value: 0 },
  { label: "感应", value: 1 },
  { label: "常亮", value: 2 },
];

// 状态选项
const statusOptions = [
  { label: "启用", value: 0 },
  { label: "禁用", value: 1 },
];

// 查询参数
const queryParams = reactive<DeviceConfigPageParams>({
  pageNo: 1,
  pageSize: 10,
  configName: undefined,
  deviceBrand: undefined,
  status: undefined,
});

// --- 辅助函数 ---
function getLightTypeText(type: number): string {
  const map: Record<number, string> = { 0: "定时", 1: "感应", 2: "常亮" };
  return map[type] || "未知";
}

function getStatusText(status: number): string {
  return status === 0 ? "启用" : "禁用";
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getDeviceConfigPageApi(queryParams);
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
  formTitle.value = "新增设备配置";
  formData.value = {
    status: 0,
    deviceBrand: 0,
    deliverEndTimeout: 300, // 投递流程结束超时时间 默认300秒
    recycleEndTimeout: 1800, // 回收流程结束超时时间 默认1800秒
    deliverDoorMotorTimeout: 10, // 投递门电机超时时间 默认10秒
    deliverDoorHandStopCount: 3, // 投递门夹手-停止次数 默认3
    deliverDoorHandOpenCount: 2, // 投递门夹手-开门次数 默认2
    fanTempMax: 50, // 风扇温度上限
    fanTempMin: 30, // 风扇温度下限
    topLightType: 0, // 顶部灯光类型
    topLightBrightness: "100", // 顶部照明亮度
    outLightType: 0, // 箱外灯光类型
    outLightBrightness: "100", // 箱外照明亮度
  };
  formVisible.value = true;
}

async function handleEdit(row: DeviceConfig) {
  try {
    formTitle.value = "编辑设备配置";
    const res = await getDeviceConfigDetailApi(row.deviceConfigId);
    formData.value = res || {};
    formVisible.value = true;
  } catch {
    ElMessage.error("获取配置信息失败");
  }
}

async function handleSubmit() {
  if (!formData.value.configName?.trim()) {
    ElMessage.warning("请输入配置名称");
    return;
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.deviceConfigId
      ? editDeviceConfigApi
      : addDeviceConfigApi;
    await api(formData.value);
    ElMessage.success(formData.value.deviceConfigId ? "修改成功" : "新增成功");
    formVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    formSubmitting.value = false;
  }
}

// --- 删除 ---
async function handleDelete(row?: DeviceConfig) {
  let ids: number[] = [];

  if (row) {
    ids = [row.deviceConfigId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning("请选择要删除的记录");
      return;
    }
    ids = selectedIds.value;
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条配置吗？`,
      "提示",
      { type: "warning" }
    );

    for (const id of ids) {
      await deleteDeviceConfigApi(id);
    }

    ElMessage.success(`成功删除 ${ids.length} 条配置`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: DeviceConfig[]) {
  selectedIds.value = selection.map((item) => item.deviceConfigId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.configName = undefined;
  queryParams.deviceBrand = undefined;
  queryParams.status = undefined;
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
      <el-card shadow="never" class="mb-4">
        <el-form :inline="true" :model="queryParams">
          <el-form-item label="配置名称">
            <el-input
              v-model="queryParams.configName"
              placeholder="请输入配置名称"
              clearable
              style="width: 180px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="设备品牌">
            <el-select
              v-model="queryParams.deviceBrand"
              placeholder="全部"
              clearable
              style="width: 140px"
            >
              <el-option
                v-for="item in device_brand"
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
        <div class="float-right">
          <ColumnSelector
            :storage-key="CONFIG_STORAGE_KEY"
            :default-columns="defaultConfigColumns"
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
          >
            <template #default="{ row }">
              <!-- 设备品牌 -->
              <template v-if="col.key === 'deviceBrand'">
                 <DictTag :options="device_brand" :value="row.deviceBrand" />
              </template>
              <!-- 投递超时 -->
              <template v-else-if="col.key === 'deliverEndTimeout'">
                {{ row.deliverEndTimeout }}s
              </template>
              <!-- 回收超时 -->
              <template v-else-if="col.key === 'recycleEndTimeout'">
                {{ row.recycleEndTimeout }}s
              </template>
              <!-- 顶部灯光类型 -->
              <template v-else-if="col.key === 'topLightType'">
                {{ getLightTypeText(row.topLightType) }}
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
              <!-- 普通字段 -->
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <!-- 操作列固定写死 -->
          <el-table-column
            label="操作"
            width="150"
            fixed="right"
            align="center"
          >
            <template #default="{ row }">
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

    <!-- 导出字段选择组件 -->
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
      width="1000px"
      append-to-body
    >
      <el-form :model="formData" label-width="140px" label-position="right">
        <!-- 基本信息 -->
        <el-divider content-position="left">基本信息</el-divider>
        <el-form-item label="配置名称" required>
          <el-input
            v-model="formData.configName"
            placeholder="请输入配置名称"
          />
        </el-form-item>
        <el-form-item label="设备品牌">
          <el-select
            v-model="formData.deviceBrand"
            placeholder="请选择"
            style="width: 100%"
          >
            <el-option
              v-for="item in device_brand"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>

        <!-- 超时配置 -->
        <el-divider content-position="left">超时配置</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="投递流程结束超时">
              <el-input-number
                v-model="formData.deliverEndTimeout"
                :min="1"
                :max="3600"
                style="width: 80%"
              />
              <span class="ml-1">秒</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="回收流程结束超时">
              <el-input-number
                v-model="formData.recycleEndTimeout"
                :min="1"
                :max="7200"
                style="width: 80%"
              />
              <span class="ml-1">秒</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="投递门电机超时">
              <el-input-number
                v-model="formData.deliverDoorMotorTimeout"
                :min="1"
                :max="60"
                style="width: 80%"
              />
              <span class="ml-1">秒</span>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 夹手保护配置 -->
        <el-divider content-position="left">夹手保护配置</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="投递门夹手-停止次数" label-width="160px">
              <el-input-number
                v-model="formData.deliverDoorHandStopCount"
                :min="1"
                :max="10"
                style="width: 80%"
              />
              <span class="ml-1">次</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="投递门夹手-开门次数" label-width="160px">
              <el-input-number
                v-model="formData.deliverDoorHandOpenCount"
                :min="1"
                :max="10"
                style="width: 80%"
              />
              <span class="ml-1">次</span>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 风扇温度配置 -->
        <el-divider content-position="left">风扇温度配置</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="风扇温度上限">
              <el-input-number
                v-model="formData.fanTempMax"
                :min="0"
                :max="100"
                style="width: 80%"
              />
              <span class="ml-1">℃</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="风扇温度下限">
              <el-input-number
                v-model="formData.fanTempMin"
                :min="0"
                :max="100"
                style="width: 80%"
              />
              <span class="ml-1">℃</span>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 顶部灯光配置 -->
        <el-divider content-position="left">顶部灯光配置</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="顶部灯光类型">
              <el-select
                v-model="formData.topLightType"
                placeholder="请选择"
                style="width: 80%"
              >
                <el-option
                  v-for="item in topLightTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="顶部照明亮度">
              <el-input-number
                v-model="formData.topLightBrightness"
                :min="0"
                :max="100"
                style="width: 80%"
              />
              <span class="ml-1">%</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20" v-if="formData.topLightType === 0">
          <el-col :span="12">
            <el-form-item label="顶部照明开启时间">
              <el-time-select
                v-model="formData.topLightOnTime"
                start="00:00"
                step="00:30"
                end="23:59"
                placeholder="选择时间"
                style="width: 80%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="顶部照明关闭时间">
              <el-time-select
                v-model="formData.topLightOffTime"
                start="00:00"
                step="00:30"
                end="23:59"
                placeholder="选择时间"
                style="width: 80%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 箱外灯光配置 -->
        <el-divider content-position="left">箱外灯光配置</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="箱外灯光类型">
              <el-select
                v-model="formData.outLightType"
                placeholder="请选择"
                style="width: 80%"
              >
                <el-option
                  v-for="item in outLightTypeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="箱外照明亮度">
              <el-input-number
                v-model="formData.outLightBrightness"
                :min="0"
                :max="100"
                style="width: 80%"
              />
              <span class="ml-1">%</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20" v-if="formData.outLightType === 0">
          <el-col :span="12">
            <el-form-item label="箱外照明开启时间">
              <el-time-select
                v-model="formData.outLightOnTime"
                start="00:00"
                step="00:30"
                end="23:59"
                placeholder="选择时间"
                style="width: 80%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="箱外照明关闭时间">
              <el-time-select
                v-model="formData.outLightOffTime"
                start="00:00"
                step="00:30"
                end="23:59"
                placeholder="选择时间"
                style="width: 80%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 状态 -->
        <el-divider content-position="left">其他</el-divider>
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

<style scoped lang="scss">
:deep(.el-divider__text) {
  font-size: 14px;
  font-weight: 600;
}

.ml-1 {
  margin-left: 4px;
}
</style>
