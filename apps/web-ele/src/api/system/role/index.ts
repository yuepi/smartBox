import { requestClient } from '#/api/request';

// 角色类型定义
export interface Role {
  roleId: number;
  merchantId: number;
  roleName: string;
  roleCode: string;
  sort: number;
  status: number; // 0=启用,1=禁用
}

// 分页查询参数
export interface RolePageParams {
  pageNo: number;
  pageSize: number;
  roleId?: number;
  merchantId?: number;
  roleName?: string;
  roleCode?: string;
  sort?: number;
  status?: number;
}

// 分页响应数据
export interface RolePageResult {
  records: Role[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

// 通用响应结构
export interface ApiResponse<T> {
  code: number;
  message: string;
  module: string;
  data: T;
}

/**
 * 商户分页查询角色
 */
export function getMerchantRolePageApi(params: RolePageParams) {
  return requestClient.get<ApiResponse<RolePageResult>>('/merchant/role/page', { params });
}

/**
 * 列表查询角色
 */
export function getMerchantRoleListApi(params?: Partial<RolePageParams>) {
  return requestClient.get<ApiResponse<Role[]>>('/merchant/role/list', { params });
}

/**
 * 查询角色详情
 */
export function getMerchantRoleDetailApi(roleId: number) {
  return requestClient.get<ApiResponse<Role>>('/merchant/role/detail', {
    params: { roleId },
  });
}

/**
 * 新增角色
 */
export function addMerchantRoleApi(data: Partial<Role>) {
  return requestClient.post<ApiResponse<boolean>>('/merchant/role/add', data);
}

/**
 * 修改角色
 */
export function editMerchantRoleApi(data: Partial<Role>) {
  return requestClient.post<ApiResponse<boolean>>('/merchant/role/edit', data);
}

/**
 * 逻辑删除角色
 */
export function deleteMerchantRoleApi(roleId: number) {
  return requestClient.post<ApiResponse<boolean>>('/merchant/role/delete', { roleId });
}



/**
 * 平台分页查询角色
 */
export function getPlatRolePageApi(params: RolePageParams) {
  return requestClient.get<ApiResponse<RolePageResult>>('/plat/role/page', { params });
}

/**
 * 列表查询角色
 */
export function getPlatRoleListApi(params?: Partial<RolePageParams>) {
  return requestClient.get<ApiResponse<Role[]>>('/plat/role/list', { params });
}

/**
 * 查询角色详情
 */
export function getPlatRoleDetailApi(roleId: number) {
  return requestClient.get<ApiResponse<Role>>('/plat/role/detail', {
    params: { roleId },
  });
}

/**
 * 新增角色
 */
export function addPlatRoleApi(data: Partial<Role>) {
  return requestClient.post<ApiResponse<boolean>>('/plat/role/add', data);
}

/**
 * 修改角色
 */
export function editPlatRoleApi(data: Partial<Role>) {
  return requestClient.post<ApiResponse<boolean>>('/plat/role/edit', data);
}

/**
 * 逻辑删除角色
 */
export function deletePlatRoleApi(roleId: number) {
  return requestClient.post<ApiResponse<boolean>>('/plat/role/delete', { roleId });
}