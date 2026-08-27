import { requestClient } from '#/api/request';

/** 分拣任务类型定义 */
export interface SortTask {
  sortTaskId: number;
  sortNo: string;
  merchantId: number;
  cleanTaskId: number;
  deviceId: number;
  hatchId: number;
  deviceBagId: number;
  totalWeight: number;      // 总重量
  realWeight: number;       // 实际分拣重量
  sortUserId: number;
  sortUserName: string;
  sortStatus: number;       // 0=待分拣,1=分拣中,2=已完成
  sortTime: string;         // 分拣完成时间
  remark: string;
  status: number;
}

/** 分拣状态枚举 */
export const SortStatusMap: Record<number, { label: string; type: string }> = {
  0: { label: '待分拣', type: 'warning' },
  1: { label: '分拣中', type: 'primary' },
  2: { label: '已完成', type: 'success' },
};

/** 分页参数 */
export interface SortTaskPageParams {
  pageNo: number;
  pageSize: number;
  sortNo?: string;
  cleanTaskId?: number;
  deviceId?: number;
  sortStatus?: number;
}

/** 1. 分页查询 */
export function getSortTaskPageApi(params: SortTaskPageParams) {
  return requestClient.get('/merchant/sortTask/page', { params });
}

/** 2. 列表查询 */
export function getSortTaskListApi(params?: any) {
  return requestClient.get('/merchant/sortTask/list', { params });
}

/** 3. 详情查询 */
export function getSortTaskDetailApi(sortTaskId: number) {
  return requestClient.get('/merchant/sortTask/detail', { params: { sortTaskId } });
}

/** 4. 修改任务 */
export function editSortTaskApi(data: Partial<SortTask>) {
  return requestClient.post('/merchant/sortTask/edit', data);
}

/** 5. 删除任务 */
export function deleteSortTaskApi(sortTaskId: number) {
  return requestClient.post('/merchant/sortTask/delete', { sortTaskId });
}