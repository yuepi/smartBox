import { requestClient } from "#/api/request";

/** 设备主表类型定义 */
export interface Device {
  deviceId: number;
  deviceNo: string;
  deviceName: string;
  merchantId: number;
  deptId: number;
  deviceConfigId: number;
  provinceCode: string;
  provinceName: string;
  cityCode: string;
  cityName: string;
  districtCode: string;
  districtName: string;
  deviceAddress: string;
  detailAddress: string;
  longitude: number;
  latitude: number;
  deviceBrand: number; // 0=傻瓜环保
  deviceHatchType: number; // 0=单仓 1=双仓
  isVirtualHatch: number; // 0=否 1=单仓虚拟成双仓
  lockType: number; // 0=推杆 1=弹锁
  compressor: number; // 0=否 1=是
  compressorNum: number;
  iccid: string;
  hardwareVersion: string;
  softwareVersion: string;
  signal: number;
  volume: number;
  qrCode: string;
  logo: string;
  customerPhone: string;
  onlineStatus: number; // 0=离线 1=在线
  lastHeartTime: string;
  expireTime: string;
  status: number; // 0=启用 1=禁用
  radiusKm: number; // 服务半径，单位为公里
  devicePackageId: number; // 设备套餐id
}

/** 设备分页参数 */
export interface DevicePageParams {
  pageNo: number;
  pageSize: number;
  deviceNo?: string;
  deviceName?: string;
  merchantId?: number;
  deptId?: number;
  onlineStatus?: number;
  status?: number;
  devicePackageId?: number;
  qrCode?: string;
}

/** 1. 分页查询设备 */
export function getDevicePageApi(params: DevicePageParams) {
  return requestClient.get("/merchant/device/page", { params });
}

/** 2. 列表查询设备 */
export function getDeviceListApi(params?: any) {
  return requestClient.get("/merchant/device/list", { params });
}

/** 3. 设备详情 */
export function getDeviceDetailApi(deviceId: number) {
  return requestClient.get("/merchant/device/detail", { params: { deviceId } });
}

/** 4. 新增设备 */
export function addDeviceApi(data: Partial<Device>) {
  return requestClient.post("/merchant/device/add", data);
}

/** 5. 修改设备 */
export function editDeviceApi(data: Partial<Device>) {
  return requestClient.post("/merchant/device/edit", data);
}

/** 6. 删除设备 */
export function deleteDeviceApi(deviceId: number) {
  return requestClient.post("/merchant/device/delete", { deviceId });
}

/** 设备操作类型 */
export enum DeviceOperationType {
  OPEN_HATCH = 0, // 开仓口
  CLOSE_HATCH = 1, // 关仓口
  OPEN_CLEAN_DOOR = 2, // 开清运门
  RESTART_DEVICE = 3, // 重启设备
  RESTART_SCREEN = 4, // 重启大屏
  ADJUST_VOLUME = 5, // 调节音量
}

/** 设备操作参数 */
export interface DeviceOperationParams {
  operateType: number; // 操作类型
  deviceId: number; // 设备ID
  volume?: number; // 音量（operateType=5时必填）
  deviceHatchId?: number; // 仓口ID（operateType=0/1/2时必填）
}

/** 切换IP端口参数 */
export interface ChangeIpPortParams {
  deviceId: number;
  ip: string;
  port: string;
}

/** 二维码参数 */
export interface QrcodeParams {
  merchantId?: number;
  bagQrcodeFlag: number; // 0=下载二维码图片压缩包，1=展示二维码base64
  deviceId?: number;
  deviceIds?: number[];
}

/** 二维码返回数据 */
export interface QrcodeData {
  deviceId: number;
  deviceNo: string;
  qrCode: string;
  base64QrCode: string;
  merchantId: number;
}

/** 7. 设备操作 */
export function operateDeviceApi(data: DeviceOperationParams) {
  return requestClient.post("/merchant/device/operation/operationDevice", data);
}

/** 8. 切换IP端口 */
export function changeDeviceServerIpPortApi(data: ChangeIpPortParams) {
  return requestClient.post("/merchant/device/operation/changeDeviceServerIpPort", data);
}

/** 9. 设备升级（上传文件） */
export function deviceUpgradeApi(deviceId: number, file: File,ossUrl: string) {
  const formData = new FormData();
  formData.append("deviceId", String(deviceId));
  formData.append("file", file);
  formData.append("ossUrl", ossUrl);
  return requestClient.post("/merchant/device/upgrade/deviceUpgrade", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}

/** 10.1 下载单个设备二维码（返回文件流/Blob） */
export function downOneDeviceQrcodeFileApi(deviceId: number) {
  return requestClient.post(
    '/merchant/device/one/downOneDeviceQrcode',
    { deviceId, bagQrcodeFlag: 0 },
    { responseType: 'blob' }
  );
}

/** 10.2 展示单个设备二维码（返回 JSON/Base64） */
export function downOneDeviceQrcodeJsonApi(deviceId: number) {
  return requestClient.post('/merchant/device/one/downOneDeviceQrcode', {
    deviceId,
    bagQrcodeFlag: 1,
  });
}

/** 11.1 批量下载设备二维码（返回文件流/Blob） */
export function batchDownDeviceQrcodeFileApi(deviceIds: number[]) {
  return requestClient.post(
    '/merchant/device/batch/downOneDeviceQrcode',
    { deviceIds, bagQrcodeFlag: 0 },
    { responseType: 'blob' }
  );
}

/** 11.2 批量展示设备二维码（返回 JSON/Base64） */
export function batchDownDeviceQrcodeJsonApi(deviceIds: number[]) {
  return requestClient.post('/merchant/device/batch/downOneDeviceQrcode', {
    deviceIds,
    bagQrcodeFlag: 1,
  });
}
