import { requestClient } from '#/api/request';

// ===== 类型定义 =====
export interface WarehouseLocation {
  warehouseLocationId: number;
  merchantId: number;
  warehouseId: number;
  locationCode: string;
  locationName: string;
  packageType: number; // 0=混合,1=织物,2=金属,3=塑料,4=纸类,5=玻璃
  maxWeight: number;
  status: number; // 0=启用,1=禁用
}

export interface WarehouseLocationPageParams {
  pageNo: number;
  pageSize: number;
  warehouseLocationId?: number;
  merchantId?: number;
  warehouseId?: number;
  locationCode?: string;
  locationName?: string;
  packageType?: number;
  maxWeight?: number;
  status?: number;
}

// ===== API =====

/** 分页查询货位列表 */
export function getWarehouseLocationPageApi(params: WarehouseLocationPageParams) {
  return requestClient.get<{ records: WarehouseLocation[]; total: number }>(
    '/merchant/warehouseLocation/page',
    { params }
  );
}

/** 列表查询货位（不分页） */
export function getWarehouseLocationListApi(params?: Partial<WarehouseLocationPageParams>) {
  return requestClient.get<WarehouseLocation[]>('/merchant/warehouseLocation/list', { params });
}

/** 新增货位 */
export function addWarehouseLocationApi(data: Partial<WarehouseLocation>) {
  return requestClient.post<boolean>('/merchant/warehouseLocation/add', data);
}

/** 修改货位 */
export function editWarehouseLocationApi(data: Partial<WarehouseLocation>) {
  return requestClient.post<boolean>('/merchant/warehouseLocation/edit', data);
}

/** 货位详情 */
export function getWarehouseLocationDetailApi(warehouseLocationId: number) {
  return requestClient.get<WarehouseLocation>('/merchant/warehouseLocation/detail', {
    params: { warehouseLocationId },
  });
}

/** 删除货位 */
export function deleteWarehouseLocationApi(warehouseLocationId: number) {
  return requestClient.post<boolean>('/merchant/warehouseLocation/delete', {
    warehouseLocationId,
  });
}
