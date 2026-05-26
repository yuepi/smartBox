import { requestClient } from '#/api/request';

/** 回收订单类型定义 */
export interface RecycleOrder {
  recycleOrderId: number;
  orderNo: string;
  merchantId: number;
  merchantName: string;
  deptId: number;
  deptName: string;
  memberId: number;
  memberName: string;
  deviceId: number;
  deviceNo: string;
  deviceName: string;
  hatchId: number;
  hatchNo: number;
  devicePackageId: number;
  devicePackageName: string;
  deviceBagId: number;
  deviceBagNo: string;
  weight: number;           // 投递重量(kg)
  realWeight: number;       // 实际有效重量(kg)
  unitPrice: number;        // 回收单价(元/kg)
  estimateAmount: number;   // 预估金额
  realAmount: number;       // 实际金额
  orderStatus: number;      // 0=已投递,1=清运中,2=分拣中,3=审核中,4=已完成,5=已取消,6=异常
  payStatus: number;        // 0=待支付,1=已支付,2=支付失败
  payTime: string;
  remark: string;
  status: number;
}

/** 订单状态枚举 */
export const OrderStatusMap: Record<number, { label: string; type: string }> = {
  0: { label: '已投递', type: 'info' },
  1: { label: '清运中', type: 'primary' },
  2: { label: '分拣中', type: 'warning' },
  3: { label: '审核中', type: 'warning' },
  4: { label: '已完成', type: 'success' },
  5: { label: '已取消', type: 'danger' },
  6: { label: '异常', type: 'danger' },
};

/** 支付状态枚举 */
export const PayStatusMap: Record<number, { label: string; type: string }> = {
  0: { label: '待支付', type: 'warning' },
  1: { label: '已支付', type: 'success' },
  2: { label: '支付失败', type: 'danger' },
};

/** 分页参数 */
export interface RecycleOrderPageParams {
  pageNo: number;
  pageSize: number;
  orderNo?: string;
  memberName?: string;
  deptId?: number;
  deviceId?: number;
  orderStatus?: number;
  payStatus?: number;
}

/** 1. 分页查询 */
export function getRecycleOrderPageApi(params: RecycleOrderPageParams) {
  return requestClient.get('/merchant/recycleOrder/page', { params });
}

/** 2. 列表查询 */
export function getRecycleOrderListApi(params?: any) {
  return requestClient.get('/merchant/recycleOrder/list', { params });
}

/** 3. 详情查询 */
export function getRecycleOrderDetailApi(recycleOrderId: number) {
  return requestClient.get('/merchant/recycleOrder/detail', { params: { recycleOrderId } });
}

/** 4. 修改订单 */
export function editRecycleOrderApi(data: Partial<RecycleOrder>) {
  return requestClient.post('/merchant/recycleOrder/edit', data);
}

/** 5. 删除订单 */
export function deleteRecycleOrderApi(recycleOrderId: number) {
  return requestClient.post('/merchant/recycleOrder/delete', { recycleOrderId });
}

/** 补重/扣重参数 */
export interface WeightOperateParams {
  recycleOrderId: number;
  operateType: number; // 0=补重,1=扣重
  weight: number;
}

/** 备注参数 */
export interface RemarkOperateParams {
  recycleOrderId: number;
  remark: string;
}


/** 6. 异常订单 */
export function abnormalOrderApi(recycleOrderId: number) {
  return requestClient.post('/merchant/recycleOrder/operate/abnormal', { recycleOrderId });
}

/** 7. 补重/扣重 */
export function weightOperateApi(params: WeightOperateParams) {
  return requestClient.post('/merchant/recycleOrder/operate/weight', params);
}

/** 8. 订单备注 */
export function remarkOperateApi(params: RemarkOperateParams) {
  return requestClient.post('/merchant/recycleOrder/operate/remark', params);
}


/** 9.查看订单图片  */
export function getImageUrlsByRecycleOrderId(recycleOrderId: number) {
  return requestClient.get('/merchant/recycleOrderImage/queryImageUrlsByRecycleOrderId', { params: { recycleOrderId } });
}
