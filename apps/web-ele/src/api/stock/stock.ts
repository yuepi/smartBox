import { requestClient } from '#/api/request';

// ===== 类型定义 =====
export interface Stock {
  stockId: number;
  merchantId: number;
  warehouseId: number;
  locationId: number;
  packageType: number; // 0=混合,1=织物,2=金属,3=塑料,4=纸类,5=玻璃
  stockWeight: number;
  lockedWeight: number;
  stockCostAmount: number;
  lastInTime: string;
}

export interface StockPageParams {
  pageNo: number;
  pageSize: number;
  stockId?: number;
  merchantId?: number;
  warehouseId?: number;
  locationId?: number;
  packageType?: number;
  stockWeight?: number;
  lockedWeight?: number;
  stockCostAmount?: number;
  lastInTime?: string;
}

export interface StockSummaryItem {
  stockId: number;
  merchantId: number;
  warehouseId: number;
  locationId: number;
  packageType: number;
  stockWeight: number;
  lockedWeight: number;
  stockCostAmount: number;
  lastInTime: string;
}

// ===== API =====

/** 分页查询实时库存列表 */
export function getStockPageApi(params: StockPageParams) {
  return requestClient.get<{ records: Stock[]; total: number }>(
    '/merchant/stock/page',
    { params },
  );
}

/** 列表查询实时库存 */
export function getStockListApi(params?: Partial<StockPageParams>) {
  return requestClient.get<Stock[]>('/merchant/stock/list', { params });
}

/** 按仓库汇总库存 */
export function getWarehouseStockSummaryApi(warehouseId?: number) {
  return requestClient.get<StockSummaryItem[]>(
    '/merchant/stock/getWarehouseStockSummary',
    {
      params: { warehouseId },
    },
  );
}

/** 按商户与包装类型汇总库存 */
export function getPackageTypeStockSummaryApi(params?: {
  merchantId?: number;
  packageType?: number;
}) {
  return requestClient.get<StockSummaryItem[]>(
    '/merchant/stock/getPackageTypeStockSummary',
    {
      params,
    },
  );
}

/** 按维度精确查询库存 */
export function getStockByDimensionApi(params: {
  locationId?: number;
  merchantId?: number;
  packageType?: number;
  warehouseId?: number;
}) {
  return requestClient.get<Stock>('/merchant/stock/getStockByDimension', {
    params,
  });
}

/** 库存详情 */
export function getStockDetailApi(stockId: number) {
  return requestClient.get<Stock>('/merchant/stock/detail', {
    params: { stockId },
  });
}

/** 新增库存记录 */
export function addStockApi(data: Partial<Stock>) {
  return requestClient.post<boolean>('/merchant/stock/add', data);
}

/** 修改库存记录 */
export function editStockApi(data: Partial<Stock>) {
  return requestClient.post<boolean>('/merchant/stock/edit', data);
}

/** 删除库存记录 */
export function deleteStockApi(stockId: number) {
  return requestClient.post<boolean>('/merchant/stock/delete', { stockId });
}
