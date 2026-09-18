import { requestClient } from '#/api/request';

// ==================== 1. 家政订单相关 TS 类型 & API ====================

/** 订单状态：0=未支付, 1=待接单, 2=已接单(待服务), 3=服务中, 4=已完成, 6=已取消, 7=退款中 */
export type HomeOrderStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface HomeOrder {
  homeOrderId: number;
  orderNo?: string;
  memberId?: number;
  memberName?: string;
  memberPhone?: string;
  housekeepingMerchantId?: number;
  housekeepingMerchantName?: string;
  homeItemId?: number;
  itemName?: string;
  payAmount?: number;
  status: HomeOrderStatus;
  address?: string;
  appointmentTime?: string;
  createdTime?: string;
  remark?: string;
  comboName?: string;
  itemSnapshotJson?: string;
  contactName?: string;
  contactPhone?: string;
  appointTime?: string;
  refundReason?: string;
  refundNo?: string;
  refundStatus?: string;
  refundTime?: string;
  paidTime?: string;
  commissionAmount?: number;
}

export interface HomeOrderQueryParams {
  pageNo?: number;
  pageSize?: number;
  contactName?: string;
  contactPhone?: string;
  refundOnly?: boolean;
  status?: HomeOrderStatus;
  orderNo?: string;
  memberPhone?: string;
}

/** 4.1 待接/进行中订单列表 */
export function getHomeOrderPageApi(
  params: HomeOrderQueryParams,
  platform = false,
) {
  return requestClient.get<PageResult<HomeOrder>>(
    platform
      ? '/restful/plat/homeOrder/page'
      : '/restful/merchant/homeOrder/queryPage',
    {
      params,
    },
  );
}

export function getHomeOrderDetailApi(homeOrderId: number, platform = false) {
  return requestClient.get<{
    order: HomeOrder;
    flows: {
      flowId: number;
      createdTime: string;
      operatorType: string;
      remark: string;
    }[];
  }>(
    platform
      ? '/restful/plat/homeOrder/detail'
      : '/restful/merchant/homeOrder/detail',
    { params: { homeOrderId } },
  );
}

/** 4.2 接单 (1 -> 2) */
export function acceptHomeOrderApi(homeOrderId: number) {
  return requestClient.post<boolean>(
    '/restful/merchant/homeOrder/accept',
    null,
    {
      params: { homeOrderId },
    },
  );
}

/** 4.3 开始服务 (2 -> 3) */
export function startHomeOrderApi(homeOrderId: number) {
  return requestClient.post<boolean>(
    '/restful/merchant/homeOrder/start',
    null,
    {
      params: { homeOrderId },
    },
  );
}

/** 4.4 完成并结算 (3 -> 4) */
export function finishHomeOrderApi(homeOrderId: number) {
  return requestClient.post<boolean>(
    '/restful/merchant/homeOrder/finish',
    null,
    {
      params: { homeOrderId },
    },
  );
}

/** 4.5 取消（申请退款） */
export function cancelHomeOrderApi(homeOrderId: number) {
  return requestClient.post<boolean>(
    '/restful/merchant/homeOrder/cancel',
    null,
    {
      params: { homeOrderId },
    },
  );
}

/** 4.6 退款执行 (7 -> 6) */
export function refundHomeOrderApi(homeOrderId: number) {
  return requestClient.post<boolean>(
    '/restful/merchant/homeOrder/refund',
    null,
    {
      params: { homeOrderId },
    },
  );
}

// ==================== 2. 服务项配置相关 TS 类型 & API ====================

export interface HomeItem {
  skuComboCount?: number;
  homeItemId?: number;
  merchantId?: number;
  categoryId?: number;
  itemName: string;
  unit: string;
  description?: string;
  imageUrls?: string | string[];
  skuDimList?: SkuDim[];
  skuComboList?: SkuCombo[];
  optionGroupList?: OptionGroup[];
  sort?: number;
  status: number; // 0=启用/上架, 1=禁用/下架
}

export interface SkuDimValue {
  dimValueId?: number;
  valueName: string;
  sort: number;
  status: number;
}
export interface SkuDim {
  dimId?: number;
  dimName: string;
  required: number;
  sort: number;
  status: number;
  valueList: SkuDimValue[];
}
export interface SkuCombo {
  comboId?: number;
  comboName: string;
  price: number;
  marketPrice?: number;
  stock: number;
  sort: number;
  status: number;
  imageUrl?: string;
  dimValueIds?: number[];
  dimValueNames?: string[];
}
export interface OptionValue {
  optionValueId?: number;
  valueName: string;
  priceDelta: number;
  sort: number;
  status: number;
}
export interface OptionGroup {
  optionId?: number;
  optionName: string;
  optionType: number;
  required: number;
  sort: number;
  status: number;
  valueList: OptionValue[];
}

export interface HomeItemQueryParams {
  current?: number;
  size?: number;
  categoryId?: number;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

/** 5.1 分页查询本商户服务项 */
export function getHomeItemPageApi(params: HomeItemQueryParams) {
  return requestClient.get<PageResult<HomeItem>>(
    '/restful/merchant/homeItem/page',
    {
      params,
    },
  );
}

/** 商户选品只读目录，不调用平台类目维护接口。 */
export function getHomeItemCategoriesApi() {
  return requestClient.get<import('./homeCategory').HomeCategory[]>(
    '/restful/merchant/homeItem/categories',
  );
}

/** 5.2 新增服务项 */
export function addHomeItemApi(data: HomeItem) {
  return requestClient.post('/restful/merchant/homeItem/add', data);
}

/** 5.3 编辑服务项 */
export function editHomeItemApi(data: HomeItem) {
  return requestClient.post('/restful/merchant/homeItem/edit', data);
}

/** 5.3 服务项详情 */
export function getHomeItemDetailApi(homeItemId: number) {
  return requestClient.get<HomeItem>('/restful/merchant/homeItem/detail', {
    params: { homeItemId },
  });
}

/** 5.3 删除服务项 */
export function deleteHomeItemApi(homeItemId: number) {
  return requestClient.post('/restful/merchant/homeItem/delete', null, {
    params: { homeItemId },
  });
}
