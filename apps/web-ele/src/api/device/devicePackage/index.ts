import { requestClient } from '#/api/request';

/** 计费套餐类型定义 */
export interface DevicePackage {
  devicePackageId: number;
  packageName: string;
  packageType: number; // 计费类型:0=混合 1=织物 2=金属 3=塑料
  unitPrice: number; // 回收单价(元/kg)
  status: number; // 0=启用 1=禁用
}

/** 计费套餐分页参数 */
export interface DevicePackagePageParams {
  pageNo: number;
  pageSize: number;
  packageName?: string;
  packageType?: number;
  status?: number;
}

/** 1. 分页查询计费套餐 */
export function getDevicePackagePageApi(params: DevicePackagePageParams) {
  return requestClient.get('/merchant/devicePackage/page', { params });
}

/** 2. 列表查询计费套餐 */
export function getDevicePackageListApi(params?: any) {
  return requestClient.get('/merchant/devicePackage/list', { params });
}

/** 3. 计费套餐详情 */
export function getDevicePackageDetailApi(devicePackageId: number) {
  return requestClient.get('/merchant/devicePackage/detail', { params: { devicePackageId } });
}

/** 4. 新增计费套餐 */
export function addDevicePackageApi(data: Partial<DevicePackage>) {
  return requestClient.post('/merchant/devicePackage/add', data);
}

/** 5. 修改计费套餐 */
export function editDevicePackageApi(data: Partial<DevicePackage>) {
  return requestClient.post('/merchant/devicePackage/edit', data);
}

/** 6. 删除计费套餐 */
export function deleteDevicePackageApi(devicePackageId: number) {
  return requestClient.post('/merchant/devicePackage/delete', { devicePackageId });
}


/** 仓口绑定计费标准参数 */
export interface HatchBindPackageParams {
  deviceHatchIds: number[];  // 设备仓口ids
  devicePackageId: number;   // 计费标准id
}

/** 仓口绑定计费标准分页查询参数 */
export interface HatchBindPackagePageParams {
  pageNo?: number;
  pageSize?: number;
  deviceHatchIds?: number[];
  devicePackageId?: number;
}

/** 仓口绑定关系数据 */
export interface HatchBindPackageRecord {
  deviceHatchId: number;
  deviceId: number;
  deviceNo: string;
  deviceName: string;
  hatchNo: number;
  hatchName: string;
  devicePackageId: number;
}

/** 7. 设备仓口绑定设备计费标准 */
export function hatchBindPackageApi(data: HatchBindPackageParams) {
  return requestClient.post('/merchant/devicePackage/bind/hatchBindPackage', data);
}

/** 8. 设备仓口解绑设备计费标准 */
export function hatchUnBindPackageApi(data: HatchBindPackageParams) {
  return requestClient.post('/merchant/devicePackage/unbind/hatchUnBindPackage', data);
}

/** 9. 设备仓口绑定设备计费标准-分页查询 */
export function hatchBindPackagePageApi(params: HatchBindPackagePageParams) {
  return requestClient.get('/merchant/devicePackage/bind/hatchUnBindPackagePage', { params });
}
