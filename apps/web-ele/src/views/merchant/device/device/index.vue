<script lang="ts" setup>
import type { Device, DevicePageParams, QrcodeData } from '#/api/device/device';
import type { DeviceHatch } from '#/api/device/deviceHatch';
import type { Dept } from '#/api/system/dept';
import type { TableColumnConfig } from '#/constants/tableColumns';

import { Page } from "@vben/common-ui";

import {
  batchDownDeviceQrcodeFileApi,
  batchDownDeviceQrcodeJsonApi,
  changeDeviceServerIpPortApi,
  deleteDeviceApi,
  deviceUpgradeApi,
  downOneDeviceQrcodeJsonApi,
  getDevicePageApi,
  operateDeviceApi
} from '#/api/device/device';
import { getDeviceHatchListApi } from '#/api/device/deviceHatch';
import { getMerchantDeptListApi } from '#/api/system/dept';
import { defaultDeviceColumns, DEVICE_STORAGE_KEY } from '#/constants/tableColumns';
import { ModuleCodeMap } from "#/hooks/useExport";

import DetailModal from './detail.vue';
import EditModal from './edit.vue';

const { device_brand, device_screen, device_hatch_type, device_online_status, device_status } = useDicts(["device_brand", "device_screen", "device_hatch_type", "device_online_status", "device_status"]);

// --- 表格列配置 ---
const columnConfig = ref<TableColumnConfig[]>([...defaultDeviceColumns]);

function handleColumnsUpdate(newColumns: TableColumnConfig[]) {
  columnConfig.value = newColumns;
}

const visibleColumns = computed(() => {
  return columnConfig.value.filter((col) => col.visible);
});

// --- 引用 ---
const detailModalRef = ref();
const editModalRef = ref();

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Device[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);

// 下拉选项
const deptOptions = ref<Dept[]>([]);


// 查询参数
const queryParams = reactive<DevicePageParams>({
  pageNo: 1,
  pageSize: 10,
  deviceName: undefined,
  deviceNo: undefined,
  onlineStatus: undefined,
  status: undefined,
  qrCode: undefined,
});

// --- 操作弹窗 ---
const operationVisible = ref(false);
const operationDeviceId = ref<number>(0);
const operationType = ref<number>(0);
const volumeValue = ref<number>(50);
const deviceHatchId = ref<null | number>(null);
const operationSubmitting = ref(false);

// IP端口切换弹窗
const ipPortVisible = ref(false);
const ipPortData = ref({ deviceId: 0, ip: "", port: "" });

// 二维码弹窗
const qrcodeVisible = ref(false);
const qrcodeLoading = ref(false);
const qrcodeList = ref<QrcodeData[]>([]);
const qrcodeMode = ref<number>(0);

// 升级弹窗
const upgradeVisible = ref(false);
const upgradeDeviceId = ref<number>(0);
const upgradeFile = ref<File | null>(null);
const upgradeUploading = ref(false);
const upgradeFileUrl = ref("");

// 操作类型选项
const operationTypeOptions = [
  { label: "开仓口", value: 0, needHatch: true },
  { label: "关仓口", value: 1, needHatch: true },
  { label: "开清运门", value: 2, needHatch: true },
  { label: "重启设备", value: 3, needHatch: false },
  { label: "重启大屏", value: 4, needHatch: false },
  { label: "调节音量", value: 5, needHatch: false, needVolume: true },
  { label: "关清运门", value: 6, needHatch: true },
  { label: "屏幕截图", value: 7, needHatch: false },
  { label: "开仓门灯", value: 8, needHatch: false },
  { label: "关仓门灯", value: 9, needHatch: false },
  { label: "开门行程", value: 12, needHatch: false },
];

// 屏幕截图轮询相关
const screenshotPollingTimer = ref<null | ReturnType<typeof setInterval>>(null);
const screenshotImageUrl = ref("");
const screenshotDialogVisible = ref(false);
const screenshotLoading = ref(false);

// 仓口列表
const hatchOptions = ref<{ id: number; name: string }[]>([]);

