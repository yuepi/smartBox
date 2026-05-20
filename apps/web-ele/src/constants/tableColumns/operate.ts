// constants/tableColumns/operate.ts
import type { TableColumnConfig } from './types';

// ========== 回收订单 ==========
export const RECYCLE_ORDER_STORAGE_KEY = 'recycle_order_table_columns';

export const defaultRecycleOrderColumns: TableColumnConfig[] = [
  // { key: 'recycleOrderId', label: '订单ID', visible: true, width: 80, align: 'center' },
  { key: 'orderNo', label: '订单编号', visible: true, minWidth: 150, align: 'center', fixed: true, showOverflowTooltip: true },
  // { key: 'merchantId', label: '商户ID', visible: false, width: 80, align: 'center' },
  { key: 'merchantName', label: '商户名称', visible: true, width: 150, align: 'center', showOverflowTooltip: true },
  // { key: 'deptId', label: '小区ID', visible: false, width: 80, align: 'center' },
  { key: 'deptName', label: '小区名称', visible: true, minWidth: 150, align: 'center', showOverflowTooltip: true },
  { key: 'memberId', label: '会员ID', visible: false, width: 80, align: 'center' },
  { key: 'memberName', label: '会员名称', visible: true, width: 120, align: 'center' },
  { key: 'deviceId', label: '设备ID', visible: false, width: 80, align: 'center' },
  { key: 'deviceNo', label: '设备编号', visible: false, width: 120, align: 'center' },
  { key: 'deviceName', label: '设备名称', visible: true, minWidth: 150, align: 'center', showOverflowTooltip: true },
  { key: 'hatchId', label: '仓口ID', visible: false, width: 80, align: 'center' },
  { key: 'hatchNo', label: '仓口号', visible: true, width: 180, align: 'center',showOverflowTooltip: true },
  { key: 'devicePackageId', label: '计费套餐ID', visible: false, width: 100, align: 'center' },
  { key: 'devicePackageName', label: '计费套餐名称', visible: false, width: 150, align: 'center' },
  { key: 'deviceBagId', label: '包袋ID', visible: false, width: 80, align: 'center' },
  { key: 'deviceBagNo', label: '包袋编号', visible: false, width: 150, align: 'center' },
  { key: 'beforeWeight', label: '投递前重量(kg)', visible: true, width: 120, align: 'center' },
  { key: 'afterWeight', label: '投递后重量(kg)', visible: true, width: 120, align: 'center' },
  { key: 'weight', label: '投递重量(kg)', visible: true, width: 110, align: 'center' },
  { key: 'realWeight', label: '实际有效重量(kg)', visible: true, width: 120, align: 'center' },
  { key: 'unitPrice', label: '回收单价(元/kg)', visible: true, width: 120, align: 'center' },
  { key: 'estimateAmount', label: '预估金额(元)', visible: false, width: 110, align: 'center' },
  { key: 'realAmount', label: '实际金额(元)', visible: true, width: 110, align: 'center' },
  { key: 'orderStatus', label: '订单状态', visible: true, width: 120, align: 'center' },
  { key: 'payStatus', label: '支付状态', visible: true, width: 100, align: 'center' },
  { key: 'payTime', label: '支付时间', visible: false, width: 160, align: 'center' },
  { key: 'remark', label: '备注', visible: false, minWidth: 150, align: 'left', showOverflowTooltip: true },
  { key: 'status', label: '状态', visible: false, width: 80, align: 'center' },
  { key: 'createTime', label: '创建时间', visible: true, width: 160, align: 'center' },
];

// ========== 清运任务 ==========
export const CLEAN_TASK_STORAGE_KEY = 'clean_task_table_columns';

