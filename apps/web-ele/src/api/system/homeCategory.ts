import { requestClient } from '#/api/request';
import type { HomeItem } from '#/api/system/housekeeping';

/** 类目对象数据类型 */
export interface HomeCategory {
  categoryId: number;
  parentId: number;
  level: number;
  categoryName: string;
  sort: number;
  status: number;
  defaultServiceConfigured?: boolean;
  imageUrl?: string;
  defaultPrice?: number;
  pricingUnit?: string;
  children?: HomeCategory[];
}

/** 平台末级分类完整默认服务，与商户配置独立。 */
export function getDefaultHomeServiceApi(categoryId: number) {
  return requestClient.get<HomeItem | null>('/restful/plat/homeCategory/defaultService/detail', {
    params: { categoryId },
  });
}

export function saveDefaultHomeServiceApi(data: HomeItem) {
  return requestClient.post<boolean>('/restful/plat/homeCategory/defaultService/save', data);
}

/** 新增 / 编辑 请求参数 */
export interface HomeCategorySaveParams {
  imageUrl?: string;
  defaultPrice?: number;
  pricingUnit?: string;
  categoryId?: number;
  parentId: number;
  level: number;
  categoryName: string;
  sort: number;
  status: number;
}

/** 接口地址定义 */
enum Api {
  Add = '/restful/plat/homeCategory/add',
  Delete = '/restful/plat/homeCategory/delete',
  Detail = '/restful/plat/homeCategory/detail',
  Edit = '/restful/plat/homeCategory/edit',
  List = '/restful/plat/homeCategory/list',
}

/**
 * 6.1 获取类目扁平列表
 */
export function getHomeCategoryListApi() {
  return requestClient.get<HomeCategory[]>(Api.List);
}

/**
 * 6.2.1 新增类目
 */
export function addHomeCategoryApi(data: HomeCategorySaveParams) {
  return requestClient.post<boolean>(Api.Add, data);
}

/**
 * 6.2.2 编辑类目
 */
export function editHomeCategoryApi(data: HomeCategorySaveParams) {
  return requestClient.post<boolean>(Api.Edit, data);
}

/** 分类和默认服务一次提交，服务端同一事务，防止只保存了一半。 */
export function editHomeCategoryWithDefaultApi(category: HomeCategorySaveParams, defaultService?: HomeItem) {
  return requestClient.post<boolean>('/restful/plat/homeCategory/editWithDefault', { category, defaultService });
}

/**
 * 6.2.3 类目详情
 */
export function getHomeCategoryDetailApi(categoryId: number) {
  return requestClient.get<HomeCategory>(Api.Detail, {
    params: { categoryId },
  });
}

/**
 * 6.2.4 删除类目
 */
export function deleteHomeCategoryApi(categoryId: number) {
  return requestClient.post<boolean>(`${Api.Delete}?categoryId=${categoryId}`);
}
