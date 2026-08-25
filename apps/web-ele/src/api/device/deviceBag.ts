import { requestClient } from '#/api/request';

/** 包袋类型定义 */
export interface DeviceBag {
  deviceBagId: number;
  bagNo: string; // 包袋编号
  bagQrCode: string; // 包袋二维码URL/内容
  merchantId: number;
  deviceId: number; // 绑定设备ID
  hatchId: number; // 绑定仓口ID
  hatchNo: number; // 绑定仓口编号
  bagStatus: number; // 包袋状态:0=未绑定,1=已绑定,2=已破损
  bindTime: string; // 绑定时间
  unbindTime: string; // 解绑时间
  remark: string;
  status: number; // 0=启用 1=禁用
}

/** 包袋分页参数 */
export interface DeviceBagPageParams {
  pageNo: number;
  pageSize: number;
  bagNo?: string;
  merchantId?: number;
  deviceId?: number;
  bagStatus?: number;
  status?: number;
}

/** 生成包袋参数 */
export interface GenerateBagParams {
  deviceBagNum: number; // 需要生成包袋的数量
}

/** 1. 分页查询包袋 */
export function getDeviceBagPageApi(params: DeviceBagPageParams) {
  return requestClient.get('/merchant/deviceBag/page', { params });
}

/** 2. 列表查询包袋 */
export function getDeviceBagListApi(params?: any) {
  return requestClient.get('/merchant/deviceBag/list', { params });
}

/** 3. 包袋详情 */
export function getDeviceBagDetailApi(deviceBagId: number) {
  return requestClient.get('/merchant/deviceBag/detail', { params: { deviceBagId } });
}

/** 4. 新增包袋 */
export function addDeviceBagApi(data: Partial<DeviceBag>) {
  return requestClient.post('/merchant/deviceBag/add', data);
}

/** 5. 修改包袋 */
export function editDeviceBagApi(data: Partial<DeviceBag>) {
  return requestClient.post('/merchant/deviceBag/edit', data);
}

/** 6. 删除包袋 */
export function deleteDeviceBagApi(deviceBagId: number) {
  return requestClient.post('/merchant/deviceBag/delete', { deviceBagId });
}

/** 7. 生成包袋（批量） */
export function generateDeviceBagApi(params: GenerateBagParams) {
  return requestClient.post('/merchant/deviceBag/add', params);
}

/** 8. 下载单个包袋二维码（返回文件流） */
export function downOneDeviceBagQrcodeFileApi(deviceBagId: number) {
  return requestClient.post('/merchant/deviceBag/one/downOneDeviceBagQrcode', 
    { deviceBagId, bagQrcodeFlag: 0 },
    { responseType: 'blob' }
  );
}

/** 8. 展示单个包袋二维码（返回JSON） */
export function downOneDeviceBagQrcodeJsonApi(deviceBagId: number) {
  return requestClient.post('/merchant/deviceBag/one/downOneDeviceBagQrcode', {
    deviceBagId,
    bagQrcodeFlag: 1,
  });
}

/** 9. 批量下载包袋二维码（返回文件流） */
export function batchDownDeviceBagQrcodeFileApi(deviceBagIds: number[]) {
  return requestClient.post('/merchant/deviceBag/batch/downOneDeviceBagQrcode',
    { deviceBagIds, bagQrcodeFlag: 0 },
    { responseType: 'blob' }
  );
}

/** 9. 批量展示包袋二维码（返回JSON） */
export function batchDownDeviceBagQrcodeJsonApi(deviceBagIds: number[]) {
  return requestClient.post('/merchant/deviceBag/batch/downOneDeviceBagQrcode', {
    deviceBagIds,
    bagQrcodeFlag: 1,
  });
}
/** 10. 包袋绑定设备仓口 */
export function bagBindDeviceHatchApi(deviceBagId: number, deviceId: number, deviceHatchId: number) {
  return requestClient.post('/merchant/deviceBag/bind/bagBindDeviceHatch', {
    deviceBagId,
    deviceId,
    deviceHatchId,
  });
}

/** 11. 包袋解绑设备仓口 */
export function bagUnBindDeviceHatchApi(deviceBagId?: number, deviceHatchId?: number) {
  return requestClient.post('/merchant/deviceBag/bind/bagUnBindDeviceHatch', {
    deviceBagId,
    deviceHatchId,
  });
}
