import { requestClient } from '#/api/request';

// ===== 类型定义 =====
export interface StockCheckItem {
  stockCheckItemId: number;
  stockCheckId: number;
  merchantId: number;
  locationId: number;
  packageType: number; // 0=混合,1=织物,2=金属,3=塑料,4=纸类,5=玻璃
  stockWeight: number; // 账面重量
  realWeight: number; // 实际重量
  profitWeight: number; // 盘盈
  lossWeight: number; // 盘亏
  reason: string;
  evidenceUrl: string;
}

export interface StockCheckItemPageParams {
  pageNo: number;
  pageSize: number;
  stockCheckItemId?: number;
  stockCheckId?: number;
  merchantId?: number;
  locationId?: number;
  packageType?: number;
  stockWeight?: number;
  realWeight?: number;
  profitWeight?: number;
  lossWeight?: number;
  reason?: string;
  evidenceUrl?: string;
}

// ===== API =====

/** 分页查询盘点明细列表 */
export function getStockCheckItemPageApi(params: StockCheckItemPageParams) {
  return requestClient.get<{ records: StockCheckItem[]; total: number }>(
    '/merchant/stockCheckItem/page',
    { params }
  );
}

/** 列表查询盘点明细 */
export function getStockCheckItemListApi(params?: Partial<StockCheckItemPageParams>) {
  return requestClient.get<StockCheckItem[]>('/merchant/stockCheckItem/list', { params });
}

/** 新增盘点明细 */
export function addStockCheckItemApi(data: Partial<StockCheckItem>) {
  return requestClient.post<boolean>('/merchant/stockCheckItem/add', data);
}

/** 修改盘点明细 */
export function editStockCheckItemApi(data: Partial<StockCheckItem>) {
  return requestClient.post<boolean>('/merchant/stockCheckItem/edit', data);
}

/** 盘点明细详情 */
export function getStockCheckItemDetailApi(stockCheckItemId: number) {
  return requestClient.get<StockCheckItem>('/merchant/stockCheckItem/detail', {
    params: { stockCheckItemId },
  });
}

/** 删除盘点明细 */
export function deleteStockCheckItemApi(stockCheckItemId: number) {
  return requestClient.post<boolean>('/merchant/stockCheckItem/delete', {
    stockCheckItemId,
  });
}
