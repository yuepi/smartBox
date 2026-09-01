import type { StockInItem } from './stockInItem';

import { requestClient } from '#/api/request';

// ===== 类型定义 =====
export interface StockIn {
  stockInId: number;
  inNo: string;
  merchantId: number;
  warehouseId: number;
  sortTaskId: number;
  cleanTaskId: number;
  totalWeight: number;
  totalCostAmount: number;
  inStatus: number; // 0=待入库,1=已入库,2=作废
  operateUserId: number;
  operateUserName: string;
  finishTime: string;
  remark: string;
  items?: StockInItem[];
}

export interface StockInPageParams {
  pageNo: number;
  pageSize: number;
  stockInId?: number;
  inNo?: string;
  merchantId?: number;
  warehouseId?: number;
  sortTaskId?: number;
  cleanTaskId?: number;
  totalWeight?: number;
  totalCostAmount?: number;
  inStatus?: number;
  operateUserId?: number;
  operateUserName?: string;
  finishTime?: string;
  remark?: string;
}

export interface StockInSubmitParams {
  stockInId: number;
}

// ===== API =====

/** 分页查询入库单列表 */
export function getStockInPageApi(params: StockInPageParams) {
  return requestClient.get<{ records: StockIn[]; total: number }>(
    '/merchant/stockIn/page',
    { params },
  );
}

/** 列表查询入库单 */
export function getStockInListApi(params?: Partial<StockInPageParams>) {
  return requestClient.get<StockIn[]>('/merchant/stockIn/list', { params });
}

/** 新增入库单（含明细） */
export function addStockInApi(data: Partial<StockIn>) {
  return requestClient.post<boolean>('/merchant/stockIn/add', data);
}

/** 修改入库单（含明细） */
export function editStockInApi(data: Partial<StockIn>) {
  return requestClient.post<boolean>('/merchant/stockIn/edit', data);
}

/** 提交入库（状态变为已入库） */
export function submitStockInApi(data: StockInSubmitParams) {
  return requestClient.post<boolean>('/merchant/stockIn/submitInbound', data);
}

/** 提交入库单（可能是不同接口，看文档有/submit和/submitInbound两个） */
export function submitStockInOrderApi(data: StockInSubmitParams) {
  return requestClient.post<boolean>('/merchant/stockIn/submit', data);
}

/** 入库单详情 */
export function getStockInDetailApi(stockInId: number) {
  return requestClient.get<StockIn>('/merchant/stockIn/detail', {
    params: { stockInId },
  });
}

/** 删除入库单 */
export function deleteStockInApi(stockInId: number) {
  return requestClient.post<boolean>('/merchant/stockIn/delete', { stockInId });
}
