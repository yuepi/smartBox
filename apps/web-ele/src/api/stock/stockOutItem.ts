import { requestClient } from '#/api/request';

// ===== 类型定义 =====
export interface StockOutItem {
  stockOutItemId: number;
  stockOutId: number;
  merchantId: number;
  packageType: number; // 0=混合,1=织物,2=金属,3=塑料,4=纸类,5=玻璃
  locationId: number;
  outWeight: number;
  saleUnitPrice: number;
  saleAmount: number;
  costAmount: number; // 后端计算
}

export interface StockOutItemPageParams {
  pageNo: number;
  pageSize: number;
  stockOutItemId?: number;
  stockOutId?: number;
  merchantId?: number;
  packageType?: number;
  locationId?: number;
  outWeight?: number;
  saleUnitPrice?: number;
  saleAmount?: number;
  costAmount?: number;
}

// ===== API =====

/** 分页查询出库明细 */
export function getStockOutItemPageApi(params: StockOutItemPageParams) {
  return requestClient.get<{ records: StockOutItem[]; total: number }>(
    '/merchant/stockOutItem/page',
    { params },
  );
}

/** 列表查询出库明细 */
export function getStockOutItemListApi(
  params?: Partial<StockOutItemPageParams>,
) {
  return requestClient.get<StockOutItem[]>('/merchant/stockOutItem/list', {
    params,
  });
}

/** 按出库单ID查询关联的出库明细 */
export function getStockOutItemListByStockOutIdApi(stockOutId: number) {
  return requestClient.get<StockOutItem[]>(
    '/merchant/stockOutItem/listByStockOutId',
    {
      params: { stockOutId },
    },
  );
}

/** 新增出库明细 */
export function addStockOutItemApi(data: Partial<StockOutItem>) {
  return requestClient.post<boolean>('/merchant/stockOutItem/add', data);
}

/** 修改出库明细 */
export function editStockOutItemApi(data: Partial<StockOutItem>) {
  return requestClient.post<boolean>('/merchant/stockOutItem/edit', data);
}

/** 出库明细详情 */
export function getStockOutItemDetailApi(stockOutItemId: number) {
  return requestClient.get<StockOutItem>('/merchant/stockOutItem/detail', {
    params: { stockOutItemId },
  });
}

/** 删除出库明细 */
export function deleteStockOutItemApi(stockOutItemId: number) {
  return requestClient.post<boolean>('/merchant/stockOutItem/delete', {
    stockOutItemId,
  });
}
