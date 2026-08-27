import { requestClient } from '#/api/request';

// 菜单类型定义
export interface Menu {
  menuId: number;
  parentId: number;
  menuName: string;
  menuType: number; // 0=目录,1=菜单,2=按钮
  platformType: number; // 0=平台菜单,1=商户菜单
  path: string;
  component: string;
  code: string;
  sort: number;
  status: number; // 0=启用,1=禁用
  children?: Menu[];
}

// 分页查询参数
export interface MenuPageParams {
  pageNo: number;
  pageSize: number;
  menuId?: number;
  parentId?: number;
  menuName?: string;
  menuType?: number;
  platformType?: number;
  path?: string;
  component?: string;
  code?: string;
  sort?: number;
  status?: number;
}

// 平台下商户菜单类型定义
export interface MerchantMenu {
  /** 主键ID */
  merchantMenuId?: number;
  /** 商户ID */
  merchantId?: number;
  /** 系统菜单ID */
  menuId?: number;
  /** 状态: 0=启用,1=禁用 */
  status?: number;
}

// 平台下商户菜单列表查询参数
export interface MerchantMenuListParams {
  pageNo?: number;
  pageSize?: number;
  merchantMenuId?: number;
  merchantId?: number;
  menuIds?: number[];
}


// 分页响应数据
export interface MenuPageResult {
  records: Menu[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

/**
 * 平台分页查询菜单
 */
export function getPlatMenuPageApi(params: MenuPageParams) {
  return requestClient.get('/plat/menu/page', { params });
}

/**
 * 列表查询菜单（通常用于树形结构）
 */
export function getPlatMenuListApi(params?: Partial<MenuPageParams>) {
  return requestClient.get('/plat/menu/list', { params });
}

/**
 * 查询菜单详情
 */
export function getPlatMenuDetailApi(menuId: number) {
  return requestClient.get('/plat/menu/detail', { params: { menuId } });
}

/**
 * 新增菜单
 */
export function addPlatMenuApi(data: Partial<Menu>) {
  return requestClient.post('/plat/menu/add', data);
}

/**
 * 修改菜单
 */
export function editPlatMenuApi(data: Partial<Menu>) {
  return requestClient.post('/plat/menu/edit', data);
}

/**
 * 逻辑删除菜单
 */
export function deletePlatMenuApi(menuId: number) {
  return requestClient.post('/plat/menu/delete', { menuId });
}


/**
 * 平台下的商户列表查询商户菜单
 */
export function getPlatMerchantMenuListApi(params?: MerchantMenuListParams) {
  return requestClient.get('/plat/merchantMenu/list', { params });
}

/**
 * 添加商户菜单
 * @param data.merchantId 商户ID
 * @param data.menuIds 系统菜单IDs数组
 */
export function addPlatMerchantMenuApi(data: { merchantId: number; menuIds: number[] }) {
  return requestClient.post('/plat/merchantMenu/add', data);
}

/**
 * 修改商户菜单
 * @param data.merchantMenuId 主键ID
 * @param data.merchantId 商户ID
 * @param data.menuIds 系统菜单IDs数组
 */
export function editPlatMerchantMenuApi(data: { merchantMenuId: number; merchantId: number; menuIds: number[] }) {
  return requestClient.post('/plat/merchantMenu/edit', data);
}


//通用接口

/**
 * 刷新菜单缓存
 */
export function refreshMenuCacheApi() {
  return requestClient.post('/common/menuCache/refresh');
}

/**
 * 清除菜单缓存
 */
export function clearMenuCacheApi() {
  return requestClient.delete('/common/menuCache/clear');
}

/**
 * 商户分页查询菜单
 */
export function getMerchantMenuPageApi(params: MenuPageParams) {
  return requestClient.get('/merchant/menu/page', { params });
}

/**
 * 列表查询菜单（通常用于树形结构）
 */
export function getMerchantMenuListApi(params?: Partial<MenuPageParams>) {
  return requestClient.get('/merchant/menu/list', { params });
}

/**
 * 查询菜单详情
 */
export function getMerchantMenuDetailApi(menuId: number) {
  return requestClient.get('/merchant/menu/detail', { params: { menuId } });
}

/**
 * 新增菜单
 */
export function addMerchantMenuApi(data: Partial<Menu>) {
  return requestClient.post('/merchant/menu/add', data);
}

/**
 * 修改菜单
 */
export function editMerchantMenuApi(data: Partial<Menu>) {
  return requestClient.post('/merchant/menu/edit', data);
}

/**
 * 逻辑删除菜单
 */
export function deleteMerchantMenuApi(menuId: number) {
  return requestClient.post('/merchant/menu/delete', { menuId });
}

