import { requestClient } from '#/api/request';

// 商户信息类型定义
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
  status: number;
  merchantMenuIds: number[];
}

/**
 * 获取商户详情（当前登录商户）
 */
export function getMerchantDetailApi(merchantId: number) {
  return requestClient.get('/merchant/merchant/detail', { params: { merchantId } });
}

/**
 * 修改商户信息（当前登录商户）
 */
export function editMerchantApi(data: Partial<MerchantInfo>) {
  return requestClient.post('/merchant/merchant/edit', data);
}