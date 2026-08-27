import { requestClient } from '#/api/request';

/** 会员钱包类型定义 */
export interface MemberWallet {
  memberWalletId: number;
  merchantId: number;
  memberId: number;
  memberName?: string;  // 扩展字段
  balance: number;      // 可用余额(元)
  freezeBalance: number; // 冻结余额(元)
  status: number;       // 0=正常,1=冻结
}

/** 钱包状态枚举 */
export const WalletStatusMap: Record<number, { label: string; type: string }> = {
  0: { label: '正常', type: 'success' },
  1: { label: '冻结', type: 'danger' },
};

/** 分页参数 */
export interface MemberWalletPageParams {
  pageNo: number;
  pageSize: number;
  memberId?: number;
  memberName?: string;
  status?: number;
  minBalance?: number;
  maxBalance?: number;
}

/** 1. 分页查询 */
export function getMemberWalletPageApi(params: MemberWalletPageParams) {
  return requestClient.get('/merchant/memberWallet/page', { params });
}

/** 2. 列表查询 */
export function getMemberWalletListApi(params?: any) {
  return requestClient.get('/merchant/memberWallet/list', { params });
}

/** 3. 详情查询 */
export function getMemberWalletDetailApi(memberId: number) {
  return requestClient.get('/merchant/memberWallet/detail', { params: { memberId } });
}

/** 4. 根据会员ID获取钱包 */
export function getMemberWalletByMemberApi(memberId: number) {
  return requestClient.get('/merchant/memberWallet/detail', { params: { memberId } });
}

/** 5. 冻结/解冻钱包 */
export function updateWalletStatusApi(memberWalletId: number, status: number) {
  return requestClient.post('/merchant/memberWallet/edit', { memberWalletId, status });
}