// --- 获取设备的仓口列表 ---
async function getHatchOptions(deviceId: number) {
  if (!deviceId) {
    hatchOptions.value = [];
    return;
  }
  try {
    const res = await getDeviceHatchListApi({ deviceId, status: 0 });
    hatchOptions.value = (res || []).map((item: DeviceHatch) => ({
      id: item.deviceHatchId,
      name: item.hatchName,
    }));
  } catch (error) {
    console.error("获取仓口列表失败:", error);
    hatchOptions.value = [];
  }
}

// --- 设备操作 ---
async function handleOperation(row: Device) {
  operationDeviceId.value = row.deviceId;
  operationType.value = 0;
  volumeValue.value = 50;
  screenshotImageUrl.value = "";
  screenshotDialogVisible.value = false;
  await getHatchOptions(row.deviceId);
  operationVisible.value = true;
}

async function submitOperation() {
  const opType = operationType.value;
  const params: any = {
    operateType: opType,
    deviceId: operationDeviceId.value,
  };

  const needHatch = operationTypeOptions.find((o) => o.value === opType)?.needHatch;
  if (needHatch && !deviceHatchId.value) {
    ElMessage.warning("请选择仓口");
    return;
  }

  const needVolume = operationTypeOptions.find((o) => o.value === opType)?.needVolume;
  if (needVolume) {
    params.volume = volumeValue.value;
  }
  if (needHatch) {
    params.deviceHatchId = deviceHatchId.value;
  }

  operationSubmitting.value = true;
  try {
    await operateDeviceApi(params);
    ElMessage.success("操作指令已发送");
    operationVisible.value = false;
    if (opType === 7) {
      startScreenshotPolling();
    }
  } catch {
    ElMessage.error("操作失败");
  } finally {
    operationSubmitting.value = false;
  }
}

// --- 屏幕截图轮询 ---
function startScreenshotPolling() {
  stopScreenshotPolling();
  screenshotLoading.value = true;
  screenshotDialogVisible.value = true;
  screenshotImageUrl.value = "";
  queryScreenshotResult();
  screenshotPollingTimer.value = setInterval(() => {
    queryScreenshotResult();
  }, 5000);
}

async function queryScreenshotResult() {
  if (!screenshotDialogVisible.value) {
    stopScreenshotPolling();
    return;
  }
  try {
    const res = await operateDeviceApi({
      deviceId: operationDeviceId.value,
      operateType: 7,
    });
    if (res?.screenshotReady === true && res?.imageUrl) {
      screenshotImageUrl.value = res.imageUrl;
      screenshotLoading.value = false;
      stopScreenshotPolling();
      ElMessage.success("截图已完成");
    } else if (res?.screenshotReady === false) {
      screenshotLoading.value = true;
    } else {
      console.error("获取截图结果失败:", res);
      screenshotLoading.value = false;
      ElMessage.error("获取截图失败");
      stopScreenshotPolling();
      screenshotDialogVisible.value = false;
    }
  } catch (error) {
    console.error("查询截图结果出错:", error);
    screenshotLoading.value = false;
    ElMessage.error("查询截图结果失败");
    stopScreenshotPolling();
    screenshotDialogVisible.value = false;
  }
}

function stopScreenshotPolling() {
  if (screenshotPollingTimer.value) {
    clearInterval(screenshotPollingTimer.value);
    screenshotPollingTimer.value = null;
  }
  screenshotLoading.value = false;
}

// --- 切换IP端口 ---
function handleChangeIpPort(row: Device) {
  ipPortData.value = {
    deviceId: row.deviceId,
    ip: "",
    port: "",
  };
  ipPortVisible.value = true;
}

async function submitChangeIpPort() {
  if (!ipPortData.value.ip) {
    ElMessage.warning("请输入IP地址");
    return;
  }
  if (!ipPortData.value.port) {
    ElMessage.warning("请输入端口号");
    return;
  }
  try {
    await changeDeviceServerIpPortApi(ipPortData.value);
    ElMessage.success("切换指令已发送");
    ipPortVisible.value = false;
  } catch {
    ElMessage.error("切换失败");
  }
}

