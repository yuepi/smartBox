import { requestClient } from '#/api/request';

// ==================== 数据类型定义 ====================

/** 更新项明细（平铺） */
export interface VersionUpdateItem {
  versionUpdateItemId?: number;
  itemType: 1 | 2 | 3; // 1=新增, 2=优化, 3=修复
  itemTypeName?: string;
  content: string;
  sort?: number;
}

/** 更新项按类型分组 */
export interface VersionItemGroup {
  itemType: 1 | 2 | 3;
  itemTypeName: string;
  count: number;
  contents: string[];
}

/** 版本更新主数据结构 */
export interface VersionUpdate {
  versionUpdateId: number;
  version: string;
  title: string;
  publishTime: string;
  status: 0 | 1; // 0=草稿, 1=已发布
  acked?: boolean; // false=未确认(需弹窗), true=已确认
  newCount?: number;
  optimizeCount?: number;
  fixCount?: number;
  itemGroups?: VersionItemGroup[];
  items?: VersionUpdateItem[];
}

/** 查询/列表请求参数 */
export interface VersionQueryParams {
  status?: number;
  version?: string;
  title?: string;
  publishTimeStart?: string;
  publishTimeEnd?: string;
  pageNo?: number;
  pageSize?: number;
}

/** 分页响应数据 */
export interface VersionPageResult {
  records: VersionUpdate[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

/** 保存/修改表单参数 */
export interface VersionSaveParams {
  versionUpdateId?: number;
  version: string;
  title: string;
  publishTime: string;
  status: 0 | 1;
  items: Array<{
    content: string;
    itemType: 1 | 2 | 3;
    sort?: number;
  }>;
}

// ==================== 接口方法 ====================

/**
 * 获取最新一条已发布版本（用于首次登录弹窗）
 */
export function getLatestVersionApi() {
  return requestClient.get<null | VersionUpdate>('/plat/versionUpdate/latest');
}

/**
 * 确认版本更新弹窗（记录已读）
 */
export function ackVersionApi(versionUpdateId: number) {
  return requestClient.post<boolean>('/plat/versionUpdate/ack', {
    versionUpdateId,
  });
}

/**
 * 更新日志列表查询（支持按 status/version/title 筛选）
 */
export function getVersionListApi(params?: VersionQueryParams) {
  return requestClient.get<VersionUpdate[]>('/plat/versionUpdate/list', {
    params,
  });
}

/**
 * 管理端分页查询版本
 */
export function getVersionPageApi(params: VersionQueryParams) {
  return requestClient.get<VersionPageResult>('/plat/versionUpdate/page', {
    params,
  });
}

/**
 * 查询版本详情
 */
export function getVersionDetailApi(versionUpdateId: number) {
  return requestClient.get<VersionUpdate>('/plat/versionUpdate/detail', {
    params: { versionUpdateId },
  });
}

/**
 * 新增版本更新
 */
export function addVersionApi(data: VersionSaveParams) {
  return requestClient.post<boolean>('/plat/versionUpdate/add', data);
}

/**
 * 修改版本更新
 */
export function editVersionApi(data: VersionSaveParams) {
  return requestClient.post<boolean>('/plat/versionUpdate/edit', data);
}

/**
 * 逻辑删除版本更新
 */
export function deleteVersionApi(versionUpdateId: number) {
  return requestClient.post<boolean>('/plat/versionUpdate/delete', {
    versionUpdateId,
  });
}
