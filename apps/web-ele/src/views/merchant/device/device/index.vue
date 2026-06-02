<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from "vue";

import { Page } from "@vben/common-ui";

import {
  ArrowDown,
  Delete,
  Edit,
  Monitor,
  Picture,
  Plus,
  Refresh,
  Search,
} from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";

import {
  addDeviceApi,
  batchDownDeviceQrcodeFileApi,
  batchDownDeviceQrcodeJsonApi,
  changeDeviceServerIpPortApi,
  deleteDeviceApi,
  type Device,
  type DevicePageParams,
  deviceUpgradeApi,
  downOneDeviceQrcodeFileApi,
  downOneDeviceQrcodeJsonApi,
  editDeviceApi,
  getDeviceDetailApi,
  getDevicePageApi,
  operateDeviceApi,
  type QrcodeData,
} from "#/api/device/device";
import {
  type DeviceConfig,
  getDeviceConfigListApi,
} from "#/api/device/deviceConfig";
import {
  type DeviceHatch,
  getDeviceHatchListApi,
} from "#/api/device/deviceHatch";
import {
  type DevicePackage,
  getDevicePackageListApi,
} from "#/api/device/devicePackage";
import { getQrcodeListApi, type Qrcode } from "#/api/device/qrCode";
import { type Dept, getMerchantDeptListApi } from "#/api/system/dept";
import AreaCascader from "#/components/AreaCascader/index.vue";
import MapPicker from "#/components/MapPicker/index.vue";
import { useDicts } from "#/hooks/useDict";
import { ModuleCodeMap, useExport } from "#/hooks/useExport";
const { device_brand, device_screen } = useDicts(["device_brand", "device_screen"]);

const { exporting, exportData } = useExport(ModuleCodeMap.DEVICE);
import UploadFile from "#/components/UploadFile/index.vue";
import {
  defaultDeviceColumns,
  DEVICE_STORAGE_KEY,
  type TableColumnConfig,
} from "#/constants/tableColumns";

// 表格列配置
const columnConfig = ref<TableColumnConfig[]>([...defaultDeviceColumns]);

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
  await exportData(queryParams, selectedFields);
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
const formRef = ref();
const formRules = reactive({
  deviceName: [{ required: true, message: "请输入设备名称", trigger: "blur" }],
  deviceNo: [{ required: true, message: "请输入设备编号", trigger: "blur" }],
  deviceBrand: [
    { required: true, message: "请选择设备品牌", trigger: "change" },
  ],
  deviceHatchType: [
    { required: true, message: "请选择设备类型", trigger: "change" },
  ],
  deptId: [{ required: true, message: "请选择所属部门", trigger: "change" }],
  deviceConfigId: [
    { required: true, message: "请选择设备配置", trigger: "change" },
  ],
  devicePackageId: [
    { required: true, message: "请选择设备套餐", trigger: "change" },
  ],
  qrCode: [{ required: true, message: "请选择面贴编号", trigger: "change" }],
});

// 详情弹窗
const detailVisible = ref(false);
const detailData = ref<Device | null>(null);

// 下拉选项
const deviceConfigOptions = ref<DeviceConfig[]>([]);
const deptOptions = ref<Dept[]>([]);
const qrcodeOptions = ref<Qrcode[]>([]);
const devicePackageOptions = ref<DevicePackage[]>([]);

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
  qrCode: undefined,
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
const deviceHatchId = ref<null | number>(null);
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
];

// 屏幕截图轮询相关
const screenshotPollingTimer = ref<null | ReturnType<typeof setInterval>>(null);
const screenshotImageUrl = ref("");
const screenshotDialogVisible = ref(false);
const screenshotLoading = ref(false);

// 获取设备的仓口列表
const hatchOptions = ref<{ id: number; name: string }[]>([]);



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

// 获取设备的仓口列表
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

  // 重置截图相关
  screenshotImageUrl.value = "";
  screenshotDialogVisible.value = false;

  // 加载仓口列表
  await getHatchOptions(row.deviceId);

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

    // 如果是屏幕截图操作，开启轮询
    if (opType === 7) {
      startScreenshotPolling();
    }
  } catch {
    ElMessage.error("操作失败");
  } finally {
    operationSubmitting.value = false;
  }
}

