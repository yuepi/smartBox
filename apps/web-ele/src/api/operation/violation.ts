import { requestClient } from '#/api/request';

/** 违规记录项数据结构 */
export interface SortViolation {
  sortViolationId?: number;
  cleanTaskId: number;
  merchantId?: number;
  violationType: string;
  violationDesc?: string;
  remark?: string;
  status: number;
  violationImages: string[];
  createdName?: string;
  createdTime?: string;
  updatedTime?: string;
}

/** 分页查询参数 */
export interface ViolationPageParams {
  pageNo?: number;
  pageSize?: number;
  cleanTaskId?: number;
  merchantId?: number;
  violationType?: string;
  status?: number;
}

// 1. 违规记录分页查询
export function getSortViolationPageApi(params: ViolationPageParams) {
  return requestClient.get('/merchant/sortViolation/page', { params });
}

// 2. 新增违规记录
export function addSortViolationApi(data: SortViolation) {
  return requestClient.post('/merchant/sortViolation/add', data);
}

// 3. 修改违规记录
export function editSortViolationApi(data: SortViolation) {
  return requestClient.post('/merchant/sortViolation/edit', data);
}

// 4. 删除违规记录
export function delSortViolationApi(sortViolationId: number) {
  return requestClient.post('/merchant/sortViolation/delete', { sortViolationId });
}

// 5. 按清运任务获取违规列表（用于弹窗）
export function getCleanTaskViolationListApi(cleanTaskId: number) {
  return requestClient.get<SortViolation[]>('/merchant/cleanTask/violationList', {
    params: { cleanTaskId },
  });
}
