import type { TableColumnConfig } from './types';

// ========== 会员管理 ==========
export const MEMBER_STORAGE_KEY = 'member_table_columns';

export const defaultMemberColumns: TableColumnConfig[] = [
  { key: 'memberId', label: '会员ID', visible: true, width: 80, align: 'center' },
  { key: 'avatar', label: '头像', visible: true, width: 100, align: 'center' },
  { key: 'nickname', label: '昵称', visible: true, minWidth: 120, align: 'left', showOverflowTooltip: true },
  { key: 'mobile', label: '手机号', visible: true, minWidth: 130, align: 'center' },
  { key: 'sex', label: '性别', visible: true, width: 80, align: 'center' },
  { key: 'status', label: '状态', visible: true, width: 100, align: 'center' },
  { key: 'createTime', label: '注册时间', visible: false, width: 160, align: 'center' },
];

// ========== 会员提现 ==========
export const MEMBER_WITHDRAW_STORAGE_KEY = 'member_withdraw_table_columns';

export const defaultMemberWithdrawColumns: TableColumnConfig[] = [
  // { key: 'memberWithdrawId', label: '提现ID', visible: true, width: 80, align: 'center' },
  { key: 'withdrawNo', label: '提现单号', visible: true, minWidth: 180, align: 'center', showOverflowTooltip: true, fixed: true },
  { key: 'batchNo', label: '批次号', visible: false, minWidth: 180, align: 'center', showOverflowTooltip: true },
  { key: 'memberId', label: '会员ID', visible: true, width: 80, align: 'center' },
  // { key: 'merchantId', label: '商户ID', visible: false, width: 80, align: 'center' },
  { key: 'applyAmount', label: '申请金额', visible: true, width: 120, align: 'right' },
  { key: 'recentOrder', label: '近期订单', visible: true, width: 120, align: 'center' },
  { key: 'platformFee', label: '服务费', visible: true, width: 100, align: 'right' },
  { key: 'realWithdrawAmount', label: '实际到账', visible: true, width: 120, align: 'right' },
  { key: 'auditMode', label: '审核模式', visible: true, width: 120, align: 'center' },
  { key: 'auditUserName', label: '审核人', visible: true, width: 100, align: 'center' },
  { key: 'auditTime', label: '审核时间', visible: true, width: 160, align: 'center' },
  { key: 'auditReason', label: '驳回原因', visible: true, minWidth: 150, align: 'left', showOverflowTooltip: true },
  // { key: 'payRequestId', label: '支付请求ID', visible: false, minWidth: 200, align: 'center', showOverflowTooltip: true },
  { key: 'payRequestTime', label: '支付请求时间', visible: true, width: 160, align: 'center' },
  { key: 'status', label: '提现状态', visible: true, width: 100, align: 'center' },
  { key: 'createTime', label: '申请时间', visible: true, width: 160, align: 'center' },
  
];