// 开始轮询屏幕截图结果
function startScreenshotPolling() {
  // 清除之前的轮询
  stopScreenshotPolling();

  screenshotLoading.value = true;
  screenshotDialogVisible.value = true;
  screenshotImageUrl.value = "";

  // 立即查询一次
  queryScreenshotResult();

  // 设置5秒轮询
  screenshotPollingTimer.value = setInterval(() => {
    queryScreenshotResult();
  }, 5000);
}

// 查询截图结果
async function queryScreenshotResult() {
  // 如果弹窗已关闭，停止轮询
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
      // 截图已完成
      screenshotImageUrl.value = res.imageUrl;
      screenshotLoading.value = false;
      stopScreenshotPolling();
      ElMessage.success("截图已完成");
    } else if (res?.screenshotReady === false) {
      // 还在处理中，继续等待
      screenshotLoading.value = true;
    } else {
      // 请求失败或返回异常
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

// 停止轮询
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

function handleFileChange(file: any) {
  upgradeFile.value = file.raw;
}
// 上传成功回调
function handleUploadSuccess(res: any) {
  console.log("文件上传成功:", res);
}

// async function submitUpgrade() {
//   if (upgradeFile.value.length === 0) {
//     ElMessage.warning("请选择升级文件");
//     return;
//   }

//   upgradeUploading.value = true;
//   try {
//     // 根据你的接口，可能传文件地址或文件ID
//     await deviceUpgradeApi(upgradeDeviceId.value, upgradeFile.value[0]);
//     ElMessage.success("升级指令已发送");
//     upgradeVisible.value = false;
//     upgradeFile.value = [];
//   } catch {
//     ElMessage.error("升级失败");
//   } finally {
//     upgradeUploading.value = false;
//   }
// }

// --- 展示单个二维码 ---
async function handleQrcodeShow(row: Device) {
  qrcodeMode.value = 1; // 展示模式
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

// --- 下载单个二维码 ---
async function handleQrcodeDownload(row: Device) {
  try {
    const blob = await downOneDeviceQrcodeFileApi(row.deviceId);

    // 获取 Blob 数据
    const blobData = blob.data || blob;

    // 获取文件名
    let downloadName = `qrcode_${row.deviceNo}.zip`;
    const contentDisposition = blob.headers?.["content-disposition"];
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(
        /filename\*?=['"]?(?:UTF-8'')?([^"';]+)['"]?/i
      );
      if (fileNameMatch && fileNameMatch[1]) {
        downloadName = decodeURIComponent(fileNameMatch[1]);
      }
    }

    // 执行下载
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
    ElMessage.error("下载失败");
  }
}

// --- 批量展示二维码 ---
async function handleBatchQrcodeShow() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning("请先选择设备");
    return;
  }

  qrcodeMode.value = 1; // 展示模式
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

// --- 批量下载二维码 ---
async function handleBatchQrcodeDownload() {
  if (selectedIds.value.length === 0) {
    ElMessage.warning("请先选择设备");
    return;
  }

  try {
    const blob = await batchDownDeviceQrcodeFileApi(selectedIds.value);

    const blobData = blob.data || blob;

    // 获取文件名
    let downloadName = `qrcodes_${Date.now()}.zip`;
    const contentDisposition = blob.headers?.["content-disposition"];
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(
        /filename\*?=['"]?(?:UTF-8'')?([^"';]+)['"]?/i
      );
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
    case "restart": {
      // 确认重启
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

// 批量操作
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
  resetForm();
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
  // 先进行表单校验
  if (!formRef.value) return;

  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) {
      ElMessage.warning("请完善表单信息");
      return;
    }

    // 原有的校验逻辑可以简化，因为 rules 已经覆盖了
    // if (!formData.value.deviceName?.trim()) { ... } 这些可以删掉

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
  });
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
  queryParams.qrCode = undefined;
  queryParams.pageNo = 1;
  queryParams.pageSize = 10;
  loadData();
}

