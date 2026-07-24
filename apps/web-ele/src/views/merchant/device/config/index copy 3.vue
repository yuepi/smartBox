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
import UploadImage from "#/components/UploadImage/index.vue";
import { ModuleCodeMap, useExport } from "#/hooks/useExport";
const { exporting, exportData } = useExport(ModuleCodeMap.CONFIG);
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
const tableData = ref<DeviceConfig[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const formRef = ref();

// 表单弹窗控制
const formVisible = ref(false);
const formTitle = ref("");
const formData = ref<Partial<DeviceConfig>>({});
const formSubmitting = ref(false);

// 营业时间范围（用于时间段选择器）
const businessTimeRange = computed({
  get: () => {
    if (formData.value.businessOpenTime && formData.value.businessCloseTime) {
      return [
        formData.value.businessOpenTime,
        formData.value.businessCloseTime,
      ];
    }
    return ["08:00", "20:00"]; // 默认值
  },
  set: (val: null | string[]) => {
    if (val && val.length === 2) {
      formData.value.businessOpenTime = val[0];
      formData.value.businessCloseTime = val[1];
    } else {
      formData.value.businessOpenTime = undefined;
      formData.value.businessCloseTime = undefined;
    }
  },
});


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

// --- 品牌判断 ---
const isXiangxin = computed(() => {
  const brand = formData.value.deviceBrand;
  return brand === 1 || brand === 2;
});

const isQuanying = computed(() => {
  const brand = formData.value.deviceBrand;
  return brand === 3 || brand === 4;
});

// 品牌切换时重置配置
function onBrandChange(brand: number) {
  if (brand === 1 || brand === 2) {
    // 向心品牌：清空权应特有字段
    formData.value.normalBanners = undefined;
    formData.value.fullBanners = undefined;
    formData.value.maintainBanners = undefined;
    formData.value.forbidImages = undefined;
    formData.value.businessOpenTime = undefined;
    formData.value.businessCloseTime = undefined;
  } else if (brand === 3 || brand === 4) {
    // 权应品牌：清空向心特有字段
    formData.value.topLightBrightness = undefined;
    formData.value.deliverEndTimeout = undefined;
    formData.value.recycleEndTimeout = undefined;
    formData.value.deliverDoorMotorTimeout = undefined;
    formData.value.deliverDoorHandStopCount = undefined;
    formData.value.deliverDoorHandOpenCount = undefined;
    formData.value.fanTempMax = undefined;
    formData.value.fanTempMin = undefined;
    formData.value.topLightType = undefined;
    formData.value.topLightOnTime = undefined;
    formData.value.topLightOffTime = undefined;
    formData.value.topLightBrightness = undefined;
    formData.value.outLightType = undefined;
    formData.value.outLightOnTime = undefined;
    formData.value.outLightOffTime = undefined;
  }
}

// --- 轮播图相关 ---
const bannerPreviewVisible = ref(false);
const bannerPreviewUrl = ref("");

const bannerInputUrl = ref("");
const fullBannerInputUrl = ref("");
const maintainBannerInputUrl = ref("");
const forbidImageInputUrl = ref("");

const normalBannersList = computed({
  get: () => {
    if (!formData.value.normalBanners) return [];
    try {
      return JSON.parse(formData.value.normalBanners);
    } catch {
      return [];
    }
  },
  set: (val: string[]) => {
    formData.value.normalBanners = JSON.stringify(val);
  },
});

const fullBannersList = computed({
  get: () => {
    if (!formData.value.fullBanners) return [];
    try {
      return JSON.parse(formData.value.fullBanners);
    } catch {
      return [];
    }
  },
  set: (val: string[]) => {
    formData.value.fullBanners = JSON.stringify(val);
  },
});

const maintainBannersList = computed({
  get: () => {
    if (!formData.value.maintainBanners) return [];
    try {
      return JSON.parse(formData.value.maintainBanners);
    } catch {
      return [];
    }
  },
  set: (val: string[]) => {
    formData.value.maintainBanners = JSON.stringify(val);
  },
});

const forbidImagesList = computed({
  get: () => {
    if (!formData.value.forbidImages) return [];
    try {
      return JSON.parse(formData.value.forbidImages);
    } catch {
      return [];
    }
  },
  set: (val: string[]) => {
    formData.value.forbidImages = JSON.stringify(val);
  },
});

function addBannerUrl(type: string, url: string) {
  if (!url.trim()) {
    ElMessage.warning("请输入图片URL");
    return;
  }
  const listMap: Record<string, any> = {
    normal: normalBannersList,
    full: fullBannersList,
    maintain: maintainBannersList,
    forbid: forbidImagesList,
  };
  const list = listMap[type];
  if (list) {
    list.value = [...list.value, url.trim()];
    if (type === "normal") bannerInputUrl.value = "";
    if (type === "full") fullBannerInputUrl.value = "";
    if (type === "maintain") maintainBannerInputUrl.value = "";
    if (type === "forbid") forbidImageInputUrl.value = "";
  }
}

function removeBannerUrl(type: string, index: number) {
  const listMap: Record<string, any> = {
    normal: normalBannersList,
    full: fullBannersList,
    maintain: maintainBannersList,
    forbid: forbidImagesList,
  };
  const list = listMap[type];
  if (list) {
    const newList = [...list.value];
    newList.splice(index, 1);
    list.value = newList;
  }
}

function previewBanner(url: string) {
  bannerPreviewUrl.value = url;
  bannerPreviewVisible.value = true;
}

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
    outLightBrightness: "100",
    deliverEndTimeout: 300,
    recycleEndTimeout: 1800,
    deliverDoorMotorTimeout: 10,
    deliverDoorHandStopCount: 3,
    deliverDoorHandOpenCount: 2,
    fanTempMax: 50,
    fanTempMin: 30,
    topLightType: 0,
    topLightBrightness: "100",
    outLightType: 0,
    // 权应品牌默认营业时间
    businessOpenTime: "08:00",
    businessCloseTime: "20:00",
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
  console.log('提交的配置数据:', formData.value);
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
              v-model="queryParams.configName"
              placeholder="请输入"
              clearable
              style="width: 200px"
              @keyup.enter="handleQuery"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">配置名称:</span>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select
              v-model="queryParams.deviceBrand"
              clearable
              style="width: 200px"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">设备品牌:</span>
              </template>
              <el-option
                v-for="item in device_brand"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item class="!mb-0 !mr-2">
            <el-select
              v-model="queryParams.status"
              clearable
              style="width: 200px"
            >
              <template #prefix>
                <span class="text-xs text-gray-400 mr-0.5">状态:</span>
              </template>
              <el-option
                v-for="item in statusOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
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
            <el-button type="primary" :icon="Plus" @click="handleAdd">
              新增配置
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
            <span v-if="selectedIds.length > 0" class="text-xs text-gray-400 ml-2">
              已选 <span class="text-red-500 font-medium">{{ selectedIds.length }}</span> 项
            </span>
          </div>

          <div class="flex items-center">
            <ColumnSelector
              :storage-key="CONFIG_STORAGE_KEY"
              :default-columns="defaultConfigColumns"
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
          <el-table-column type="selection" width="50" align="center" />

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
              <template v-if="col.key === 'deviceBrand'">
                <DictTag :options="device_brand" :value="row.deviceBrand" />
              </template>
              <template v-else-if="col.key === 'deliverEndTimeout'">
                {{ row.deliverEndTimeout }}s
              </template>
              <template v-else-if="col.key === 'recycleEndTimeout'">
                {{ row.recycleEndTimeout }}s
              </template>
              <template v-else-if="col.key === 'topLightType'">
                {{ getLightTypeText(row.topLightType) }}
              </template>
              <template v-else-if="col.key === 'status'">
                <el-tag
                  :type="row.status === 0 ? 'success' : 'danger'"
                  size="small"
                  round
                  effect="light"
                >
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
              <template v-else>
                {{ (row as any)[col.key] ?? '-' }}
              </template>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="150" fixed="right" align="center">
            <template #default="{ row }">
              <el-button link type="primary" :icon="Edit" @click="handleEdit(row)">
                编辑
              </el-button>
              <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">
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
      width="1000px"
      append-to-body
    >
      <el-form
        ref="formRef"
        :model="formData"
        label-width="140px"
        label-position="right"
      >
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
            @change="onBrandChange"
          >
            <el-option
              v-for="item in device_brand"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="箱外照明亮度">
          <el-input-number
            v-model="formData.outLightBrightness"
            :min="0"
            :max="100"
            style="width: 80%"
          />
          <span class="ml-1">%</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="formData.status">
            <el-radio :value="0">启用</el-radio>
            <el-radio :value="1">禁用</el-radio>
          </el-radio-group>
        </el-form-item>

        <!-- 超时配置（向心） -->
        <template v-if="isXiangxin">
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
        </template>

        <!-- 权应品牌特有配置 -->
        <template v-if="isQuanying">
          <el-divider content-position="left">轮播图配置</el-divider>

          <!-- 正常状态轮播图 -->
          <el-form-item label="正常轮播图">
            <div class="banner-config">
              <UploadImage
                v-model="normalBannersList"
                :limit="5"
                :file-size="5"
                :file-type="['png', 'jpg', 'jpeg']"
              />
            </div>
          </el-form-item>

          <!-- 满溢状态轮播图 -->
          <el-form-item label="满溢轮播图">
            <div class="banner-config">
              <UploadImage
                v-model="fullBannersList"
                :limit="5"
                :file-size="5"
                :file-type="['png', 'jpg', 'jpeg']"
              />
            </div>
          </el-form-item>

          <!-- 维护状态轮播图 -->
          <el-form-item label="维护轮播图">
            <div class="banner-config">
              <UploadImage
                v-model="maintainBannersList"
                :limit="5"
                :file-size="5"
                :file-type="['png', 'jpg', 'jpeg']"
              />
            </div>
          </el-form-item>

          <!-- 禁止投递图片 -->
          <el-form-item label="禁止投递图片">
            <div class="banner-config">
              <UploadImage
                v-model="forbidImagesList"
                :limit="5"
                :file-size="5"
                :file-type="['png', 'jpg', 'jpeg']"
              />
            </div>
          </el-form-item>

          <!-- 营业时间配置 -->
          <el-divider content-position="left">营业时间配置</el-divider>
          <el-form-item label="营业时间">
            <el-time-picker
              v-model="businessTimeRange"
              is-range
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              format="HH:mm"
              value-format="HH:mm"
              placeholder="请选择营业时间范围"
              style="width: 300px"
            />
          </el-form-item>
        </template>
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

    <!-- 图片预览弹窗 -->
    <el-dialog
      v-model="bannerPreviewVisible"
      title="图片预览"
      width="500px"
      append-to-body
    >
      <div class="flex justify-center">
        <el-image
          :src="bannerPreviewUrl"
          fit="contain"
          style="max-width: 100%; max-height: 400px"
        />
      </div>
      <template #footer>
        <el-button @click="bannerPreviewVisible = false">关闭</el-button>
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

.banner-item {
  &:hover {
    border-color: #409eff;
  }
}
</style>
