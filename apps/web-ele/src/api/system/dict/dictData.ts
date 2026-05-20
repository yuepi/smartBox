import { requestClient } from '#/api/request';

// 字典明细表类型定义
export interface DictData {
  dictDataId: number;
  dictId: number;
  dictCode: string;
  itemLabel: string;
  itemValue: number;
  sort: number;
  cssClass: string;
  listClass: string;
  defaultFlag: number; // 0=否,1=是
  status: number; // 0=启用,1=禁用
  remark: string;
}

// 分页查询参数
export interface DictDataPageParams {
  pageNo: number;
  pageSize: number;
  dictDataId?: number;
  dictId?: number;
  itemLabel?: string;
  itemValue?: number;
  sort?: number;
  status?: number;
}

// 分页响应数据
export interface DictDataPageResult {
  records: DictData[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

export interface DictDataOption {
  label: string;
  value: number;
  elTagType?: 'danger' | 'info' | 'primary' | 'success' | 'warning';
  elTagClass?: string;
}


/**
 * 分页查询字典明细
 */
export function getDictDataPageApi(params: DictDataPageParams) {
  return requestClient.get('/plat/dictData/page', { params });
}

/**
 * 列表查询字典明细（根据字典ID）
 */
export function getDictDataListApi(dictId?: number) {
  return requestClient.get('/plat/dictData/list', { params: { dictId } });
}


/**
 * 查询字典明细详情
 */
export function getDictDataDetailApi(dictDataId: number) {
  return requestClient.get('/plat/dictData/detail', { params: { dictDataId } });
}


/**
 * 查询字典明细详情（根据字典编码）
 */
export function getDictDataByCodeApi(dictCode: string) {
  return requestClient.get<DictData[]>('/common/dict/listByDictCode', { 
    params: { dictCode } 
  });
}

/**
 * 新增字典明细
 */
export function addDictDataApi(data: Partial<DictData>) {
  return requestClient.post('/plat/dictData/add', data);
}

/**
 * 修改字典明细
 */
export function editDictDataApi(data: Partial<DictData>) {
  return requestClient.post('/plat/dictData/edit', data);
}

/**
 * 逻辑删除字典明细
 */
export function deleteDictDataApi(dictDataId: number) {
  return requestClient.post('/plat/dictData/delete', { dictDataId });
}

/**
 * 批量删除字典明细
 */
export function batchDeleteDictDataApi(ids: string) {
  return requestClient.post('/plat/dictData/delete', { ids });
}