// 重置表单
function resetForm() {
  if (formRef.value) {
    formRef.value.resetFields();
  }
  // 清空自定义字段
  formData.value = {
    status: 0,
    deviceBrand: undefined,
    deviceHatchType: undefined,
    isVirtualHatch: 0,
    lockType: 0,
    compressor: 0,
    volume: 50,
    devicePackageId: undefined,
    deviceConfigId: undefined,
    qrCode: undefined,
  };
  location.value = null;
  areaCodes.value = "";
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
      <el-form
        :inline="true"
        :model="queryParams"
        class="flex flex-wrap gap-x-2 gap-y-2 items-center"
      >
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
          <el-input
            v-model="queryParams.deviceName"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">设备名称:</span>
            </template>
          </el-input>
        </el-form-item>

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
            v-model="queryParams.qrCode"
            placeholder="请输入"
            clearable
            style="width: 200px"
            @keyup.enter="handleQuery"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">面贴编号:</span>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item class="!mb-0 !mr-2">
          <el-select
            v-model="queryParams.onlineStatus"
            clearable
            style="width: 200px"
          >
            <template #prefix>
              <span class="text-xs text-gray-400 mr-0.5">在线状态:</span>
            </template>
            <el-option
              v-for="item in onlineStatusOptions"
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
          <el-button type="primary" :icon="Plus" @click="handleAdd">
            新增设备
          </el-button>
          <ExportButton
            :module-code="ModuleCodeMap.DEVICE"
            :fields="visibleColumns"
            :find-cond="queryParams"
          />
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
            :storage-key="DEVICE_STORAGE_KEY"
            :default-columns="defaultDeviceColumns"
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
            <!-- 设备类型 -->
            <template v-if="col.key === 'deviceHatchType'">
              {{ getHatchTypeText(row.deviceHatchType) }}
            </template>
            <!-- 在线状态 -->
            <template v-else-if="col.key === 'onlineStatus'">
              <el-tag
                :type="getOnlineStatusType(row.onlineStatus)"
                size="small"
              >
                {{ getOnlineStatusText(row.onlineStatus) }}
              </el-tag>
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
            <!-- 面贴编号 -->
            <template v-else-if="col.key === 'qrCode'">
              <div class="flex items-center justify-center gap-1">
                <span>{{ row.qrCode || "-" }}</span>
                <el-icon
                  v-if="row.qrCode"
                  class="cursor-pointer text-primary hover:text-primary-dark"
                  title="查看二维码"
                  @click.stop="handleQrcodeShow(row)"
                >
                  <Picture />
                </el-icon>
              </div>
            </template>
            <!-- 有无屏幕 -->
            <template v-else-if="col.key === 'screenFlag'">
              <DictTag :options="device_screen" :value="row.screenFlag" />
            </template>
            <!-- 普通字段 -->
            <template v-else>
              {{ (row as any)[col.key] ?? '-' }}
            </template>
          </template>
        </el-table-column>

        <!-- 操作列固定写死 -->
        <el-table-column label="操作" width="400" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
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
                <el-button link type="primary" class="dropdown-trigger-btn">
                  更多操作<el-icon class="el-icon--right">
                    <ArrowDown />
                  </el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="restart">
                      重启设备
                    </el-dropdown-item>
                    <el-dropdown-item command="operation">
                      设备操作
                    </el-dropdown-item>
                    <el-dropdown-item command="ipPort">
                      切换IP端口
                    </el-dropdown-item>
                    <el-dropdown-item command="upgrade">
                      设备升级
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
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

    <!-- 导出字段选择组件 -->
    <!-- <ExportFieldSelector
      v-model:visible="exportFieldVisible"
      :fields="exportFields"
      :loading="exporting"
      @confirm="handleExportConfirm"
    /> -->

    <!-- 新增/编辑弹窗（带地图） -->
    <el-dialog
      v-model="formVisible"
      :title="formTitle"
      width="1600px"
      append-to-body
      @close="resetForm"
    >
      <el-row :gutter="20">
        <!-- 左侧：表单区域 -->
        <el-col :span="10">
          <el-form
            :model="formData"
            label-width="110px"
            label-position="right"
            ref="formRef"
            :rules="formRules"
          >
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="设备名称" prop="deviceName" required>
                  <el-input
                    v-model="formData.deviceName"
                    placeholder="请输入设备名称"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="设备编号" prop="deviceNo" required>
                  <el-input
                    v-model="formData.deviceNo"
                    placeholder="请输入设备编号"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="设备品牌" prop="deviceBrand" required>
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
              </el-col>
              <el-col :span="12">
                <el-form-item label="设备类型" prop="deviceHatchType" required>
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
                <el-form-item label="所属部门" prop="deptId" required>
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
                    placeholder="请选择所属部门"
                    clearable
                    check-strictly
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="设备配置" prop="deviceConfigId" required>
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
                <el-form-item label="设备套餐" prop="devicePackageId" required>
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
                <el-form-item label="面贴编号" prop="qrCode" required>
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
                      :key="item"
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
          {{ detailData.deviceBrand }}
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
          <el-input
            v-model="upgradeFileUrl"
            placeholder="请输入升级文件下载地址"
            clearable
          />

          <UploadFile
            v-model="upgradeFile"
            :limit="1"
            :file-size="200"
            :file-type="['bin', 'zip', 'hex']"
            @success="handleUploadSuccess"
          />
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
      width="900px"
      append-to-body
      class="rounded-xl"
    >
      <div v-loading="qrcodeLoading" class="min-height-[400px]">
        <el-scrollbar max-height="550px" always>
          <div v-if="qrcodeList.length === 0 && !qrcodeLoading" class="py-12">
            <el-empty description="暂无二维码数据" />
          </div>

          <!-- 优化后的网格列表 -->
          <div
            v-else
            class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2"
          >
            <div
              v-for="(item, index) in qrcodeList"
              :key="item"
              class="group relative bg-gray-50 dark:bg-zinc-800/50 rounded-lg p-3 border border-gray-100 dark:border-zinc-700 transition-all hover:shadow-md hover:border-primary/30"
            >
              <!-- 编号标签 -->
              <div class="mb-2">
                <div
                  class="text-[11px] text-gray-400 uppercase tracking-wider mb-1"
                >
                  QR Code No.
                </div>
                <div
                  class="text-xs font-mono font-bold text-gray-700 dark:text-gray-200 truncate"
                  :title="item.qrcodeCode"
                >
                  {{ item.qrcodeCode }}
                </div>
              </div>

              <!-- 二维码图片展示区 -->
              <div
                class="relative aspect-square bg-white rounded-md overflow-hidden border border-gray-200 shadow-inner group-hover:border-primary/20"
              >
                <el-image
                  :src="item.base64QrCode || item.qrcodeUrl"
                  fit="contain"
                  class="w-full h-full p-2"
                  :preview-src-list="
                    qrcodeList.map((i) => i.base64QrCode || i.qrcodeUrl)
                  "
                  :initial-index="index"
                  preview-teleported
                >
                  <template #placeholder>
                    <div
                      class="flex items-center justify-center h-full bg-gray-50 text-gray-400"
                    >
                      <el-icon class="is-loading"><Loading /></el-icon>
                    </div>
                  </template>
                </el-image>

                <!-- 悬停提示遮罩 -->
                <div
                  class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
                >
                  <el-icon color="white" :size="24"><View /></el-icon>
                </div>
              </div>

              <!-- 底部下载按钮 -->
              <div class="mt-3">
                <el-button
                  type="primary"
                  plain
                  size="small"
                  class="w-full !rounded-md"
                  :icon="Download"
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
          <el-button @click="qrcodeVisible = false" class="!rounded-md">
            关闭
          </el-button>
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
  gap: 4px; // 控制按钮间距
  align-items: center;
  justify-content: center;

  .el-button {
    margin-right: 0;
    margin-left: 0; // 移除默认左边距
  }

  .dropdown-trigger-btn {
    padding: 8px 12px;
    margin: 0;
  }
}

/* 核心：强行往树选择器内部塞入前缀文字 */
.tree-prefix-dept :deep(.el-select__wrapper) {
  position: relative;
  padding-left: 45px !important; /* 留出空间给“部门:”字样 */
}

.tree-prefix-dept :deep(.el-select__wrapper)::before {
  position: absolute;
  top: 50%;
  left: 12px;
  font-size: 12px;
  font-weight: 400;
  color: #909399; /* 浅灰色，保持全系统一致 */
  pointer-events: none; /* 防止遮挡鼠标点击事件 */
  content: "部门:";
  transform: translateY(-50%);
}
</style>