// --- 设备升级 ---
function handleUpgrade(row: Device) {
  upgradeDeviceId.value = row.deviceId;
  upgradeFileUrl.value = "";
  upgradeFile.value = null;
  upgradeVisible.value = true;
}

async function submitUpgrade() {
  if (!upgradeFileUrl.value.trim()) {
    ElMessage.warning("请填写升级文件地址");
    return;
  }
  upgradeUploading.value = true;
  try {
    await deviceUpgradeApi(upgradeDeviceId.value, upgradeFile.value, upgradeFileUrl.value);
    ElMessage.success("升级指令已发送");
    upgradeVisible.value = false;
    upgradeFileUrl.value = "";
  } catch {
    ElMessage.error("升级失败");
  } finally {
    upgradeUploading.value = false;
  }
}

function handleUploadSuccess(res: any) {
  console.log("文件上传成功:", res);
}

// --- 二维码 ---
async function handleQrcodeShow(row: Device) {
  qrcodeMode.value = 1;
  qrcodeLoading.value = true;
  qrcodeVisible.value = true;
  qrcodeList.value = [];
  try {
    const res = await downOneDeviceQrcodeJsonApi(row.deviceId);
    qrcodeList.value = res || [];
  } catch {
    ElMessage.error("获取二维码失败");
  } finally {
    qrcodeLoading.value = false;
  }
}

async function handleQrcodeDownload(row: Device) {
  // ... 保持不变
}

async function handleBatchQrcodeShow() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning("请先选择设备");
    return;
  }
  qrcodeMode.value = 1;
  qrcodeLoading.value = true;
  qrcodeVisible.value = true;
  qrcodeList.value = [];
  try {
    const res = await batchDownDeviceQrcodeJsonApi(selectedIds.value);
    qrcodeList.value = res || [];
  } catch {
    ElMessage.error("获取二维码失败");
  } finally {
    qrcodeLoading.value = false;
  }
}

async function handleBatchQrcodeDownload() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning("请先选择设备");
    return;
  }
  try {
    const blob = await batchDownDeviceQrcodeFileApi(selectedIds.value);
    const blobData = blob.data || blob;
    let downloadName = `qrcodes_${Date.now()}.zip`;
    const contentDisposition = blob.headers?.["content-disposition"];
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename\*?=['"]?(?:UTF-8'')?([^"';]+)['"]?/i);
      if (fileNameMatch && fileNameMatch[1]) {
        downloadName = decodeURIComponent(fileNameMatch[1]);
      }
    }
    const url = window.URL.createObjectURL(new Blob([blobData]));
    const link = document.createElement("a");
    link.href = url;
    link.download = downloadName;
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    ElMessage.success("下载成功");
  } catch {
    ElMessage.error("批量下载失败");
  }
}

// --- 下拉菜单 ---
function handleCommand(cmd: string, row: Device) {
  switch (cmd) {
    case "ipPort": {
      handleChangeIpPort(row);
      break;
    }
    case "operation": {
      handleOperation(row);
      break;
    }
    case "restart": {
      ElMessageBox.confirm("确认重启设备吗？", "提示", {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      }).then(async () => {
        await operateDeviceApi({
          deviceId: row.deviceId,
          operateType: 3,
        });
        ElMessage.success("重启指令已发送");
      });
      break;
    }
    case "upgrade": {
      handleUpgrade(row);
      break;
    }
  }
}

function handleBatchCommand(cmd: string) {
  switch (cmd) {
    case "qrcodeDownload": {
      handleBatchQrcodeDownload();
      break;
    }
    case "qrcodeShow": {
      handleBatchQrcodeShow();
      break;
    }
  }
}

// --- 加载选项 ---
async function loadOptions() {
  try {
    const deptRes = await getMerchantDeptListApi({ status: 0 });
    deptOptions.value = deptRes || [];
  } catch (error) {
    console.error(error);
  }
}

