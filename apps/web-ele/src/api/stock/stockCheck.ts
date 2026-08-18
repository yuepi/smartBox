import type { StockCheckItem } from './stockCheckItem';

import { requestClient } from '#/api/request';

// ===== 类型定义 =====
export interface StockCheck {
  stockCheckId: number;
  checkNo: string;
  merchantId: number;
  warehouseId: number;
  checkType: number; // 0=全盘,1=抽盘
  checkStatus: number; // 0=盘点中,1=已完成
  totalProfitWeight: number;
  totalLossWeight: number;
  checkUserId: number;
  checkUserName: string;
  checkTime: string;
  planFinishTime: string;
  reviewUserId: number;
  reviewUserName: string;
  reviewTime: string;
  reviewResult: number;
  reviewReasonCode: string;
  reviewReasonName: string;
  reviewRemark: string;
  remark: string;
  items?: StockCheckItem[];
}

export interface StockCheckPageParams {
  pageNo: number;
  pageSize: number;
  stockCheckId?: number;
  checkNo?: string;
  merchantId?: number;
  warehouseId?: number;
  checkType?: number;
  checkStatus?: number;
  totalProfitWeight?: number;
  totalLossWeight?: number;
  checkUserId?: number;
  checkUserName?: string;
  checkTime?: string;
  planFinishTime?: string;
  reviewUserId?: number;
  reviewUserName?: string;
  reviewTime?: string;
  reviewResult?: number;
  reviewReasonCode?: string;
  reviewReasonName?: string;
  reviewRemark?: string;
  remark?: string;
}

export interface StockCheckCreateParams {
  warehouseId: number;
  checkType: number; // 0=全盘,1=抽盘
  planFinishTime?: string;
  remark?: string;
  items?: Partial<StockCheckItem>[];
}

export interface StockCheckExecuteParams {
  stockCheckId: number;
  items: Array<{
    evidenceUrl?: string;
    realWeight: number;
    reason?: string;
    stockCheckItemId?: number;
  }>;
}

export interface StockCheckConfirmParams {
  stockCheckId: number;
  reviewResult?: number;
  reviewRemark?: string;
}

// ===== API =====

/** 分页查询盘点单列表 */
export function getStockCheckPageApi(params: StockCheckPageParams) {
  return requestClient.get<{ records: StockCheck[]; total: number }>(
    '/merchant/stockCheck/page',
    { params }
  );
}

/** 列表查询盘点单 */
export function getStockCheckListApi(params?: Partial<StockCheckPageParams>) {
  return requestClient.get<StockCheck[]>('/merchant/stockCheck/list', { params });
}

/** 新增盘点单（创建盘点单） */
export function addStockCheckApi(data: Partial<StockCheck>) {
  return requestClient.post<boolean>('/merchant/stockCheck/add', data);
}

/** 创建盘点单（自动生成盘点明细） */
export function createStockCheckOrderApi(data: StockCheckCreateParams) {
  return requestClient.post<boolean>('/merchant/stockCheck/createCheckOrder', data);
}

/** 执行盘点（录入实际重量） */
export function executeStockCheckApi(data: StockCheckExecuteParams) {
  return requestClient.post<boolean>('/merchant/stockCheck/executeCheck', data);
}

/** 确认盘点 */
export function confirmStockCheckApi(data: StockCheckConfirmParams) {
  return requestClient.post<boolean>('/merchant/stockCheck/confirmCheck', data);
}

/** 修改盘点单 */
export function editStockCheckApi(data: Partial<StockCheck>) {
  return requestClient.post<boolean>('/merchant/stockCheck/edit', data);
}

/** 盘点单详情 */
export function getStockCheckDetailApi(stockCheckId: number) {
  return requestClient.get<StockCheck>('/merchant/stockCheck/detail', {
    params: { stockCheckId },
  });
}

/** 删除盘点单 */
export function deleteStockCheckApi(stockCheckId: number) {
  return requestClient.post<boolean>('/merchant/stockCheck/delete', { stockCheckId });
}
