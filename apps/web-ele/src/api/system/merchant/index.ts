import { requestClient } from '#/api/request';

// 商户类型定义
export interface Merchant {
  merchantId: number;
  merchantName: string;
  merchantCode: string;
  logo: string;
  contact: string;
  phone: string;
  countryCode: string;
  provinceCode: string;
  cityCode: string;
  districtCode: string;
  province: string;
  city: string;
  district: string;
  address: string;
  detailAddress: string;
  longitude: number;
  latitude: number;
  status: number; // 0=启用,1=禁用
  merchantMenuIds: number[]; // 商户下的菜单IDs
}

// 分页查询参数
export interface MerchantPageParams {
  pageNo: number;
  pageSize: number;
  merchantId?: number;
  merchantName?: string;
  merchantCode?: string;
  contact?: string;
  phone?: string;
  status?: number;
}

// 分页响应数据
export interface MerchantPageResult {
  records: Merchant[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

/** 商户配置类型定义 */
export interface MerchantConfig {
  merchantConfigId: number;
  merchantId: number;
  orderWalletSync: number; // 0=不需要审核到钱包, 1=需要审核到预计收益
  status: number; // 0=启用,1=禁用
}

/** 商户信息类型定义 */
export interface MerchantInfo {
  merchantId: number;
  merchantName: string;
  merchantCode: string;
  logo: string;
  contact: string;
  phone: string;
  countryCode: string;
  provinceCode: string;
  cityCode: string;
  districtCode: string;
  province: string;
  city: string;
  district: string;
  address: string;
  detailAddress: string;
  longitude: number;
  latitude: number;
  status: number; // 0=启用,1=禁用
  merchantMenuIds: number[];
}

/** 商户账户类型定义 */
export interface MerchantAccount {
  merchantAccountId: number;
  merchantId: number;
  balance: number;
  status: number; // 0=正常,1=冻结
}

/** 商户资金流水类型定义 */
export interface MerchantAccountFlow {
  merchantAccountFlowId: number;
  merchantId: number;
  changeType: number; // 0=充值到账,1=平台服务费扣减,2=会员提现扣款
  changeAmount: number;
  beforeBalance: number;
  afterBalance: number;
  relatedId: number;
  remark: string;
  createTime: string;
}

/** 商户充值订单类型定义 */
export interface MerchantRecharge {
  merchantRechargeId: number;
  merchantId: number;
  rechargeNo: string;
  rechargeUserId: number;
  rechargeUserName: string;
  amount: number;
  status: number; // 0=待支付,1=支付中,2=已支付,3=支付失败
  payTime: string;
  refundStatus: number; // 0=未退款,1=退款中,2=已退款,3=退款失败
  totalRefundAmount: number;
  refundAmount: number;
  refundTime: string;
  payRequestId: string;
  payRequestTime: string;
  refundRequestId: string;
  refundRequestTime: string;
  createTime: string;
}

/** 商户账户流水分页参数 */
export interface MerchantAccountFlowPageParams {
  pageNo: number;
  pageSize: number;
  merchantId?: number;
  changeType?: number;
  startTime?: string;
  endTime?: string;
}

/** 商户充值订单分页参数 */
export interface MerchantRechargePageParams {
  pageNo: number;
  pageSize: number;
  merchantId?: number;
  rechargeNo?: string;
  status?: number;
  refundStatus?: number;
  startTime?: string;
  endTime?: string;
}

//平台维度商户接口
/**
 * 分页查询商户
 */
export function getPlatMerchantPageApi(params: MerchantPageParams) {
  return requestClient.get('/plat/merchant/page', { params });
}

/**
 * 列表查询商户
 */
export function getPlatMerchantListApi(params?: Partial<MerchantPageParams>) {
  return requestClient.get('/plat/merchant/list', { params });
}

/**
 * 查询商户详情
 */
export function getPlatMerchantDetailApi(merchantId: number) {
  return requestClient.get('/plat/merchant/detail', { params: { merchantId } });
}

/**
 * 新增商户（注意：平台添加商户需要同步创建商户下的管理员账号）
 */
export function addPlatMerchantApi(data: Partial<Merchant>) {
  return requestClient.post('/plat/merchant/add', data);
}

/**
 * 修改商户
 */
export function editPlatMerchantApi(data: Partial<Merchant>) {
  return requestClient.post('/plat/merchant/edit', data);
}

/**
 * 逻辑删除商户
 */
export function deletePlatMerchantApi(merchantId: number) {
  return requestClient.post('/plat/merchant/delete', { merchantId });
}

/**
 * 批量删除商户
 */
export function batchDeletePlatMerchantApi(ids: string) {
  return requestClient.post('/plat/merchant/delete', { ids });
}

/**  平台维度查看商户账户详情 */
export function getPlatMerchantAccountApi(merchantId: number) {
  return requestClient.get('/plat/merchantAccount/detail', { params: { merchantId } });
}

/** 平台维度查看商户资金流水分页 */
export function getPlatMerchantAccountFlowPageApi(params: MerchantAccountFlowPageParams) {
  return requestClient.get('/plat/merchantAccountFlow/page', { params });
}

/** 平台维度查看商户充值订单分页 */
export function getPlatMerchantRechargePageApi(params: MerchantRechargePageParams) {
  return requestClient.get('/plat/merchantRecharge/page', { params });
}

/** 平台维度商户配置详情查询 */
export function getPlatMerchantConfigDetailApi(merchantId: number) {
  return requestClient.get('/plat/merchantConfig/detail', { params: { merchantId } });
}

/** 平台维度商户配置修改 */
export function editPlatMerchantConfigApi(data: Partial<MerchantConfig>) {
  return requestClient.post('/plat/merchantConfig/edit', data);
}


//商户接口
/** 1. 商户信息详情 */
export function getMerchantInfoApi(merchantId: number) {
  return requestClient.get('/merchant/merchant/detail', { params: { merchantId } });
}

/** 2. 修改商户信息 */
export function editMerchantInfoApi(data: Partial<MerchantInfo>) {
  return requestClient.post('/merchant/merchant/edit', data);
}

/** 3. 商户账户详情 */
export function getMerchantAccountApi(merchantId: number) {
  return requestClient.get('/merchant/merchantAccount/detail', { params: { merchantId } });
}

/** 4. 商户资金流水分页 */
export function getMerchantAccountFlowPageApi(params: MerchantAccountFlowPageParams) {
  return requestClient.get('/merchant/merchantAccountFlow/page', { params });
}

/** 5. 商户充值订单分页 */
export function getMerchantRechargePageApi(params: MerchantRechargePageParams) {
  return requestClient.get('/merchant/merchantRecharge/page', { params });
}

/** 商户配置详情查询 */
export function getMerchantConfigDetailApi(merchantId: number) {
  return requestClient.get('/merchant/merchantConfig/detail', { params: { merchantId } });
}

/** 商户配置修改 */
export function editMerchantConfigApi(data: Partial<MerchantConfig>) {
  return requestClient.post('/merchant/merchantConfig/edit', data);
}

