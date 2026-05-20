<script lang="ts" setup>
import { onMounted, reactive, ref } from "vue";

import { Page } from "@vben/common-ui";

import {
  ArrowDown,
  Delete,
  Edit,
  Monitor,
  Plus,
  Refresh,
  Search,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import {
  addDeviceApi,
  deleteDeviceApi,
  type Device,
  type DevicePageParams,
  editDeviceApi,
  getDeviceDetailApi,
  getDevicePageApi,
} from "#/api/device/device";
import {
  type DeviceConfig,
  getDeviceConfigListApi,
} from "#/api/device/deviceConfig";
import {
  type DevicePackage,
  getDevicePackageListApi,
} from "#/api/device/devicePackage";
import { getQrcodeListApi, type Qrcode } from "#/api/device/qrcode";
import { type Dept, getMerchantDeptListApi } from "#/api/system/dept";
import AreaCascader from "#/components/AreaCascader/index.vue";
import MapPicker from "#/components/MapPicker/index.vue";

import { useExport, ModuleCodeMap } from "#/hooks/useExport";

// 设备管理页面
const { exporting, exportData } = useExport(ModuleCodeMap.DEVICE);

// 导出按钮点击
async function handleExport() {
  // 传入当前查询条件
  await exportData(queryParams, {
    // 可选：指定导出的字段
    columns: ["deviceName", "deviceNo", "deviceAddress", "status"],
  });
}

// --- 状态变量 ---
const loading = ref(false);
const tableData = ref<Device[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const location = ref<null | { lat: number; lng: number }>(null);
const areaCodes = ref("");

// 表单弹窗控制
const formVisible = ref(false);
const formTitle = ref("");
const formData = ref<Partial<Device>>({});
const formSubmitting = ref(false);

// 详情弹窗
const detailVisible = ref(false);
const detailData = ref<Device | null>(null);

// 下拉选项
const deviceConfigOptions = ref<DeviceConfig[]>([]);
const deptOptions = ref<Dept[]>([]);
const qrcodeOptions = ref<Qrcode[]>([]);
const devicePackageOptions = ref<DevicePackage[]>([]);

// 品牌选项
const brandOptions = [{ label: "傻瓜环保", value: 0 }];

// 设备类型选项
const hatchTypeOptions = [
  { label: "单仓", value: 0 },
  { label: "双仓", value: 1 },
];

// 锁类型选项
const lockTypeOptions = [
  { label: "推杆", value: 0 },
  { label: "弹锁", value: 1 },
];

// 在线状态选项
const onlineStatusOptions = [
  { label: "全部", value: undefined },
  { label: "在线", value: 1 },
  { label: "离线", value: 0 },
];

// 状态选项
const statusOptions = [
  { label: "启用", value: 0 },
  { label: "禁用", value: 1 },
];

// 查询参数
const queryParams = reactive<DevicePageParams>({
  pageNo: 1,
  pageSize: 10,
  deviceName: undefined,
  deviceNo: undefined,
  onlineStatus: undefined,
  status: undefined,
});

// --- 辅助函数 ---
function getOnlineStatusText(status: number): string {
  return status === 1 ? "在线" : "离线";
}

function getOnlineStatusType(status: number): string {
  return status === 1 ? "success" : "info";
}

function getStatusText(status: number): string {
  return status === 0 ? "启用" : "禁用";
}

function getHatchTypeText(type: number): string {
  return type === 0 ? "单仓" : "双仓";
}

// 操作弹窗
const operationVisible = ref(false);
const operationDeviceId = ref<number>(0);
const operationType = ref<number>(0);
const volumeValue = ref<number>(50);
const deviceHatchId = ref<number>(0);
const operationSubmitting = ref(false);

// IP端口切换弹窗
const ipPortVisible = ref(false);
const ipPortData = ref({ deviceId: 0, ip: "", port: "" });

// 二维码弹窗
const qrcodeVisible = ref(false);
const qrcodeLoading = ref(false);
const qrcodeList = ref<QrcodeData[]>([]);
const qrcodeMode = ref<number>(0); // 0=下载压缩包, 1=展示base64

// 升级弹窗
const upgradeVisible = ref(false);
const upgradeDeviceId = ref<number>(0);
const upgradeFile = ref<File | null>(null);
const upgradeUploading = ref(false);

// 操作类型选项
const operationTypeOptions = [
  { label: "开仓口", value: 0, needHatch: true },
  { label: "关仓口", value: 1, needHatch: true },
  { label: "开清运门", value: 2, needHatch: true },
  { label: "重启设备", value: 3, needHatch: false },
  { label: "重启大屏", value: 4, needHatch: false },
  { label: "调节音量", value: 5, needHatch: false, needVolume: true },
];

// 获取设备的仓口列表（需要根据实际接口调整）
const hatchOptions = ref([
  { id: 0, name: "仓口1" },
  { id: 1, name: "仓口2" },
]);

// --- 设备操作 ---
function handleOperation(row: Device) {
  operationDeviceId.value = row.deviceId;
  operationType.value = 0;
  volumeValue.value = 50;
  deviceHatchId.value = 0;
  operationVisible.value = true;
}

async function submitOperation() {
  const opType = operationType.value;
  const params: DeviceOperationParams = {
    operateType: opType,
    deviceId: operationDeviceId.value,
  };

  // 检查是否需要仓口ID
  const needHatch = operationTypeOptions.find(
    (o) => o.value === opType
  )?.needHatch;
  if (needHatch && !deviceHatchId.value) {
    ElMessage.warning("请选择仓口");
    return;
  }

  // 检查是否需要音量
  const needVolume = operationTypeOptions.find(
    (o) => o.value === opType
  )?.needVolume;
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
  } catch {
    ElMessage.error("操作失败");
  } finally {
    operationSubmitting.value = false;
  }
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
  upgradeFile.value = null;
  upgradeVisible.value = true;
}

function handleFileChange(file: any) {
  upgradeFile.value = file.raw;
}

async function submitUpgrade() {
  if (!upgradeFile.value) {
    ElMessage.warning("请选择升级文件");
    return;
  }

  upgradeUploading.value = true;
  try {
    await deviceUpgradeApi(upgradeDeviceId.value, upgradeFile.value);
    ElMessage.success("升级指令已发送");
    upgradeVisible.value = false;
  } catch {
    ElMessage.error("升级失败");
  } finally {
    upgradeUploading.value = false;
  }
}

// --- 二维码 ---
async function handleQrcode(row: Device, mode: number) {
  qrcodeMode.value = mode;
  qrcodeLoading.value = true;
  qrcodeVisible.value = true;

  try {
    const params: QrcodeParams = {
      bagQrcodeFlag: mode,
      deviceId: row.deviceId,
    };
    const res = await downOneDeviceQrcodeApi(params);
    qrcodeList.value = res || [];

    // 如果是下载模式，触发文件下载
    if (mode === 0 && qrcodeList.value.length > 0) {
      // 假设后端返回的是base64或下载链接
      // 这里需要根据实际响应处理
    }
  } catch {
    ElMessage.error("获取二维码失败");
  } finally {
    qrcodeLoading.value = false;
  }
}

// 批量二维码
async function handleBatchQrcode(mode: number) {
  if (selectedIds.value.length === 0) {
    ElMessage.warning("请先选择设备");
    return;
  }

  qrcodeMode.value = mode;
  qrcodeLoading.value = true;
  qrcodeVisible.value = true;

  try {
    const params: QrcodeParams = {
      bagQrcodeFlag: mode,
      deviceIds: selectedIds.value,
    };
    const res = await batchDownDeviceQrcodeApi(params);
    qrcodeList.value = res || [];
  } catch {
    ElMessage.error("获取二维码失败");
  } finally {
    qrcodeLoading.value = false;
  }
}

// 下载单个二维码
function downloadQrcode(item: QrcodeData) {
  // 如果后端返回的是base64
  if (item.base64QrCode) {
    const link = document.createElement("a");
    link.href = item.base64QrCode;
    link.download = `qrcode_${item.deviceNo}.png`;
    link.click();
  } else if (item.qrCode) {
    // 如果后端返回的是URL
    const link = document.createElement("a");
    link.href = item.qrCode;
    link.download = `qrcode_${item.deviceNo}.png`;
    link.click();
  }
}

// 处理下拉菜单命令
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
    case "qrcodeDownload": {
      handleQrcode(row, 0);
      break;
    }
    case "qrcodeShow": {
      handleQrcode(row, 1);
      break;
    }
    case "upgrade": {
      handleUpgrade(row);
      break;
    }
  }
}

