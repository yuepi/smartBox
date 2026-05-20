import { requestClient } from "#/api/request";

// 角色菜单类型定义
export interface RoleMenu {
  /** 主键ID */
  roleMenuId?: number;
  /** 角色ID */
  roleId?: number;
  /** 商户菜单ID */
  merchantMenuId?: number;
  /** 商户ID */
  merchantId?: number;
}

// 分页查询参数
export interface RoleMenuPageParams {
  pageNo: number;
  pageSize: number;
  roleMenuId?: number;
  roleId?: number;
  merchantMenuId?: number;
  merchantId?: number;
}

// 分页响应数据
export interface RoleMenuPageResult {
  records: RoleMenu[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

/**
 * 分页查询角色菜单
 */
export function getRoleMenuPageApi(params: RoleMenuPageParams) {
  return requestClient.get("/merchant/roleMenu/page", { params });
}

/**
 * 列表查询角色菜单
 */
export function getRoleMenuListApi(params?: Partial<RoleMenuPageParams>) {
  return requestClient.get("/merchant/roleMenu/list", { params });
}

/**
 * 查询角色菜单详情
 */
export function getRoleMenuDetailApi(roleMenuId: number) {
  return requestClient.get("/merchant/roleMenu/detail", { params: { roleMenuId } });
}

/**
 * 新增角色菜单
 */
export function addRoleMenuApi(data: Partial<RoleMenu>) {
  return requestClient.post("/merchant/roleMenu/add", data);
}

/**
 * 修改角色菜单
 */
export function editRoleMenuApi(data: Partial<RoleMenu>) {
  return requestClient.post("/merchant/roleMenu/edit", data);
}

/**
 * 逻辑删除角色菜单
 */
export function deleteRoleMenuApi(roleMenuId: number) {
  return requestClient.post("/merchant/roleMenu/delete", { roleMenuId });
}

