import { requestClient } from '#/api/request';

/** 设备参数配置类型定义 */
export interface DeviceConfig {
  deviceConfigId: number;
  configName: string;
  deviceBrand: number; // 0=傻瓜环保
  fullWeightThreshold: number; // 满仓重量阈值(kg)
  waitTime: number; // 等待时间(秒)
  shutDoorTime: number; // 关门延时(秒)
  logoutTime: number; // 退出延时(秒)
  lightType: number; // 灯光类型:0=定时 1=感应 2=常亮
  lightStartTime: string; // 灯光开始时间 HH:mm:ss
  lightEndTime: string; // 灯光结束时间 HH:mm:ss
  status: number; // 0=启用 1=禁用
}

/** 设备配置分页参数 */
export interface DeviceConfigPageParams {
  pageNo: number;
  pageSize: number;
  configName?: string;
  deviceBrand?: number;
  status?: number;
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
  return requestClient.get('/merchant/deviceConfig/detail', { params: { deviceConfigId } });
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
  return requestClient.post('/merchant/deviceConfig/delete', { deviceConfigId });
}