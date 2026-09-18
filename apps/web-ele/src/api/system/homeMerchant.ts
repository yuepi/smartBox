import { requestClient } from '#/api/request';

/** 关联类型：0=普通合作, 1=独家, 2=平台推荐 */
export type RelationType = 0 | 1 | 2;

// 回收商户与家政商户关联实体定义
export interface HomeMerchantRelation {
  relationId?: number;
  recycleMerchantId: number;
  recycleMerchantName?: string;
  housekeepingMerchantId: number;
  housekeepingMerchantName?: string;
  relationType: RelationType;
  remark?: string;
  createdTime?: string;
  updatedTime?: string;
}

// 关联查询参数
export interface HomeMerchantRelationParams {
  pageNo?: number;
  pageSize?: number;
  recycleMerchantId?: number;
  recycleMerchantName?: string;
  homeMerchantId?: number;
  homeMerchantName?: string;
  relationType?: RelationType;
}

/**
 * 分页查询关联列表（含双方商户名称）
 */
export function getHomeMerchantRelationPageApi(
  params: HomeMerchantRelationParams,
) {
  return requestClient.get('/restful/plat/homeMerchant/relationList', {
    params,
  });
}

/**
 * 查询家政商户详情
 */
export function getHomeMerchantDetailApi(relationId: number) {
  return requestClient.get<HomeMerchantRelation>(
    '/restful/plat/homeMerchant/relationDetail',
    { params: { relationId } },
  );
}

/**
 * 绑定商户关联
 */
export function bindHomeMerchantRelationApi(data: HomeMerchantRelation) {
  return requestClient.post<number>(
    '/restful/plat/homeMerchant/bindRelation',
    data,
  );
}

/**
 * 解除商户关联
 */
export function unbindHomeMerchantRelationApi(relationId: number) {
  return requestClient.post('/restful/plat/homeMerchant/unbindRelation', {
    relationId,
  });
}

/**
 * 查询家政商户列表
 */
export function getHomeMerchantListApi() {
  return requestClient.get('/restful/plat/homeMerchant/list');
}

/**
 * 查询回收商户关联的家政商户列表
 */
export function getHomeMerchantRelationListApi(recycleMerchantId: number) {
  return requestClient.get('/restful/plat/homeMerchant/relationList', {
    params: { recycleMerchantId },
  });
}

/**
 * 查询回收商户关联的家政商户详情
 */
export function getHomeMerchantRelationDetailApi(relationId: number) {
  return requestClient.get<HomeMerchantRelation>(
    '/restful/plat/homeMerchant/relationDetail',
    { params: { relationId } },
  );
}

/** 家政商户绑定关系结构 */
export interface MerchantHomeBindRelation {
  relationId: number;
  housekeepingMerchantId: number;
  housekeepingMerchantName?: string;
  recycleMerchantId?: number;
  relationType?: number;
  createTime?: string;
}

/** 绑定请求参数 */
export interface BindHomeMerchantParams {
  housekeepingMerchantId: number;
  relationType?: number;
}

/** 分页查询参数 */
export interface MerchantHomeBindQueryParams {
  pageNo?: number;
  pageSize?: number;
}

/** 1. 回收商户自助绑定家政商户 */
export function bindHomeMerchantSelfApi(data: BindHomeMerchantParams) {
  return requestClient.post<number>(
    '/restful/merchant/homeMerchant/bindRelation',
    data,
  );
}

/** 2. 回收商户视角查看「我绑定的家政商户列表」 */
export function getMyHomeMerchantRelationListApi(
  params: MerchantHomeBindQueryParams,
) {
  return requestClient.get('/restful/merchant/homeMerchant/relationList', {
    params,
  });
}

/** 3. 解绑（物理删除） */
export function unbindHomeMerchantSelfApi(relationId: number) {
  return requestClient.post<boolean>(
    `/restful/merchant/homeMerchant/unbindRelation`,
    null,
    { params: { relationId } },
  );
}
