import { requestClient } from '#/api/request';

/** 提现单类型定义 */
export interface MemberWithdraw {
  memberWithdrawId: number;
  batchNo: string;
  withdrawNo: string;
  merchantId: number;
  memberId: number;
  memberName?: string;   // 扩展字段
  applyAmount: number;   // 申请提现金额
  platformFee: number;   // 平台服务费
  realWithdrawAmount: number; // 实际打款金额
  auditMode: number;     // 0=手动审核,1=自动审核
  auditUserId: number;
  auditUserName: string;
  auditTime: string;
  auditReason: string;   // 驳回原因
  payRequestId: string;
  payRequestTime: string;
  status: number;        // 0=待审核,1=提现中,2=已提现,3=提现失败,4=审核拒绝
}

/** 提现状态枚举 */
export const WithdrawStatusMap: Record<number, { label: string; type: string }> = {
  0: { label: '待审核', type: 'warning' },
  1: { label: '提现中', type: 'primary' },
  2: { label: '已提现', type: 'success' },
  3: { label: '提现失败', type: 'danger' },
  4: { label: '审核拒绝', type: 'danger' },
};

/** 审核模式枚举 */
export const AuditModeMap: Record<number, string> = {
  0: '手动审核',
  1: '自动审核',
};

/** 分页参数 */
export interface MemberWithdrawPageParams {
  pageNo: number;
  pageSize: number;
  withdrawNo?: string;
  memberId?: number;
  memberName?: string;
  status?: number;
  startTime?: string;
  endTime?: string;
}

/** 审核参数 */
export interface AuditParams {
  memberWithdrawId: number;
  status: number;        // 1=通过(提现中), 4=拒绝
  auditReason?: string;  // 拒绝时必填
}

/** 1. 分页查询 */
export function getMemberWithdrawPageApi(params: MemberWithdrawPageParams) {
  return requestClient.get('/merchant/memberWithdraw/page', { params });
}

/** 2. 列表查询 */
export function getMemberWithdrawListApi(params?: any) {
  return requestClient.get('/merchant/memberWithdraw/list', { params });
}

/** 3. 详情查询 */
export function getMemberWithdrawDetailApi(memberWithdrawId: number) {
  return requestClient.get('/merchant/memberWithdraw/detail', { params: { memberWithdrawId } });
}

/** 4. 审核提现 */
export function auditMemberWithdrawApi(data: AuditParams) {
  return requestClient.post('/merchant/memberWithdraw/edit', data);
}

/** 5. 删除提现单 */
export function deleteMemberWithdrawApi(memberWithdrawId: number) {
  return requestClient.post('/merchant/memberWithdraw/delete', { memberWithdrawId });
}

/** 6. 审核通过 */
export function auditMemberWithdrawPassApi(data: any) {
  return requestClient.post('/merchant/memberWithdraw/auditPassPay', data);
}

/** 7. 审核拒绝 */
export function auditMemberWithdrawRefuseApi(data: any) {
  return requestClient.post('/merchant/memberWithdraw/refuse', data);
}
