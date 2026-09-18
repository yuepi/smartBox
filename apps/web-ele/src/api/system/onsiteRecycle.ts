import { requestClient } from '#/api/request';

/** 独立上门回收接口，禁止改成设备 recycleOrder 路径。 */
const base = '/merchant/onsiteRecycleOrder';

export interface OnsiteItem {
  orderItemId: number;
  recycleItemId: number;
  itemName: string;
  quoteImageUrl?: string;
  quotePrice?: number;
  quoteUnit?: string;
  quoteMerchantId?: number;
  pricingType?: number;
  realWeight?: number;
  quantity?: number;
  unitPrice?: number;
  realAmount?: number;
}

export interface OnsiteOrder {
  onsiteOrderId: number;
  orderNo: string;
  orderStatus: number;
  contactName: string;
  contactPhone: string;
  pickupAddress: string;
  reserveTime: string;
  assignedUserId?: number;
  assignedUserName?: string;
  assignedUserPhone?: string;
  sceneImageUrls?: string[];
  paymentImageUrls?: string[];
  completionNote?: string;
  realAmount: number;
  remark?: string;
  closeReason?: string;
  items?: OnsiteItem[];
  flows?: { createdTime: string; description: string; operatorRole: string }[];
}

export interface OnsiteCategory {
  recycleItemId: number;
  name: string;
  imageUrl?: string;
  pricingUnit?: string;
  defaultPrice?: number;
  children?: OnsiteCategory[];
}

export function getOnsitePage(
  params: Record<string, unknown>,
  platform = false,
) {
  return requestClient.get<{ records: OnsiteOrder[]; total: number }>(
    `${platform ? '/restful/plat/onsiteRecycleOrder' : base}/page`,
    { params },
  );
}

export function getOnsiteDetail(onsiteOrderId: number, platform = false) {
  return requestClient.get<OnsiteOrder>(
    `${platform ? '/restful/plat/onsiteRecycleOrder' : base}/detail`,
    { params: { onsiteOrderId } },
  );
}

export function operateOnsite(
  action: 'cancel' | 'reject' | 'start',
  onsiteOrderId: number,
  reason?: string,
) {
  return requestClient.post<boolean>(`${base}/${action}`, {
    onsiteOrderId,
    reason,
  });
}

export function finishOnsite(
  onsiteOrderId: number,
  items: OnsiteItem[],
  offlinePaid: boolean,
  proof: {
    sceneImageUrls: string[];
    paymentImageUrls: string[];
    completionNote: string;
  },
) {
  // 不传前端总金额，不回传类目快照；由服务端校验明细归属并计算成交款。
  return requestClient.post<boolean>(`${base}/finish`, {
    onsiteOrderId,
    offlinePaid,
    ...proof,
    items: items.map((item) => ({
      orderItemId: item.orderItemId,
      pricingType: item.pricingType,
      realWeight: item.pricingType === 1 ? item.realWeight : undefined,
      quantity: item.pricingType === 2 ? item.quantity : undefined,
      unitPrice: item.unitPrice,
    })),
  });
}

export function getOnsiteCategories() {
  return requestClient.get<OnsiteCategory[]>(`${base}/categories`);
}

export function getOnsiteWorkers() {
  return requestClient.get<{ userId: number; name: string; phone?: string }[]>(
    `${base}/workers`,
  );
}

export function assignOnsiteWorker(data: {
  onsiteOrderId: number;
  expectedAssignedUserId: number | null;
  assignedUserId: number;
  reason: string;
}) {
  return requestClient.post<boolean>(`${base}/assignWorker`, data);
}

export function rescheduleOnsite(data: {
  onsiteOrderId: number;
  expectedReserveTime: string;
  reserveTime: string;
  reason: string;
}) {
  return requestClient.post<boolean>(`${base}/reschedule`, data);
}

export function getOnsiteScope() {
  return requestClient.get<number[]>(`${base}/scope`);
}

export function saveOnsiteScope(
  recycleItemIds: number[],
  prices?: Record<number, number | null>,
) {
  return requestClient.post<boolean>(`${base}/scope`, {
    recycleItemIds,
    prices,
  });
}

export function getOnsiteScopePrices() {
  return requestClient.get<
    { recycleItemId: number; referencePrice?: number; status: number }[]
  >(`${base}/scopePrices`);
}