export const defaultCleanTaskColumns: TableColumnConfig[] = [
  // { key: 'cleanTaskId', label: '任务ID', visible: true, width: 80, align: 'center' },
  { key: 'taskNo', label: '清运单号', visible: true, minWidth: 180, align: 'center', fixed: true, showOverflowTooltip: true },
  // { key: 'merchantId', label: '商户ID', visible: false, width: 80, align: 'center' },
  // { key: 'deptId', label: '小区ID', visible: false, width: 80, align: 'center' },
  { key: 'deptName', label: '小区名称', visible: true, minWidth: 150, align: 'center', showOverflowTooltip: true },
  // { key: 'deviceId', label: '设备ID', visible: false, width: 80, align: 'center' },
  { key: 'deviceName', label: '设备名称', visible: true, minWidth: 150, align: 'center', showOverflowTooltip: true },
  { key: 'deviceNo', label: '设备编号', visible: false, width: 120, align: 'center' },
  { key: 'hatchId', label: '仓口ID', visible: false, width: 80, align: 'center' },
  { key: 'hatchNo', label: '仓口号', visible: true, width: 80, align: 'center' },
  { key: 'deviceBagId', label: '包袋ID', visible: false, width: 80, align: 'center' },
  { key: 'fullWeight', label: '满仓重量(kg)', visible: true, width: 110, align: 'center' },
  { key: 'cleanUserId', label: '清运人员ID', visible: false, width: 100, align: 'center' },
  { key: 'cleanUserName', label: '清运人员', visible: true, width: 120, align: 'center' },
  { key: 'taskStatus', label: '任务状态', visible: true, width: 100, align: 'center' },
  { key: 'planTime', label: '计划清运时间', visible: true, width: 160, align: 'center' },
  { key: 'finishTime', label: '完成时间', visible: false, width: 160, align: 'center' },
  { key: 'remark', label: '备注', visible: false, minWidth: 150, align: 'left', showOverflowTooltip: true },
  { key: 'status', label: '状态', visible: false, width: 80, align: 'center' },
  { key: 'createTime', label: '创建时间', visible: true, width: 160, align: 'center' },
];

// ========== 分拣任务 ==========
export const SORT_TASK_STORAGE_KEY = 'sort_task_table_columns';

export const defaultSortTaskColumns: TableColumnConfig[] = [
  // { key: 'sortTaskId', label: '任务ID', visible: true, width: 80, align: 'center' },
  { key: 'sortNo', label: '分拣单号', visible: true, minWidth: 180, align: 'center', fixed: true, showOverflowTooltip: true },
  { key: 'merchantId', label: '商户ID', visible: false, width: 80, align: 'center' },
  { key: 'cleanTaskId', label: '清运任务ID', visible: false, width: 100, align: 'center' },
  { key: 'deviceId', label: '设备ID', visible: false, width: 80, align: 'center' },
  { key: 'deviceName', label: '设备名称', visible: true, minWidth: 150, align: 'center', showOverflowTooltip: true },
  { key: 'deviceNo', label: '设备编号', visible: false, width: 120, align: 'center' },
  { key: 'hatchId', label: '仓口ID', visible: false, width: 80, align: 'center' },
  { key: 'deviceBagId', label: '包袋ID', visible: false, width: 80, align: 'center' },
  { key: 'totalWeight', label: '总重量(kg)', visible: true, width: 110, align: 'center' },
  { key: 'realWeight', label: '实际分拣重量(kg)', visible: true, width: 160, align: 'center' },
  { key: 'sortUserId', label: '分拣人员ID', visible: false, width: 100, align: 'center' },
  { key: 'sortUserName', label: '分拣人员', visible: true, width: 120, align: 'center' },
  { key: 'sortStatus', label: '分拣状态', visible: true, width: 100, align: 'center' },
  { key: 'sortTime', label: '分拣完成时间', visible: true, width: 160, align: 'center' },
  { key: 'remark', label: '备注/异常', visible: true, minWidth: 150, align: 'center', showOverflowTooltip: true },
  { key: 'status', label: '状态', visible: false, width: 80, align: 'center' },
  { key: 'createTime', label: '创建时间', visible: true, width: 160, align: 'center' },
];
