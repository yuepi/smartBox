import { requestClient } from '#/api/request';

// ===== 类型定义 =====
export interface Warehouse {
  warehouseId: number;
  merchantId: number;
  warehouseName: string;
  warehouseType: number; // 0=总仓库,1=分拣中心,2=临时仓库
  contact: string;
  phone: string;
  address: string;
  status: number; // 0=启用,1=禁用
}

export interface WarehousePageParams {
  pageNo: number;
  pageSize: number;
  warehouseId?: number;
  merchantId?: number;
  warehouseName?: string;
  warehouseType?: number;
  contact?: string;
  phone?: string;
  address?: string;
  status?: number;
}

// ===== API =====

/** 分页查询仓库列表 */
export function getWarehousePageApi(params: WarehousePageParams) {
  return requestClient.get<{ records: Warehouse[]; total: number }>(
    '/merchant/warehouse/page',
    { params }
  );
}

/** 列表查询仓库（不分页） */
export function getWarehouseListApi(params?: Partial<WarehousePageParams>) {
  return requestClient.get<Warehouse[]>('/merchant/warehouse/list', { params });
}

/** 新增仓库 */
export function addWarehouseApi(data: Partial<Warehouse>) {
  return requestClient.post<boolean>('/merchant/warehouse/add', data);
}

/** 修改仓库 */
export function editWarehouseApi(data: Partial<Warehouse>) {
  return requestClient.post<boolean>('/merchant/warehouse/edit', data);
}

/** 仓库详情 */
export function getWarehouseDetailApi(warehouseId: number) {
  return requestClient.get<Warehouse>('/merchant/warehouse/detail', {
    params: { warehouseId },
  });
}

/** 删除仓库 */
export function deleteWarehouseApi(warehouseId: number) {
  return requestClient.post<boolean>('/merchant/warehouse/delete', { warehouseId });
}
