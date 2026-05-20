import { requestClient } from '#/api/request';

/** 资金流水类型定义 */
export interface MemberWalletFlow {
  memberWalletFlowId: number;
  batchNo: string;
  merchantId: number;
  memberId: number;
  memberName?: string;  // 扩展字段
  flowType: number;     // 0=售卖收益入账,1=提现冻结,2=提现成功扣减,3=提现失败解冻退回
  relatedBizId: number; // 关联业务ID
  changeAmount: number; // 变动金额
  beforeBalance: number; // 变动前余额
  afterBalance: number;  // 变动后余额
  remark: string;
  createTime?: string;
}

/** 流水类型枚举 */
export const FlowTypeMap: Record<number, { label: string; type: string; sign: string }> = {
  0: { label: '售卖收益入账', type: 'success', sign: '+' },
  1: { label: '提现冻结', type: 'warning', sign: '-' },
  2: { label: '提现成功扣减', type: 'danger', sign: '-' },
  3: { label: '提现失败解冻退回', type: 'info', sign: '+' },
};

/** 分页参数 */
export interface MemberWalletFlowPageParams {
  pageNo: number;
  pageSize: number;
  memberId?: number;
  memberName?: string;
  flowType?: number;
  startTime?: string;
  endTime?: string;
}

/** 1. 分页查询 */
export function getMemberWalletFlowPageApi(params: MemberWalletFlowPageParams) {
  return requestClient.get('/merchant/memberWalletFlow/page', { params });
}

/** 2. 列表查询 */
export function getMemberWalletFlowListApi(params?: any) {
  return requestClient.get('/merchant/memberWalletFlow/list', { params });
}

/** 3. 详情查询 */
export function getMemberWalletFlowDetailApi(memberWalletFlowId: number) {
  return requestClient.get('/merchant/memberWalletFlow/detail', { params: { memberWalletFlowId } });
}