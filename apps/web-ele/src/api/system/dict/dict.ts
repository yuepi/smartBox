import { requestClient } from '#/api/request';

// 字典主表类型定义
export interface Dict {
  dictId: number;
  dictCode: string;
  dictName: string;
  status: number; // 0=启用,1=禁用
  remark: string;
}

// 分页查询参数
export interface DictPageParams {
  pageNo: number;
  pageSize: number;
  dictId?: number;
  dictCode?: string;
  dictName?: string;
  status?: number;
  remark?: string;
}

// 分页响应数据
export interface DictPageResult {
  records: Dict[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

/**
 * 分页查询字典
 */
export function getDictPageApi(params: DictPageParams) {
  return requestClient.get('/plat/dict/page', { params });
}

/**
 * 列表查询字典
 */
export function getDictListApi(params?: Partial<DictPageParams>) {
  return requestClient.get('/plat/dict/list', { params });
}

/**
 * 查询字典详情
 */
export function getDictDetailApi(dictId: number) {
  return requestClient.get('/plat/dict/detail', { params: { dictId } });
}

/**
 * 新增字典
 */
export function addDictApi(data: Partial<Dict>) {
  return requestClient.post('/plat/dict/add', data);
}

/**
 * 修改字典
 */
export function editDictApi(data: Partial<Dict>) {
  return requestClient.post('/plat/dict/edit', data);
}

/**
 * 逻辑删除字典
 */
export function deleteDictApi(dictId: number) {
  return requestClient.post('/plat/dict/delete', { dictId });
}

/**
 * 批量删除字典
 */
export function batchDeleteDictApi(ids: string) {
  return requestClient.post('/plat/dict/delete', { ids });
}