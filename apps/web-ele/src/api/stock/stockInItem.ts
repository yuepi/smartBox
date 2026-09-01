import { requestClient } from '#/api/request';

// ===== 类型定义 =====
export interface StockInItem {
  stockInItemId: number;
  stockInId: number;
  merchantId: number;
  packageType: number; // 0=混合,1=织物,2=金属,3=塑料,4=纸类,5=玻璃
  locationId: number;
  inWeight: number;
  costUnitPrice: number;
  costAmount: number;
}

export interface StockInItemPageParams {
  pageNo: number;
  pageSize: number;
  stockInItemId?: number;
  stockInId?: number;
  merchantId?: number;
  packageType?: number;
  locationId?: number;
  inWeight?: number;
  costUnitPrice?: number;
  costAmount?: number;
}

// ===== API =====

/** 分页查询入库明细列表 */
export function getStockInItemPageApi(params: StockInItemPageParams) {
  return requestClient.get<{ records: StockInItem[]; total: number }>(
    '/merchant/stockInItem/page',
    { params },
  );
}

/** 列表查询入库明细 */
export function getStockInItemListApi(params?: Partial<StockInItemPageParams>) {
  return requestClient.get<StockInItem[]>('/merchant/stockInItem/list', {
    params,
  });
}

/** 按入库单ID查询关联的入库明细 */
export function getStockInItemListByStockInIdApi(stockInId: number) {
  return requestClient.get<StockInItem[]>(
    '/merchant/stockInItem/listByStockInId',
    {
      params: { stockInId },
    },
  );
}

/** 新增入库明细 */
export function addStockInItemApi(data: Partial<StockInItem>) {
  return requestClient.post<boolean>('/merchant/stockInItem/add', data);
}

/** 修改入库明细 */
export function editStockInItemApi(data: Partial<StockInItem>) {
  return requestClient.post<boolean>('/merchant/stockInItem/edit', data);
}

/** 入库明细详情 */
export function getStockInItemDetailApi(stockInItemId: number) {
  return requestClient.get<StockInItem>('/merchant/stockInItem/detail', {
    params: { stockInItemId },
  });
}

/** 删除入库明细 */
export function deleteStockInItemApi(stockInItemId: number) {
  return requestClient.post<boolean>('/merchant/stockInItem/delete', {
    stockInItemId,
  });
}
