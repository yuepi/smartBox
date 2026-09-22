/**
 * 商户余额流水的固定协议枚举，与后端 MerchantAccountFlowChangeTypeEnum 对齐。
 * 不是可运营字典：4 保留旧上门回收支出，11 为清运收入；不得根据金额正负改类型。
 * 平台、商户列表共用此映射，仅用于展示和筛选，不参与余额计算。
 */
export const merchantAccountFlowOptions = [
  { label: '充值到账', value: 0, type: 'success' },
  { label: '平台服务费扣减', value: 1, type: 'danger' },
  { label: '会员提现扣款', value: 2, type: 'warning' },
  { label: '退款扣费', value: 3, type: 'danger' },
  { label: '上门回收款支付', value: 4, type: 'danger' },
  { label: '违规冲减', value: 5, type: 'danger' },
  { label: '家政服务收入', value: 6, type: 'success' },
  { label: '家政平台抽佣', value: 7, type: 'danger' },
  { label: '商户提现冻结', value: 8, type: 'warning' },
  { label: '商户提现扣款', value: 9, type: 'danger' },
  { label: '商户提现退回', value: 10, type: 'success' },
  { label: '清运收入', value: 11, type: 'success' },
] as const;

/** 接口历史空值和未知编码不得伪装成已知业务。 */
export function getMerchantAccountFlowLabel(value: number | string | null | undefined): string {
  return merchantAccountFlowOptions.find((item) => String(item.value) === String(value))?.label ?? '未知类型';
}
