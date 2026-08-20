// constants/tableColumns/stock.ts
import type { TableColumnConfig } from './types';

// ========== 仓库管理 ==========
export const WAREHOUSE_STORAGE_KEY = 'warehouse_table_columns';

export const defaultWarehouseColumns: TableColumnConfig[] = [
  // { key: 'warehouseId', label: '仓库ID', visible: true, width: 80, align: 'center' },
  { key: 'warehouseName', label: '仓库名称', visible: true, minWidth: 180, align: 'start', fixed: 'left', showOverflowTooltip: true },
  { key: 'warehouseType', label: '仓库类型', visible: true, width: 120, align: 'center' },
  { key: 'contact', label: '联系人', visible: true, width: 120, align: 'center' },
  { key: 'phone', label: '联系电话', visible: true, width: 140, align: 'center' },
  { key: 'address', label: '地址', visible: true, minWidth: 200, align: 'center', showOverflowTooltip: true },
  // { key: 'merchantId', label: '所属商户ID', visible: false, width: 100, align: 'center' },
  { key: 'status', label: '状态', visible: true, width: 100, align: 'center' },
  // { key: 'createTime', label: '创建时间', visible: false, width: 160, align: 'center' },
];

// ========== 客户/回收商管理 ==========
export const CUSTOMER_STORAGE_KEY = 'customer_table_columns';

export const defaultCustomerColumns: TableColumnConfig[] = [
  // { key: 'customerId', label: '回收商ID', visible: true, width: 80, align: 'center' },
  { key: 'customerName', label: '回收商名称', visible: true, minWidth: 180, align: 'start', fixed: 'left', showOverflowTooltip: true },
  { key: 'contact', label: '联系人', visible: true, width: 120, align: 'center' },
  { key: 'phone', label: '电话', visible: true, width: 140, align: 'center' },
  { key: 'address', label: '地址', visible: true, minWidth: 200, align: 'center', showOverflowTooltip: true },
  // { key: 'merchantId', label: '所属商户ID', visible: false, width: 100, align: 'center' },
  { key: 'status', label: '状态', visible: true, width: 100, align: 'center' },
];

// ========== 入库管理 ==========
export const STOCK_IN_STORAGE_KEY = 'stock_in_table_columns';

export const defaultStockInColumns: TableColumnConfig[] = [
  // { key: 'stockInId', label: '入库单ID', visible: false, width: 80, align: 'center' },
  { key: 'inNo', label: '入库单号', visible: true, minWidth: 180, align: 'start', fixed: 'left', showOverflowTooltip: true },
  { key: 'warehouseName', label: '仓库名称', visible: true, width: 150, align: 'center' },
  { key: 'totalWeight', label: '总重量(kg)', visible: true, width: 130, align: 'center' },
  { key: 'totalCostAmount', label: '总成本(元)', visible: true, width: 130, align: 'center' },
  { key: 'inStatus', label: '入库状态', visible: true, width: 120, align: 'center' },
  { key: 'operateUserName', label: '操作人', visible: true, width: 120, align: 'center' },
  { key: 'finishTime', label: '完成时间', visible: true, width: 160, align: 'center' },
  { key: 'remark', label: '备注', visible: false, minWidth: 150, align: 'center', showOverflowTooltip: true },
];

// ========== 出库管理 ==========
export const STOCK_OUT_STORAGE_KEY = 'stock_out_table_columns';

export const defaultStockOutColumns: TableColumnConfig[] = [
  // { key: 'stockOutId', label: '出库单ID', visible: false, width: 80, align: 'center' },
  { key: 'outNo', label: '出库单号', visible: true, minWidth: 180, align: 'start', fixed: 'left', showOverflowTooltip: true },
  { key: 'warehouseName', label: '仓库名称', visible: true, width: 150, align: 'center' },
  { key: 'customerName', label: '回收商名称', visible: true, width: 150, align: 'center' },
  { key: 'totalOutWeight', label: '总重量(kg)', visible: true, width: 130, align: 'center' },
  { key: 'totalSaleAmount', label: '销售总金额(元)', visible: true, width: 140, align: 'center' },
  { key: 'outStatus', label: '出库状态', visible: true, width: 120, align: 'center' },
  { key: 'operateUserName', label: '操作人', visible: true, width: 120, align: 'center' },
  { key: 'outTime', label: '出库时间', visible: true, width: 160, align: 'center' },
  { key: 'remark', label: '备注', visible: false, minWidth: 150, align: 'center', showOverflowTooltip: true },
];

// ========== 库存查询 ==========
export const STOCK_CURRENT_STORAGE_KEY = 'stock_current_table_columns';

export const defaultStockCurrentColumns: TableColumnConfig[] = [
  // { key: 'stockId', label: '库存ID', visible: false, width: 80, align: 'center' },
  { key: 'warehouseName', label: '仓库名称', visible: true, width: 150, align: 'center' },
  { key: 'locationName', label: '货位名称', visible: true, width: 150, align: 'center' },
  { key: 'packageType', label: '品类', visible: true, width: 120, align: 'center' },
  { key: 'stockWeight', label: '库存重量(kg)', visible: true, width: 140, align: 'center' },
  { key: 'lockedWeight', label: '锁定重量(kg)', visible: true, width: 130, align: 'center' },
  { key: 'stockCostAmount', label: '库存成本(元)', visible: true, width: 140, align: 'center' },
  { key: 'lastInTime', label: '最近入库时间', visible: true, width: 160, align: 'center' },
];

// ========== 库存盘点 ==========
export const STOCK_CHECK_STORAGE_KEY = 'stock_check_table_columns';

export const defaultStockCheckColumns: TableColumnConfig[] = [
  // { key: 'stockCheckId', label: '盘点ID', visible: false, width: 80, align: 'center' },
  { key: 'checkNo', label: '盘点单号', visible: true, minWidth: 180, align: 'start', fixed: 'left', showOverflowTooltip: true },
  { key: 'warehouseName', label: '仓库名称', visible: true, width: 150, align: 'center' },
  { key: 'checkType', label: '盘点类型', visible: true, width: 120, align: 'center' },
  { key: 'checkStatus', label: '盘点状态', visible: true, width: 120, align: 'center' },
  { key: 'totalProfitWeight', label: '盘盈总重(kg)', visible: true, width: 140, align: 'center' },
  { key: 'totalLossWeight', label: '盘亏总重(kg)', visible: true, width: 140, align: 'center' },
  { key: 'checkUserName', label: '盘点人', visible: true, width: 120, align: 'center' },
  { key: 'checkTime', label: '盘点时间', visible: true, width: 160, align: 'center' },
  { key: 'remark', label: '备注', visible: false, minWidth: 150, align: 'center', showOverflowTooltip: true },
];
