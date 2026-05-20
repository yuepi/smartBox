import { requestClient } from '#/api/request';

// 用户角色关联
export interface UserRole {
  userMerchantId: number;
  userId: number;
  merchantId: number;
}

// 用户类型定义
export interface User {
  userId: number;
  userName: string;
  nickName: string;
  password: string;
  email: string;
  avatar: string;
  sex: number; // 0=未知,1=男,2=女
  superAdminFlag: number; // 0=否,1=是
  identify: string; // 用户身份标识: 0=普通用户,1=清运人员,2=分拣人员,3=回收员,4=设备管理员
  status: number; // 0=启用,1=禁用
  roles?: UserRole[];
}

// 分页查询参数
export interface UserPageParams {
  pageNo: number;
  pageSize: number;
  userId?: number;
  nickName?: string;
  email?: string;
  sex?: number;
  superAdminFlag?: number;
  identify?: string;
  status?: number;
  merchantId?: number;
}

// 分页响应数据
export interface UserPageResult {
  records: User[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

/**
 * 平台分页查询用户
 */
export function getPlatUserPageApi(params: UserPageParams) {
  return requestClient.get('/plat/user/page', { params });
}

/**
 * 分页查询所有商户的所有用户
 */
export function getPlatUserMerchantPageApi(params: UserPageParams) {
  return requestClient.get('/plat/user/merchant/page', { params });
}

/**
 * 列表查询用户
 */
export function getPlatUserListApi(params?: Partial<UserPageParams>) {
  return requestClient.get('/plat/user/list', { params });
}

/**
 * 查询用户详情
 */
export function getPlatUserDetailApi(userId: number) {
  return requestClient.get('/plat/user/detail', { params: { userId } });
}

/**
 * 新增用户
 */
export function addPlatUserApi(data: Partial<User>) {
  return requestClient.post('/plat/user/add', data);
}

/**
 * 修改用户
 */
export function editPlatUserApi(data: Partial<User>) {
  return requestClient.post('/plat/user/edit', data);
}

/**
 * 逻辑删除用户
 */
export function deletePlatUserApi(userId: number) {
  return requestClient.post('/plat/user/delete', { userId });
}



/**
 * 商户分页查询用户
 */
export function getMerchantUserPageApi(params: UserPageParams) {
  return requestClient.get('/merchant/user/page', { params });
}


/**
 * 列表查询用户
 */
export function getMerchantUserListApi(params?: Partial<UserPageParams>) {
  return requestClient.get('/merchant/user/list', { params });
}

/**
 * 查询用户详情
 */
export function getMerchantUserDetailApi(userId: number) {
  return requestClient.get('/merchant/user/detail', { params: { userId } });
}

/**
 * 新增用户
 */
export function addMerchantUserApi(data: Partial<User>) {
  return requestClient.post('/merchant/user/add', data);
}

/**
 * 修改用户
 */
export function editMerchantUserApi(data: Partial<User>) {
  return requestClient.post('/merchant/user/edit', data);
}

/**
 * 逻辑删除用户
 */
export function deleteMerchantUserApi(userId: number) {
  return requestClient.post('/merchant/user/delete', { userId });
}

/**
 * 修改密码
 */
export function updateUserPasswordApi(data: Partial<User>) {
  return requestClient.post('/login/uppswd', data);
}
