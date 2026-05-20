import { requestClient } from '#/api/request';

/** 清运任务类型定义 */
export interface CleanTask {
  cleanTaskId: number;
  taskNo: string;
  merchantId: number;
  deptId: number;
  deviceId: number;
  hatchId: number;
  hatchNo: number;
  deviceBagId: number;
  fullWeight: number;       // 满仓重量
  cleanUserId: number;
  cleanUserName: string;
  taskStatus: number;       // 0=待清运,1=清运中,2=已完成,3=已取消
  planTime: string;         // 计划清运日期
  finishTime: string;       // 实际完成时间
  remark: string;
  status: number;
}

/** 任务状态枚举 */
export const TaskStatusMap: Record<number, { label: string; type: string }> = {
  0: { label: '待清运', type: 'warning' },
  1: { label: '清运中', type: 'primary' },
  2: { label: '已完成', type: 'success' },
  3: { label: '已取消', type: 'danger' },
};

/** 分页参数 */
export interface CleanTaskPageParams {
  pageNo: number;
  pageSize: number;
  taskNo?: string;
  deptId?: number;
  deviceId?: number;
  taskStatus?: number;
  planTimeStart?: string;
  planTimeEnd?: string;
}

/** 1. 分页查询 */
export function getCleanTaskPageApi(params: CleanTaskPageParams) {
  return requestClient.get('/merchant/cleanTask/page', { params });
}

/** 2. 列表查询 */
export function getCleanTaskListApi(params?: any) {
  return requestClient.get('/merchant/cleanTask/list', { params });
}

/** 3. 详情查询 */
export function getCleanTaskDetailApi(cleanTaskId: number) {
  return requestClient.get('/merchant/cleanTask/detail', { params: { cleanTaskId } });
}

/** 4. 新增任务 */
export function addCleanTaskApi(data: Partial<CleanTask>) {
  return requestClient.post('/merchant/cleanTask/add', data);
}

/** 5. 修改任务 */
export function editCleanTaskApi(data: Partial<CleanTask>) {
  return requestClient.post('/merchant/cleanTask/edit', data);
}

/** 6. 删除任务 */
export function deleteCleanTaskApi(cleanTaskId: number) {
  return requestClient.post('/merchant/cleanTask/delete', { cleanTaskId });
}