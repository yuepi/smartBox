import { requestClient } from '#/api/request';

/** 设备仓口类型定义 */
export interface DeviceHatch {
  deviceHatchId: number;
  deviceId: number;
  hatchNo: number; // 仓口编号 1/2
  hatchName: string;
  devicePackageId: number; // 绑定计费套餐ID
  currentWeight: number; // 当前重量(kg)
  weightThreshold: number; // 满仓重量阈值(kg)
  hatchStatus: number; // 仓口状态:0=未满 1=已满
  lastCleanTime: string; // 最后清运时间
  status: number; // 0=启用 1=禁用
}

/** 设备仓口分页参数 */
export interface DeviceHatchPageParams {
  pageNo: number;
  pageSize: number;
  deviceId?: number;
  hatchNo?: number;
  hatchStatus?: number;
  status?: number;
}

/** 1. 分页查询设备仓口 */
export function getDeviceHatchPageApi(params: DeviceHatchPageParams) {
  return requestClient.get('/merchant/deviceHatch/page', { params });
}

/** 2. 列表查询设备仓口 */
export function getDeviceHatchListApi(params?: any) {
  return requestClient.get('/merchant/deviceHatch/list', { params });
}

/** 3. 设备仓口详情 */
export function getDeviceHatchDetailApi(deviceHatchId: number) {
  return requestClient.get('/merchant/deviceHatch/detail', { params: { deviceHatchId } });
}

/** 4. 新增设备仓口 */
export function addDeviceHatchApi(data: Partial<DeviceHatch>) {
  return requestClient.post('/merchant/deviceHatch/add', data);
}

/** 5. 修改设备仓口 */
export function editDeviceHatchApi(data: Partial<DeviceHatch>) {
  return requestClient.post('/merchant/deviceHatch/edit', data);
}

/** 6. 删除设备仓口 */
export function deleteDeviceHatchApi(deviceHatchId: number) {
  return requestClient.post('/merchant/deviceHatch/delete', { deviceHatchId });
}


/** 设备仓口重量日志分页参数 */
export interface DeviceHatchWeightLogPageParams {
  pageNo: number;
  pageSize: number;
  deviceHatchId?: number;  // 关键：设备仓口ID
  operateType?: number;     // 操作类型: 0=去皮,1=校准,2=人工修改,3=自动同步
  tareTimeStart?: string;   // 开始时间
  tareTimeEnd?: string;     // 结束时间
}

/** 1. 分页查询设备仓口重量日志 */
export function getDeviceHatchWeightLogListApi(params: DeviceHatchWeightLogPageParams) {
  return requestClient.get('/merchant/deviceHatchWeightLog/page', { params });
}

/** 2. 设备仓口重量日志详情 */
export function getDeviceHatchWeightLogDetailApi(deviceHatchWeightLogId: number) {
  return requestClient.get('/merchant/deviceHatchWeightLog/detail', { 
    params: { deviceHatchWeightLogId } 
  });
}
