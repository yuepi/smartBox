import { requestClient } from '#/api/request';

/** 登录日志分页参数 */
export interface LoginLogPageParams {
  pageNo: number;
  pageSize: number;
  accountName?: string;
  status?: number;
}

/** 1. 分页查询 (商户接口) */
export function getMerchantLoginLogPageApi(params: LoginLogPageParams) {
  return requestClient.get<any>('/merchant/loginLog/page', { params });
}

/** 2. 列表查询 (全量数据) */
export function getMerchantLoginLogListApi(params: any) {
  return requestClient.get<any[]>('/merchant/loginLog/list', { params });
}

/** 3. 详情查询 */
export function getMerchantLoginLogDetailApi(loginLogId: number | string) {
  return requestClient.get<any>(`/merchant/loginLog/query/${loginLogId}`);
}

/** 4. 删除日志 (支持逗号隔开的ID串) */
export function deleteMerchantLoginLogApi(ids: string) {
  return requestClient.delete(`/merchant/loginLog/remove/${ids}`);
}


/** 1. 分页查询 (平台接口) */
export function getPlatLoginLogPageApi(params: LoginLogPageParams) {
  return requestClient.get<any>('/plat/loginLog/page', { params });
}

/** 2. 列表查询 (全量数据) */
export function getPlatLoginLogListApi(params: any) {
  return requestClient.get<any[]>('/plat/loginLog/list', { params });
}

/** 3. 详情查询 */
export function getPlatLoginLogDetailApi(loginLogId: number | string) {
  return requestClient.get<any>(`/plat/loginLog/query/${loginLogId}`);
}

/** 4. 删除日志 (支持逗号隔开的ID串) */
export function deletePlatLoginLogApi(ids: string) {
  return requestClient.delete(`/plat/loginLog/remove/${ids}`);
}
