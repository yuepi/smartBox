import { requestClient } from '#/api/request';

/** 分拣明细类型定义 */
export interface SortItem {
  sortItemId: number;
  sortTaskId: number;
  packageType: number;      // 0=混合,1=织物,2=金属,3=塑料
  packageName: string;
  weight: number;
  status: number;
}

/** 分类类型枚举 */
export const PackageTypeMap: Record<number, { label: string; color: string }> = {
  0: { label: '混合', color: 'info' },
  1: { label: '织物', color: 'primary' },
  2: { label: '金属', color: 'warning' },
  3: { label: '塑料', color: 'success' },
};

/** 分页参数 */
export interface SortItemPageParams {
  pageNo: number;
  pageSize: number;
  sortTaskId: number;
  packageType?: number;
}

/** 1. 分页查询 */
export function getSortItemPageApi(params: SortItemPageParams) {
  return requestClient.get('/merchant/sortItem/page', { params });
}

/** 2. 列表查询 */
export function getSortItemListApi(sortTaskId: number) {
  return requestClient.get('/merchant/sortItem/list', { params: { sortTaskId } });
}

/** 3. 新增明细 */
export function addSortItemApi(data: Partial<SortItem>) {
  return requestClient.post('/merchant/sortItem/add', data);
}

/** 4. 修改明细 */
export function editSortItemApi(data: Partial<SortItem>) {
  return requestClient.post('/merchant/sortItem/edit', data);
}

/** 5. 删除明细 */
export function deleteSortItemApi(sortItemId: number) {
  return requestClient.post('/merchant/sortItem/delete', { sortItemId });
}