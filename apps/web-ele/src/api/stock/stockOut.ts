import type { StockOutItem } from './stockOutItem';

import { requestClient } from '#/api/request';

// ===== 类型定义 =====
export interface StockOut {
  stockOutId: number;
  outNo: string;
  merchantId: number;
  warehouseId: number;
  customerId: number;
  vehicleNo: string;
  receiverName: string;
  totalOutWeight: number;
  totalSaleAmount: number;
  outStatus: number; // 0=待出库,1=已出库,2=取消
  operateUserId: number;
  operateUserName: string;
  outTime: string;
  remark: string;
  items?: StockOutItem[];
}

export interface StockOutPageParams {
  pageNo: number;
  pageSize: number;
  stockOutId?: number;
  outNo?: string;
  merchantId?: number;
  warehouseId?: number;
  customerId?: number;
  vehicleNo?: string;
  receiverName?: string;
  totalOutWeight?: number;
  totalSaleAmount?: number;
  outStatus?: number;
  operateUserId?: number;
  operateUserName?: string;
  outTime?: string;
  remark?: string;
}

export interface StockOutSubmitParams {
  stockOutId: number;
}

export interface StockOutCancelParams {
  stockOutId: number;
}

// ===== API =====

/** 分页查询出库单列表 */
export function getStockOutPageApi(params: StockOutPageParams) {
  return requestClient.get<{ records: StockOut[]; total: number }>(
    '/merchant/stockOut/page',
    { params },
  );
}

/** 列表查询出库单 */
export function getStockOutListApi(params?: Partial<StockOutPageParams>) {
  return requestClient.get<StockOut[]>('/merchant/stockOut/list', { params });
}

/** 新增出库单（含明细） */
export function addStockOutApi(data: Partial<StockOut>) {
  return requestClient.post<boolean>('/merchant/stockOut/add', data);
}

/** 修改出库单（含明细） */
export function editStockOutApi(data: Partial<StockOut>) {
  return requestClient.post<boolean>('/merchant/stockOut/edit', data);
}

/** 提交出库（状态变为已出库） */
export function submitStockOutApi(data: StockOutSubmitParams) {
  return requestClient.post<boolean>('/merchant/stockOut/submitOutbound', data);
}

/** 取消出库 */
export function cancelStockOutApi(data: StockOutCancelParams) {
  return requestClient.post<boolean>('/merchant/stockOut/cancelOutbound', data);
}

/** 出库单详情 */
export function getStockOutDetailApi(stockOutId: number) {
  return requestClient.get<StockOut>('/merchant/stockOut/detail', {
    params: { stockOutId },
  });
}

/** 删除出库单 */
export function deleteStockOutApi(stockOutId: number) {
  return requestClient.post<boolean>('/merchant/stockOut/delete', {
    stockOutId,
  });
}
