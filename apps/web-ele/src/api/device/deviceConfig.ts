import { requestClient } from '#/api/request';

/** 设备参数配置类型定义 */
export interface DeviceConfig {
  deviceConfigId: number;
  merchantId: number;
  configName: string;
  deviceBrand: number;
  status: number;
  outLightBrightness: number;
  deliverEndTimeout: number;
  recycleEndTimeout: number;
  deliverDoorMotorTimeout: number;
  deliverDoorHandStopCount: number;
  deliverDoorHandOpenCount: number;
  fanTempMax: number;
  fanTempMin: number;
  topLightType: number;
  topLightOnTime: string;
  topLightOffTime: string;
  topLightBrightness: number;
  outLightType: number;
  outLightOnTime: string;
  outLightOffTime: string;
  normalBanners: string;
  fullBanners: string;
  maintainBanners: string;
  forbidImages: string;
  businessOpenTime: string;
  businessCloseTime: string;
  weightThreshold: number;
}

/** 设备配置分页参数 */
export interface DeviceConfigPageParams {
  pageNo: number;
  pageSize: number;
  configName?: string;
  deviceBrand?: number;
  status?: number;
  deviceConfigId?: number;
}

/** 1. 分页查询设备配置 */
export function getDeviceConfigPageApi(params: DeviceConfigPageParams) {
  return requestClient.get('/merchant/deviceConfig/page', { params });
}

/** 2. 列表查询设备配置 */
export function getDeviceConfigListApi(params?: any) {
  return requestClient.get('/merchant/deviceConfig/list', { params });
}

/** 3. 设备配置详情 */
export function getDeviceConfigDetailApi(deviceConfigId: number) {
  return requestClient.get('/merchant/deviceConfig/detail', {
    params: { deviceConfigId },
  });
}

/** 4. 新增设备配置 */
export function addDeviceConfigApi(data: Partial<DeviceConfig>) {
  return requestClient.post('/merchant/deviceConfig/add', data);
}

/** 5. 修改设备配置 */
export function editDeviceConfigApi(data: Partial<DeviceConfig>) {
  return requestClient.post('/merchant/deviceConfig/edit', data);
}

/** 6. 删除设备配置 */
export function deleteDeviceConfigApi(deviceConfigId: number) {
  return requestClient.post('/merchant/deviceConfig/delete', {
    deviceConfigId,
  });
}

/** 7. 设备绑定 */
export function deviceBindDeviceConfigApi(data: {
  deviceConfigId: number;
  deviceIds: number[];
}) {
  return requestClient.post('/merchant/deviceConfig/bind', data);
}

/** 8. 设备解绑 */
export function deviceUnBindDeviceConfigApi(data: { deviceIds: number[] }) {
  return requestClient.post('/merchant/deviceConfig/unbind', data);
}

/** 9. 设备绑定分页查询 */
export function deviceBindDeviceConfigPageApi(params: DeviceConfigPageParams) {
  return requestClient.get(
    '/merchant/deviceConfig/bind/deviceBindDeviceConfigPage',
    { params },
  );
}