// 批量操作
function handleBatchCommand(cmd: string) {
  switch (cmd) {
    case "qrcodeDownload": {
      handleBatchQrcode(0);
      break;
    }
    case "qrcodeShow": {
      handleBatchQrcode(1);
      break;
    }
  }
}

// 解析区域编码
function parseAreaCodes(codes: string): {
  cityCode: string;
  districtCode: string;
  provinceCode: string;
} {
  if (!codes) {
    return { provinceCode: "", cityCode: "", districtCode: "" };
  }
  const parts = codes.split(",").filter(Boolean);
  return {
    provinceCode: parts[0] || "",
    cityCode: parts[1] || "",
    districtCode: parts[2] || "",
  };
}

// 组合区域编码
function buildAreaCodes(
  provinceCode?: string,
  cityCode?: string,
  districtCode?: string
): string {
  const parts = [provinceCode, cityCode, districtCode].filter(Boolean);
  return parts.join(",");
}

// --- 加载选项 ---
async function loadOptions() {
  try {
    const [configRes, deptRes, packageRes, qrcodeRes] = await Promise.all([
      getDeviceConfigListApi({ status: 0 }),
      getMerchantDeptListApi({ status: 0 }),
      getDevicePackageListApi({ status: 0 }),
      getQrcodeListApi({
        qrcodeType: 0, // 设备二维码
        status: 0, // 启用
        bindFlag: 0, // 未绑定
        pageSize: 1000,
      }),
    ]);
    deviceConfigOptions.value = configRes || [];
    deptOptions.value = deptRes || [];
    devicePackageOptions.value = packageRes || [];
    qrcodeOptions.value = qrcodeRes || [];
  } catch (error) {
    console.error(error);
  }
}

