// api/device/deviceFault.ts
import { requestClient } from '#/api/request';

/** 设备故障类型定义 */
export interface DeviceFault {
  deviceFaultId: number;
  merchantId: number;
  deviceId: number;
  hatchId: number;
  hatchNo: number;
  deviceNo: string;
  faultCode: string;
  faultName: string;
  faultRemark: string;
  startTime: string;
  endTime: string;
  duration: number;
  faultStatus: number; // 0=故障中 1=已恢复 2=已处理
  dealUserId: number;
  dealUserName: string;
  dealRemark: string;
}

/** 设备故障分页参数 */
export interface DeviceFaultPageParams {
  pageNo: number;
  pageSize: number;
  deviceFaultId?: number;
  merchantId?: number;
  deviceId?: number;
  hatchId?: number;
  hatchNo?: number;
  deviceNo?: string;
  faultCode?: string;
  faultName?: string;
  faultRemark?: string;
  startTime?: string;
  endTime?: string;
  faultStatus?: number;
  dealUserId?: number;
  dealUserName?: string;
}

/** 1. 分页查询设备故障 */
export function getDeviceFaultPageApi(params: DeviceFaultPageParams) {
  return requestClient.get('/merchant/deviceFault/page', { params });
}

/** 2. 列表查询设备故障 */
export function getDeviceFaultListApi(params?: any) {
  return requestClient.get('/merchant/deviceFault/list', { params });
}

/** 3. 设备故障详情 */
export function getDeviceFaultDetailApi(deviceFaultId: number) {
  return requestClient.get('/merchant/deviceFault/detail', { params: { deviceFaultId } });
}

/** 4. 修改设备故障 */
export function editDeviceFaultApi(data: Partial<DeviceFault>) {
  return requestClient.post('/merchant/deviceFault/edit', data);
}

/** 5. 删除设备故障 */
export function deleteDeviceFaultApi(deviceFaultId: number) {
  return requestClient.post('/merchant/deviceFault/delete', { deviceFaultId });
}
