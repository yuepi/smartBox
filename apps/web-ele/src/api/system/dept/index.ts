import { requestClient } from '#/api/request';

// 部门类型定义
export interface Dept {
  deptId: number;
  merchantId: number;
  parentId: number;
  deptName: string;
  deptType: number; // 0=顶级部门,1=部门,2=小区
  sort: number;
  status: number; // 0=启用,1=禁用
  children?: Dept[];
}

// 分页查询参数
export interface DeptPageParams {
  pageNo: number;
  pageSize: number;
  deptId?: number;
  merchantId?: number;
  parentId?: number;
  deptName?: string;
  deptType?: number;
  sort?: number;
  status?: number;
}

// 分页响应数据
export interface DeptPageResult {
  records: Dept[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

/**
 * 平台分页查询部门
 */
export function getPlatDeptPageApi(params: DeptPageParams) {
  return requestClient.get('/plat/dept/page', { params });
}

/**
 * 列表查询部门（通常用于树形结构）
 */
export function getPlatDeptListApi(params?: Partial<DeptPageParams>) {
  return requestClient.get('/plat/dept/list', { params });
}

/**
 * 查询部门详情
 */
export function getPlatDeptDetailApi(deptId: number) {
  return requestClient.get('/plat/dept/detail', { params: { deptId } });
}

/**
 * 新增部门
 */
export function addPlatDeptApi(data: Partial<Dept>) {
  return requestClient.post('/plat/dept/add', data);
}

/**
 * 修改部门
 */
export function editPlatDeptApi(data: Partial<Dept>) {
  return requestClient.post('/plat/dept/edit', data);
}

/**
 * 逻辑删除部门
 */
export function deletePlatDeptApi(deptId: number) {
  return requestClient.post('/plat/dept/delete', { deptId });
}




/**
 * 商户分页查询部门
 */
export function getMerchantDeptPageApi(params: DeptPageParams) {
  return requestClient.get('/merchant/dept/page', { params });
}

/**
 * 列表查询部门（通常用于树形结构）
 */
export function getMerchantDeptListApi(params?: Partial<DeptPageParams>) {
  return requestClient.get('/merchant/dept/list', { params });
}

/**
 * 查询部门详情
 */
export function getMerchantDeptDetailApi(deptId: number) {
  return requestClient.get('/merchant/dept/detail', { params: { deptId } });
}

/**
 * 新增部门
 */
export function addMerchantDeptApi(data: Partial<Dept>) {
  return requestClient.post('/merchant/dept/add', data);
}

/**
 * 修改部门
 */
export function editMerchantDeptApi(data: Partial<Dept>) {
  return requestClient.post('/merchant/dept/edit', data);
}

/**
 * 逻辑删除部门
 */
export function deleteMerchantDeptApi(deptId: number) {
  return requestClient.post('/merchant/dept/delete', { deptId });
}