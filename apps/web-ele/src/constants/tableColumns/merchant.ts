// constants/tableColumns/merchant.ts

import type { TableColumnConfig } from './types';

// 商户充值记录
export const MERCHANT_RECHARGE_STORAGE_KEY = 'merchant_recharge_table_columns';
export const defaultMerchantRechargeColumns: TableColumnConfig[] = [
  { key: 'rechargeNo', label: '充值单号', visible: true, minWidth: 200, align: 'center', showOverflowTooltip: true },
  { key: 'amount', label: '充值金额', visible: true, width: 120, align: 'center' },
  { key: 'status', label: '支付状态', visible: true, width: 100, align: 'center' },
  { key: 'rechargeUserName', label: '充值人', visible: true, width: 120, align: 'center' },
  { key: 'payTime', label: '支付时间', visible: true, width: 160, align: 'center' },
  { key: 'refundStatus', label: '退款状态', visible: true, width: 100, align: 'center' },
  { key: 'totalRefundAmount', label: '退款金额', visible: true, width: 120, align: 'center' },
];

// 商户流水记录
export const MERCHANT_FLOW_STORAGE_KEY = 'merchant_flow_table_columns';
export const defaultMerchantFlowColumns: TableColumnConfig[] = [
  { key: 'merchantAccountFlowId', label: '流水ID', visible: true, width: 100, align: 'center' },
  { key: 'changeType', label: '变动类型', visible: true, width: 140, align: 'center' },
  { key: 'changeAmount', label: '变动金额', visible: true, width: 120, align: 'right' },
  { key: 'beforeBalance', label: '变动前余额', visible: true, width: 120, align: 'right' },
  { key: 'afterBalance', label: '变动后余额', visible: true, width: 120, align: 'right' },
  { key: 'relatedId', label: '关联业务ID', visible: true, width: 100, align: 'center' },
  { key: 'remark', label: '备注', visible: true, minWidth: 180, align: 'left', showOverflowTooltip: true },
  { key: 'createTime', label: '发生时间', visible: true, width: 160, align: 'center' },
];

// 商户管理
export const MERCHANT_STORAGE_KEY = 'merchant_table_columns';
export const defaultMerchantColumns: TableColumnConfig[] = [
  { key: 'merchantId', label: '商户ID', visible: true, width: 80, align: 'center' },
  { key: 'merchantName', label: '商户名称', visible: true, minWidth: 180, align: 'left', fixed: true, showOverflowTooltip: true },
  { key: 'merchantCode', label: '商户编码', visible: true, width: 150, align: 'center' },
  { key: 'contact', label: '联系人', visible: true, width: 120, align: 'center' },
  { key: 'phone', label: '联系电话', visible: true, width: 130, align: 'center' },
  { key: 'address', label: '地址', visible: true, minWidth: 200, align: 'center', showOverflowTooltip: true },
  { key: 'status', label: '状态', visible: true, width: 80, align: 'center' },
  { key: 'createTime', label: '创建时间', visible: false, width: 160, align: 'center' },
];
