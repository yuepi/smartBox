import { requestClient } from '#/api/request';

/** 会员类型定义 */
export interface Member {
  memberId: number;
  mobile: string;
  nickname: string;
  avatar: string;
  sex: number;        // 0=未知,1=男,2=女
  status: number;     // 0=启用,1=禁用,2=黑名单
}

/** 会员状态枚举 */
export const MemberStatusMap: Record<number, { label: string; type: string }> = {
  0: { label: '启用', type: 'success' },
  1: { label: '禁用', type: 'danger' },
  2: { label: '黑名单', type: 'danger' },
};

/** 性别枚举 */
export const SexMap: Record<number, string> = {
  0: '未知',
  1: '男',
  2: '女',
};

/** 分页参数 */
export interface MemberPageParams {
  pageNo: number;
  pageSize: number;
  mobile?: string;
  nickname?: string;
  sex?: number;
  status?: number;
}

/** 1. 分页查询 */
export function getMemberPageApi(params: MemberPageParams) {
  return requestClient.get('/merchant/member/page', { params });
}

/** 2. 列表查询 */
export function getMemberListApi(params?: any) {
  return requestClient.get('/merchant/member/list', { params });
}

/** 3. 详情查询 */
export function getMemberDetailApi(memberId: number) {
  return requestClient.get('/merchant/member/detail', { params: { memberId } });
}

/** 4. 新增会员 */
export function addMemberApi(data: Partial<Member>) {
  return requestClient.post('/merchant/member/add', data);
}

/** 5. 修改会员 */
export function editMemberApi(data: Partial<Member>) {
  return requestClient.post('/merchant/member/edit', data);
}

/** 6. 删除会员 */
export function deleteMemberApi(memberId: number) {
  return requestClient.post('/merchant/member/delete', { memberId });
}