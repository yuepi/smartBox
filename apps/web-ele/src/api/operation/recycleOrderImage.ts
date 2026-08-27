import { requestClient } from '#/api/request';

/** 订单附件类型定义 */
export interface RecycleOrderImage {
  recycleOrderImageId: number;
  recycleOrderId: number;
  type: number;        // 0=图片,1=视频
  url: string;
  sort: number;
  status: number;
}

/** 附件类型枚举 */
export const ImageTypeMap: Record<number, string> = {
  0: '图片',
  1: '视频',
};

/** 分页参数 */
export interface RecycleOrderImagePageParams {
  pageNo: number;
  pageSize: number;
  recycleOrderId?: number;
  type?: number;
}

/** 1. 分页查询附件 */
export function getRecycleOrderImagePageApi(params: RecycleOrderImagePageParams) {
  return requestClient.get('/merchant/recycleOrderImage/page', { params });
}

/** 2. 列表查询附件（根据订单ID） */
export function getRecycleOrderImageListApi(recycleOrderId: number) {
  return requestClient.get('/merchant/recycleOrderImage/list', { params: { recycleOrderId } });
}

/** 3. 附件详情 */
export function getRecycleOrderImageDetailApi(recycleOrderImageId: number) {
  return requestClient.get('/merchant/recycleOrderImage/detail', { params: { recycleOrderImageId } });
}

/** 4. 新增附件 */
export function addRecycleOrderImageApi(data: Partial<RecycleOrderImage>) {
  return requestClient.post('/merchant/recycleOrderImage/add', data);
}

/** 5. 修改附件 */
export function editRecycleOrderImageApi(data: Partial<RecycleOrderImage>) {
  return requestClient.post('/merchant/recycleOrderImage/edit', data);
}

/** 6. 删除附件 */
export function deleteRecycleOrderImageApi(recycleOrderImageId: number) {
  return requestClient.post('/merchant/recycleOrderImage/delete', { recycleOrderImageId });
}

/** 7. 批量删除附件 */
export function batchDeleteRecycleOrderImageApi(ids: string) {
  return requestClient.post('/merchant/recycleOrderImage/delete', { ids });
}