// --- 数据加载 ---
async function loadData() {
  try {
    loading.value = true;
    const res = await getDevicePageApi(queryParams);
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
function handleView(row: Device) {
  detailModalRef.value?.open(row);
}

// --- 新增 ---
function handleAdd() {
  editModalRef.value?.open()
}

// --- 编辑 ---
function handleEdit(row: Device) {
  editModalRef.value?.open(row)
}

// --- 删除 ---
async function handleDelete(row?: Device) {
  let ids: number[] = [];
  if (row) {
    ids = [row.deviceId];
  } else {
    if (selectedIds.value.length === 0) {
      ElMessage.warning("请选择要删除的记录");
      return;
    }
    ids = selectedIds.value;
  }
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${ids.length} 条设备吗？`, "提示", { type: "warning" });
    for (const id of ids) {
      await deleteDeviceApi(id);
    }
    ElMessage.success(`成功删除 ${ids.length} 条设备`);
    selectedIds.value = [];
    handleQuery();
  } catch {
    // 取消删除
  }
}

function handleSelectionChange(selection: Device[]) {
  selectedIds.value = selection.map((item) => item.deviceId);
}

function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.deviceName = undefined;
  queryParams.deviceNo = undefined;
  queryParams.onlineStatus = undefined;
  queryParams.status = undefined;
  queryParams.qrCode = undefined;
  queryParams.pageNo = 1;
  queryParams.pageSize = 10;
  loadData();
}

onMounted(() => {
  loadOptions();
  loadData();
});
</script>

<template>
  <Page auto-content-height>
    <!-- 查询表单 -->
    <el-card shadow="never" class="border-none mb-4 !p-2">
      <el-form :inline="true" :model="queryParams" class="flex flex-wrap gap-x-2 gap-y-2 items-center">
        <el-form-item class="!mb-0 !mr-2">
          <el-tree-select
v-model="queryParams.deptId" :data="deptOptions" :props="{
            value: 'deptId',
            label: 'deptName',
            children: 'children',
          }" placeholder="请选择" clearable check-strictly style="width: 200px" class="tree-prefix-dept"
/>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-2">
          <el-input
v-model="queryParams.deviceName" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">设备名称:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-2">
          <el-input
v-model="queryParams.deviceNo" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">设备编号:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-2">
          <el-input
v-model="queryParams.qrCode" placeholder="请输入" clearable style="width: 200px"
            @keyup.enter="handleQuery"
>
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">面贴编号:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-2">
          <el-select v-model="queryParams.onlineStatus" clearable style="width: 200px">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">在线状态:</span>
            </template>
            <el-option v-for="item in device_online_status" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-2">
          <el-select v-model="queryParams.status" clearable style="width: 200px">
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">状态:</span>
            </template>
            <el-option v-for="item in device_status" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-0 md:ml-auto flex items-center gap-1">
          <el-tooltip content="查询" placement="top">
            <el-button type="primary" icon="Search" circle @click="handleQuery" />
          </el-tooltip>
          <el-tooltip content="重置" placement="top">
            <el-button icon="Refresh" circle @click="resetQuery" />
          </el-tooltip>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card shadow="never" class="border-none !p-2">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2">
          <el-button type="primary" icon="Plus" @click="handleAdd">新增设备</el-button>
          <ExportButton :module-code="ModuleCodeMap.DEVICE" :fields="visibleColumns" :find-cond="queryParams" />
          <el-button type="danger" plain icon="Delete" :disabled="selectedIds.length === 0" @click="handleDelete()">
            批量删除
          </el-button>
          <span v-if="selectedIds.length > 0" class="text-xs text-gray-400 ml-2">
            已选 <span class="text-red-500 font-medium">{{ selectedIds.length }}</span> 项
          </span>
        </div>

        <div class="flex items-center">
          <ColumnSelector
:storage-key="DEVICE_STORAGE_KEY" :default-columns="defaultDeviceColumns"
            @update:columns="handleColumnsUpdate"
/>
        </div>
      </div>

      <el-table
v-loading="loading" :data="tableData" border stripe style="width: 100%"
        @selection-change="handleSelectionChange"
>
        <el-table-column type="selection" width="55" align="center" />

        <el-table-column
v-for="col in visibleColumns" :key="col.key" :prop="col.key" :label="col.label"
          :width="typeof col.width === 'number' ? col.width : undefined" :min-width="col.minWidth" :align="col.align"
          :show-overflow-tooltip="col.showOverflowTooltip || false"
>
          <template #default="{ row }">
            <template v-if="col.key === 'deviceHatchType'">
              <DictTag :options="device_hatch_type" :value="row.deviceHatchType" />
            </template>
            <template v-else-if="col.key === 'deviceBrand'">
              <DictTag :options="device_brand" :value="row.deviceBrand" />
            </template>
            <!-- 在线状态 -->
            <template v-else-if="col.key === 'onlineStatus'">
              <DictTag :options="device_online_status" :value="row.onlineStatus" />
            </template>

            <!-- 启用状态 -->
            <template v-else-if="col.key === 'status'">
              <DictTag :options="device_status" :value="row.status" />
            </template>
            <template v-else-if="col.key === 'qrCode'">
              <div class="flex items-center justify-center gap-1">
                <span>{{ row.qrCode || "-" }}</span>
                <el-icon
v-if="row.qrCode" class="cursor-pointer text-primary hover:text-primary-dark" title="查看二维码"
                  @click.stop="handleQrcodeShow(row)"
>
                  <Picture />
                </el-icon>
              </div>
            </template>
            <template v-else-if="col.key === 'screenFlag'">
              <DictTag :options="device_screen" :value="row.screenFlag" />
            </template>
            <template v-else>
              {{ (row as any)[col.key] ?? '-' }}
            </template>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="400" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button link type="primary" icon="Monitor" @click="handleView(row)">详情</el-button>
              <el-button link type="primary" icon="Edit" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
              <el-dropdown @command="(cmd: string) => handleCommand(cmd, row)">
                <el-button link type="primary" class="dropdown-trigger-btn">
                  更多操作<el-icon class="el-icon--right">
                    <ArrowDown />
                  </el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="restart">重启设备</el-dropdown-item>
                    <el-dropdown-item command="operation">设备操作</el-dropdown-item>
                    <el-dropdown-item command="ipPort">切换IP端口</el-dropdown-item>
                    <el-dropdown-item command="upgrade">设备升级</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="flex justify-end mt-4">
        <el-pagination
v-model:current-page="queryParams.pageNo" v-model:page-size="queryParams.pageSize" :total="total"
          :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper" @size-change="loadData"
          @current-change="loadData"
/>
      </div>
    </el-card>

    <!-- ===== 编辑弹窗 ===== -->
    <EditModal ref="editModalRef" @success="handleQuery" />

    <!-- 详情弹窗 -->
    <DetailModal ref="detailModalRef" />

    <!-- 设备操作弹窗 -->
    <el-dialog v-model="operationVisible" title="设备操作" width="500px" append-to-body>
      <el-form label-width="100px">
        <el-form-item label="操作类型">
          <el-select v-model="operationType" placeholder="请选择" style="width: 100%">
            <el-option v-for="item in operationTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="operationTypeOptions.find((o) => o.value === operationType)?.needHatch" label="仓口">
          <el-select v-model="deviceHatchId" placeholder="请选择" style="width: 100%">
            <el-option v-for="item in hatchOptions" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="operationTypeOptions.find((o) => o.value === operationType)?.needVolume" label="音量">
          <el-slider v-model="volumeValue" :min="0" :max="100" show-stops />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="operationVisible = false">取消</el-button>
        <el-button type="primary" :loading="operationSubmitting" @click="submitOperation">确定</el-button>
      </template>
    </el-dialog>

    <!-- 切换IP端口弹窗 -->
    <el-dialog v-model="ipPortVisible" title="切换IP端口" width="500px" append-to-body>
      <el-form label-width="100px">
        <el-form-item label="IP地址" required>
          <el-input v-model="ipPortData.ip" placeholder="请输入IP地址" />
        </el-form-item>
        <el-form-item label="端口号" required>
          <el-input v-model="ipPortData.port" placeholder="请输入端口号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="ipPortVisible = false">取消</el-button>
        <el-button type="primary" @click="submitChangeIpPort">确定</el-button>
      </template>
    </el-dialog>

    <!-- 设备升级弹窗 -->
    <el-dialog v-model="upgradeVisible" title="设备升级" width="800px" append-to-body>
      <el-form label-width="100px">
        <el-form-item label="升级文件" required>
          <el-input v-model="upgradeFileUrl" placeholder="请输入升级文件下载地址" clearable />
        </el-form-item>
        <UploadFile
v-model="upgradeFile" :limit="1" drag webkitdirectory :file-size="200"
          :file-type="['bin', 'zip', 'hex']" @success="handleUploadSuccess"
/>
      </el-form>
      <template #footer>
        <el-button @click="upgradeVisible = false">取消</el-button>
        <el-button type="primary" :loading="upgradeUploading" @click="submitUpgrade">确定</el-button>
      </template>
    </el-dialog>

    <!-- 二维码弹窗 -->
    <el-dialog
v-model="qrcodeVisible" :title="qrcodeMode === 0 ? '设备二维码下载' : '设备二维码展示'" width="900px" append-to-body
      class="rounded-xl"
>
      <div v-loading="qrcodeLoading" class="min-height-[400px]">
        <el-scrollbar max-height="550px" always>
          <div v-if="qrcodeList.length === 0 && !qrcodeLoading" class="py-12">
            <el-empty description="暂无二维码数据" />
          </div>
          <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
            <div
v-for="(item, index) in qrcodeList" :key="item"
              class="group relative bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-3 border border-gray-100 dark:border-zinc-700 transition-all hover:shadow-md hover:border-primary/30"
>
              <div class="mb-2">
                <div class="text-[11px] text-gray-400 uppercase tracking-wider mb-1">QR Code No.</div>
                <div
class="text-xs font-mono font-bold text-gray-700 dark:text-gray-200 truncate"
                  :title="item.qrcodeCode"
>
                  {{ item.qrcodeCode }}
                </div>
              </div>
              <div
                class="relative aspect-square bg-white rounded-md overflow-hidden border border-gray-200 shadow-inner group-hover:border-primary/20"
>
                <el-image
:src="item.base64QrCode || item.qrcodeUrl" fit="contain" class="w-full h-full p-2"
                  :preview-src-list="qrcodeList.map((i) => i.base64QrCode || i.qrcodeUrl)" :initial-index="index"
                  preview-teleported
>
                  <template #placeholder>
                    <div class="flex items-center justify-center h-full bg-gray-50 text-gray-400">
                      <el-icon class="is-loading">
                        <Loading />
                      </el-icon>
                    </div>
                  </template>
                </el-image>
                <div
                  class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
>
                  <el-icon color="white" :size="24">
                    <View />
                  </el-icon>
                </div>
              </div>
              <div class="mt-3">
                <el-button
type="primary" plain size="small" class="w-full !rounded-md" icon="Download"
                  @click="handleQrcodeDownload(item)"
>
                  下载单图
                </el-button>
              </div>
            </div>
          </div>
        </el-scrollbar>
      </div>
      <template #footer>
        <div class="flex justify-between items-center px-2">
          <span class="text-xs text-gray-400">提示：点击图片可查看高清大图并轮播</span>
          <el-button @click="qrcodeVisible = false" class="!rounded-md">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped lang="scss">
.map-wrapper {
  padding: 0 8px;
}

.action-buttons {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;

  .el-button {
    margin-right: 0;
    margin-left: 0;
  }

  .dropdown-trigger-btn {
    padding: 8px 12px;
    margin: 0;
  }
}

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
