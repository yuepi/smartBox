import { requestClient } from '#/api/request';

// 操作日志类型定义
export interface OperLog {
  operLogId: number;
  merchantId: number;
  title: string;
  businessType: number;
  operAccountType: number;
  operAccountId: number;
  operAccountName: string;
  operIp: string;
  operLocation: string;
  operUrl: string;
  operRequestMethod: string;
  operParam: string;
  operResultData: string;
  status: number;
  errorMsg: string;
  costTime: number;
}

// 分页查询参数
export interface OperLogPageParams {
  pageNo: number;
  pageSize: number;
  operLogId?: number;
  merchantId?: number;
  title?: string;
  businessType?: number;
  operAccountType?: number;
  operAccountId?: number;
  operAccountName?: string;
  operIp?: string;
  operLocation?: string;
  operUrl?: string;
  operRequestMethod?: string;
  operParam?: string;
  operResultData?: string;
  status?: number;
  errorMsg?: string;
  costTime?: number;
}

// 分页响应数据
export interface OperLogPageResult {
  records: OperLog[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

// 通用响应结构
export interface ApiResponse<T> {
  code: number;
  message: string;
  module: string;
  data: T;
}

/**
 * 商户分页查询操作日志
 */
export function getMerchantOperLogPageApi(params: OperLogPageParams) {
  return requestClient.get<ApiResponse<OperLogPageResult>>('merchant/operLog/page', { params });
}

/**
 * 列表查询操作日志
 */
export function getMerchantOperLogListApi(params: OperLogPageParams) {
  return requestClient.get<ApiResponse<OperLog[]>>('merchant/operLog/list', { params });
}

/**
 * 查询操作日志详情
 */
export function getMerchantOperLogDetailApi(operLogId: number) {
  return requestClient.get<ApiResponse<OperLog>>('merchant/operLog/detail', {
    params: { operLogId },
  });
}

/**
 * 新增操作日志
 */
export function addMerchantOperLogApi(data: Partial<OperLog>) {
  return requestClient.post<ApiResponse<boolean>>('merchant/operLog/add', data);
}

/**
 * 修改操作日志
 */
export function editMerchantOperLogApi(data: Partial<OperLog>) {
  return requestClient.post<ApiResponse<boolean>>('merchant/operLog/edit', data);
}

/**
 * 逻辑删除操作日志
 */
export function deleteMerchantOperLogApi(operLogId: number | string) {
  return requestClient.post<ApiResponse<boolean>>('merchant/operLog/delete', { operLogId });
}




/**
 * 平台分页查询操作日志
 */
export function getPlatOperLogPageApi(params: OperLogPageParams) {
  return requestClient.get<ApiResponse<OperLogPageResult>>('plat/operLog/page', { params });
}

/**
 * 列表查询操作日志
 */
export function getPlatOperLogListApi(params: OperLogPageParams) {
  return requestClient.get<ApiResponse<OperLog[]>>('plat/operLog/list', { params });
}

/**
 * 查询操作日志详情
 */
export function getPlatOperLogDetailApi(operLogId: number) {
  return requestClient.get<ApiResponse<OperLog>>('plat/operLog/detail', {
    params: { operLogId },
  });
}

/**
 * 新增操作日志
 */
export function addPlatOperLogApi(data: Partial<OperLog>) {
  return requestClient.post<ApiResponse<boolean>>('plat/operLog/add', data);
}

/**
 * 修改操作日志
 */
export function editPlatOperLogApi(data: Partial<OperLog>) {
  return requestClient.post<ApiResponse<boolean>>('plat/operLog/edit', data);
}

/**
 * 逻辑删除操作日志
 */
export function deletePlatOperLogApi(operLogId: number | string) {
  return requestClient.post<ApiResponse<boolean>>('plat/operLog/delete', { operLogId });
}