import { requestClient } from '#/api/request';

/** 会员认证类型定义 */
export interface MemberAuth {
  memberAuthId: number;
  memberId: number;
  authType: number;     // 0=账号密码,1=手机号验证码,2=微信小程序
  authAccount: string;
  authSecret: string;
  status: number;       // 0=启用,1=禁用
}

/** 认证类型枚举 */
export const AuthTypeMap: Record<number, { label: string; icon: string; type: string }> = {
  0: { label: '账号密码', icon: 'User', type: 'primary' },
  1: { label: '手机号验证码', icon: 'Phone', type: 'success' },
  2: { label: '微信小程序', icon: 'Wechat', type: 'info' },
};

/** 分页参数 */
export interface MemberAuthPageParams {
  pageNo: number;
  pageSize: number;
  memberId?: number;
  authType?: number;
  authAccount?: string;
  status?: number;
}

/** 1. 分页查询 */
export function getMemberAuthPageApi(params: MemberAuthPageParams) {
  return requestClient.get('/merchant/memberAuth/page', { params });
}

/** 2. 列表查询（根据会员ID） */
export function getMemberAuthListApi(memberId: number) {
  return requestClient.get('/merchant/memberAuth/list', { params: { memberId } });
}

/** 3. 详情查询 */
export function getMemberAuthDetailApi(memberAuthId: number) {
  return requestClient.get('/merchant/memberAuth/detail', { params: { memberAuthId } });
}

/** 4. 新增认证 */
export function addMemberAuthApi(data: Partial<MemberAuth>) {
  return requestClient.post('/merchant/memberAuth/add', data);
}

/** 5. 修改认证 */
export function editMemberAuthApi(data: Partial<MemberAuth>) {
  return requestClient.post('/merchant/memberAuth/edit', data);
}

/** 6. 删除认证 */
export function deleteMemberAuthApi(memberAuthId: number) {
  return requestClient.post('/merchant/memberAuth/delete', { memberAuthId });
}