// --- 加载未绑定的二维码列表 ---
async function loadQrcodeList() {
  try {
    qrcodeLoading.value = true;
    const res = await getQrcodeListApi({
      qrcodeType: 0, // 设备二维码
      status: 0, // 启用
      bindFlag: 0, // 未绑定
      pageSize: 1000,
    });
    qrcodeOptions.value = res || [];
  } catch (error) {
    console.error("加载二维码列表失败：", error);
  } finally {
    qrcodeLoading.value = false;
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
async function handleView(row: Device) {
  try {
    const res = await getDeviceDetailApi(row.deviceId);
    detailData.value = res;
    detailVisible.value = true;
  } catch {
    ElMessage.error("获取详情失败");
  }
}

// --- 地图选点变化 ---
const handleMapChange = (info: any) => {
  console.log("地图返回位置信息:", info);

  if (info) {
    // 同步经纬度
    formData.value.longitude = info.lng;
    formData.value.latitude = info.lat;

    // 同步详细地址
    formData.value.detailAddress = info.address;

    // 同步区域编码
    if (info.areaCodes) {
      areaCodes.value = info.areaCodes;
      const { provinceCode, cityCode, districtCode } = parseAreaCodes(
        info.areaCodes
      );
      formData.value.provinceCode = provinceCode;
      formData.value.cityCode = cityCode;
      formData.value.districtCode = districtCode;
      formData.value.provinceName = info.province;
      formData.value.cityName = info.city;
      formData.value.districtName = info.district;
    }
  } else {
    formData.value.longitude = undefined;
    formData.value.latitude = undefined;
    formData.value.detailAddress = "";
    areaCodes.value = "";
    formData.value.provinceCode = "";
    formData.value.cityCode = "";
    formData.value.districtCode = "";
  }
};

// --- 区域选择变化 ---
const handleAreaChange = (codes: string) => {
  console.log("选中的区域编码:", codes);
  if (codes) {
    const { provinceCode, cityCode, districtCode } = parseAreaCodes(codes);
    formData.value.provinceCode = provinceCode;
    formData.value.cityCode = cityCode;
    formData.value.districtCode = districtCode;
  } else {
    formData.value.provinceCode = "";
    formData.value.cityCode = "";
    formData.value.districtCode = "";
  }
};

// --- 新增/编辑 ---
function handleAdd() {
  formTitle.value = "新增设备";
  formData.value = {
    status: 0,
    deviceBrand: 0,
    deviceHatchType: 0,
    isVirtualHatch: 0,
    lockType: 0,
    compressor: 0,
    volume: 50,
    devicePackageId: 0,
    deviceConfigId: 0,
    qrCode: undefined,
  };
  location.value = null;
  areaCodes.value = "";
  formVisible.value = true;
}

async function handleEdit(row: Device) {
  try {
    formTitle.value = "编辑设备";
    const res = await getDeviceDetailApi(row.deviceId);
    formData.value = res || {};

    // 回显地图位置
    if (res.longitude && res.latitude) {
      location.value = {
        lng: res.longitude,
        lat: res.latitude,
      };
    }

    // 回显区域编码
    if (res.provinceCode || res.cityCode || res.districtCode) {
      areaCodes.value = buildAreaCodes(
        res.provinceCode,
        res.cityCode,
        res.districtCode
      );
    }

    formVisible.value = true;
  } catch {
    ElMessage.error("获取设备信息失败");
  }
}

async function handleSubmit() {
  if (!formData.value.deviceName?.trim()) {
    ElMessage.warning("请输入设备名称");
    return;
  }
  if (!formData.value.deviceNo?.trim()) {
    ElMessage.warning("请输入设备编号");
    return;
  }
  if (!formData.value.deptId) {
    ElMessage.warning("请选择所属部门");
    return;
  }
  if (!formData.value.deviceConfigId) {
    ElMessage.warning("请选择设备配置");
    return;
  }
  if (!formData.value.devicePackageId) {
    ElMessage.warning("请选择设备套餐");
    return;
  }

  // 同步区域编码
  if (areaCodes.value) {
    const { provinceCode, cityCode, districtCode } = parseAreaCodes(
      areaCodes.value
    );
    formData.value.provinceCode = provinceCode;
    formData.value.cityCode = cityCode;
    formData.value.districtCode = districtCode;
  }

  formSubmitting.value = true;
  try {
    const api = formData.value.deviceId ? editDeviceApi : addDeviceApi;
    await api(formData.value);
    ElMessage.success(formData.value.deviceId ? "修改成功" : "新增成功");
    formVisible.value = false;
    handleQuery();
  } catch {
    ElMessage.error("操作失败");
  } finally {
    formSubmitting.value = false;
  }
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
    await ElMessageBox.confirm(
      `确定要删除选中的 ${ids.length} 条设备吗？`,
      "提示",
      {
        type: "warning",
      }
    );

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

// 表格选中变化
function handleSelectionChange(selection: Device[]) {
  selectedIds.value = selection.map((item) => item.deviceId);
}

// 搜索与重置
function handleQuery() {
  queryParams.pageNo = 1;
  loadData();
}

function resetQuery() {
  queryParams.deviceName = undefined;
  queryParams.deviceNo = undefined;
  queryParams.onlineStatus = undefined;
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
          <el-form-item label="所属部门">
            <el-tree-select
              v-model="queryParams.deptId"
              :data="deptOptions"
              :props="{
                value: 'deptId',
                label: 'deptName',
                children: 'children',
              }"
              placeholder="全部"
              clearable
              check-strictly
              style="width: 180px"
            />
          </el-form-item>
          <el-form-item label="设备名称">
            <el-input
              v-model="queryParams.deviceName"
              placeholder="请输入设备名称"
              clearable
              style="width: 160px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="设备编号">
            <el-input
              v-model="queryParams.deviceNo"
              placeholder="请输入设备编号"
              clearable
              style="width: 160px"
              @keyup.enter="handleQuery"
            />
          </el-form-item>
          <el-form-item label="在线状态">
            <el-select
              v-model="queryParams.onlineStatus"
              placeholder="全部"
              clearable
              style="width: 100px"
            >
              <el-option
                v-for="item in onlineStatusOptions"
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
            <el-button :loading="exporting" @click="handleExport">
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

            <el-button
              type="primary"
              plain
              @click="handleBatchCommand('qrcodeShow')"
              :disabled="selectedIds.length === 0"
            >
              批量展示二维码
            </el-button>
            <el-button
              type="primary"
              plain
              @click="handleBatchCommand('qrcodeDownload')"
              :disabled="selectedIds.length === 0"
            >
              批量下载二维码
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 数据表格 -->
      <el-card shadow="never">
        <el-table
          v-loading="loading"
          :data="tableData"
          border
          stripe
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" align="center" />
          <el-table-column
            prop="deviceId"
            label="设备ID"
            width="80"
            align="center"
          />
          <el-table-column
            prop="deviceName"
            label="设备名称"
            min-width="180"
            align="left"
            show-overflow-tooltip
          />
          <el-table-column
            prop="deviceNo"
            label="设备编号"
            width="150"
            align="center"
          />
          <el-table-column
            prop="qrCode"
            label="面贴编号"
            width="150"
            align="center"
          >
            <template #default="{ row }">
              {{ row.qrCode || "-" }}
            </template>
          </el-table-column>
          <el-table-column
            prop="deviceAddress"
            label="设备地址"
            min-width="200"
            align="center"
            show-overflow-tooltip
          />
          <el-table-column
            prop="deviceHatchType"
            label="设备类型"
            width="100"
            align="center"
          >
            <template #default="{ row }">
              {{ getHatchTypeText(row.deviceHatchType) }}
            </template>
          </el-table-column>
          <el-table-column
            prop="onlineStatus"
            label="在线状态"
            width="100"
            align="center"
          >
            <template #default="{ row }">
              <el-tag
                :type="getOnlineStatusType(row.onlineStatus)"
                size="small"
              >
                {{ getOnlineStatusText(row.onlineStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="status"
            label="状态"
            width="100"
            align="center"
          >
            <template #default="{ row }">
              <el-tag
                :type="row.status === 0 ? 'success' : 'danger'"
                size="small"
              >
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            label="操作"
            width="400"
            fixed="right"
            align="center"
          >
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                :icon="Monitor"
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
              <el-dropdown @command="(cmd: string) => handleCommand(cmd, row)">
                <el-button link type="primary">
                  更多操作<el-icon class="el-icon--right">
                    <ArrowDown />
                  </el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="operation">
                      设备操作
                    </el-dropdown-item>
                    <el-dropdown-item command="ipPort">
                      切换IP端口
                    </el-dropdown-item>
                    <el-dropdown-item command="upgrade">
                      设备升级
                    </el-dropdown-item>
                    <el-dropdown-item command="qrcodeShow">
                      展示二维码
                    </el-dropdown-item>
                    <el-dropdown-item command="qrcodeDownload">
                      下载二维码
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
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

    <!-- 新增/编辑弹窗（带地图） -->
    <el-dialog
      v-model="formVisible"
      :title="formTitle"
      width="1600px"
      append-to-body
    >
      <el-row :gutter="20">
        <!-- 左侧：表单区域 -->
        <el-col :span="10">
          <el-form :model="formData" label-width="110px" label-position="right">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="设备名称" required>
                  <el-input
                    v-model="formData.deviceName"
                    placeholder="请输入设备名称"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="设备编号" required>
                  <el-input
                    v-model="formData.deviceNo"
                    placeholder="请输入设备编号"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="设备品牌">
                  <el-select
                    v-model="formData.deviceBrand"
                    placeholder="请选择"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in brandOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="设备类型">
                  <el-select
                    v-model="formData.deviceHatchType"
                    placeholder="请选择"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in hatchTypeOptions"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="所属部门" required>
                  <el-tree-select
                    v-model="formData.deptId"
                    :data="deptOptions"
                    :props="{
                      value: 'deptId',
                      label: 'deptName',
                      children: 'children',
                    }"
                    placeholder="请选择所属部门"
                    clearable
                    check-strictly
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="设备配置" required>
                  <el-select
                    v-model="formData.deviceConfigId"
                    placeholder="请选择"
                    clearable
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in deviceConfigOptions"
                      :key="item.deviceConfigId"
                      :label="item.configName"
                      :value="item.deviceConfigId"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="设备套餐" required>
                  <el-select
                    v-model="formData.devicePackageId"
                    placeholder="请选择设备套餐"
                    clearable
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in devicePackageOptions"
                      :key="item.devicePackageId"
                      :label="`${item.packageName}${item.unitPrice}元/kg`"
                      :value="item.devicePackageId"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="面贴编号">
                  <el-select
                    v-model="formData.qrCode"
                    placeholder="请选择面贴编号"
                    clearable
                    filterable
                    :loading="qrcodeLoading"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="item in qrcodeOptions"
                      :key="item.qrcodeId"
                      :label="item.qrcodeCode"
                      :value="item.qrcodeCode"
                    />
                  </el-select>
                  <div class="text-gray-400 text-xs mt-1">
                    仅显示未绑定的设备二维码
                  </div>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="区域">
              <AreaCascader
                v-model="areaCodes"
                placeholder="请选择区域"
                @change="handleAreaChange"
              />
            </el-form-item>

            <el-form-item label="详细地址">
              <el-input
                v-model="formData.detailAddress"
                placeholder="详细地址（门牌号/位置）"
              />
            </el-form-item>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="经度">
                  <el-input-number
                    v-model="formData.longitude"
                    :precision="6"
                    :step="0.000001"
                    placeholder="经度"
                    :controls="false"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="纬度">
                  <el-input-number
                    v-model="formData.latitude"
                    :precision="6"
                    :step="0.000001"
                    placeholder="纬度"
                    :controls="false"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="客服电话">
              <el-input
                v-model="formData.customerPhone"
                placeholder="客服电话"
              />
            </el-form-item>

            <el-form-item label="状态">
              <el-radio-group v-model="formData.status">
                <el-radio :value="0">启用</el-radio>
                <el-radio :value="1">禁用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
        </el-col>

        <!-- 右侧：地图区域 -->
        <el-col :span="14">
          <div class="map-wrapper">
            <MapPicker
              v-model="location"
              height="550px"
              @change="handleMapChange"
            />
          </div>
        </el-col>
      </el-row>

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
      title="设备详情"
      width="800px"
      append-to-body
    >
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="设备ID">
          {{ detailData.deviceId }}
        </el-descriptions-item>
        <el-descriptions-item label="设备名称">
          {{ detailData.deviceName }}
        </el-descriptions-item>
        <el-descriptions-item label="设备编号">
          {{ detailData.deviceNo }}
        </el-descriptions-item>
        <el-descriptions-item label="设备品牌">
          {{ detailData.deviceBrand === 0 ? "傻瓜环保" : "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="设备类型">
          {{ getHatchTypeText(detailData.deviceHatchType) }}
        </el-descriptions-item>
        <el-descriptions-item label="设备套餐">
          {{ detailData.devicePackageId || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="在线状态">
          <el-tag
            :type="getOnlineStatusType(detailData.onlineStatus)"
            size="small"
          >
            {{ getOnlineStatusText(detailData.onlineStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="最后心跳">
          {{ detailData.lastHeartTime || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="过期时间">
          {{ detailData.expireTime || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="设备地址" :span="2">
          {{ detailData.deviceAddress || "" }}
          {{ detailData.detailAddress || "" }}
        </el-descriptions-item>
        <el-descriptions-item label="经度">
          {{ detailData.longitude || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="纬度">
          {{ detailData.latitude || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="硬件版本">
          {{ detailData.hardwareVersion || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="软件版本">
          {{ detailData.softwareVersion || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="信号强度">
          {{ detailData.signal || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="设备音量">
          {{ detailData.volume || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="客服电话">
          {{ detailData.customerPhone || "-" }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag
            :type="detailData.status === 0 ? 'success' : 'danger'"
            size="small"
          >
            {{ getStatusText(detailData.status) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 设备操作弹窗 -->
    <el-dialog
      v-model="operationVisible"
      title="设备操作"
      width="500px"
      append-to-body
    >
      <el-form label-width="100px">
        <el-form-item label="操作类型">
          <el-select
            v-model="operationType"
            placeholder="请选择"
            style="width: 100%"
          >
            <el-option
              v-for="item in operationTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="
            operationTypeOptions.find((o) => o.value === operationType)
              ?.needHatch
          "
          label="仓口"
        >
          <el-select
            v-model="deviceHatchId"
            placeholder="请选择"
            style="width: 100%"
          >
            <el-option
              v-for="item in hatchOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="
            operationTypeOptions.find((o) => o.value === operationType)
              ?.needVolume
          "
          label="音量"
        >
          <el-slider v-model="volumeValue" :min="0" :max="100" show-stops />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="operationVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="operationSubmitting"
          @click="submitOperation"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 切换IP端口弹窗 -->
    <el-dialog
      v-model="ipPortVisible"
      title="切换IP端口"
      width="500px"
      append-to-body
    >
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
    <el-dialog
      v-model="upgradeVisible"
      title="设备升级"
      width="500px"
      append-to-body
    >
      <el-form label-width="100px">
        <el-form-item label="升级文件" required>
          <el-upload
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :file-list="[]"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">请选择升级固件文件</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="upgradeVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="upgradeUploading"
          @click="submitUpgrade"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 二维码弹窗 -->
    <el-dialog
      v-model="qrcodeVisible"
      :title="qrcodeMode === 0 ? '设备二维码下载' : '设备二维码展示'"
      width="600px"
      append-to-body
    >
      <div v-loading="qrcodeLoading">
        <div
          v-if="qrcodeList.length === 0 && !qrcodeLoading"
          class="text-center py-8"
        >
          <el-empty description="暂无二维码数据" />
        </div>
        <div v-else class="qrcode-list">
          <div
            v-for="item in qrcodeList"
            :key="item.deviceId"
            class="qrcode-item"
          >
            <div class="qrcode-info">
              <span>设备编号：{{ item.deviceNo }}</span>
            </div>
            <div
              class="qrcode-img"
              v-if="qrcodeMode === 1 && item.base64QrCode"
            >
              <img :src="item.base64QrCode" alt="二维码" />
            </div>
            <div v-if="qrcodeMode === 0" class="qrcode-download">
              <el-button
                type="primary"
                size="small"
                @click="downloadQrcode(item)"
              >
                下载二维码
              </el-button>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="qrcodeVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </Page>
</template>

<style scoped lang="scss">
.map-wrapper {
  padding: 0 8px;
}
</style>
