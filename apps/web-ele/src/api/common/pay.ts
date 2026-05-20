// api/common/pay.ts
import { requestClient } from '#/api/request';

export interface H5PayParams {
  payAmount: number;
  clientIp: string;
  merchantId: number;
}

export interface H5PayResponse {
  h5Url: string;
  orderNo: string;
}

export interface NativePayParams {
  payAmount: number;
}

export interface NativePayResponse {
  codeUrl: string;
  orderNo: string;
}

/**
 * H5支付-商户充值（手机浏览器）
 */
export function h5PayApi(data: H5PayParams) {
  return requestClient.post<H5PayResponse>('/common/pay/pay/h5', data);
}

/**
 * Native支付-商户充值（PC扫码）
 */
export function nativePayApi(data: NativePayParams) {
  return requestClient.post<NativePayResponse>('/common/pay/pay/native', data);
}
