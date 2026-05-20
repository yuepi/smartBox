// api/device/qrcode.ts
import { requestClient } from '#/api/request';

/** 二维码类型定义 */
export interface Qrcode {
  qrcodeId: number;
  merchantId: number;
  qrcodeType: number; // 0=设备,1=包袋
  qrcodeCode: string;
  qrcodeUrl: string;
  status: number; // 0=启用,1=禁用
  bindFlag: number; // 0=未绑定,1=绑定
  bizId: number; // 业务id（设备ID或包袋ID）
}

/** 二维码分页参数 */
export interface QrcodePageParams {
  pageNo: number;
  pageSize: number;
  qrcodeId?: number;
  merchantId?: number;
  qrcodeType?: number;
  qrcodeCode?: string;
  status?: number;
  bindFlag?: number;
}

/** 生成二维码参数 */
export interface GenerateQrcodeParams {
  qrcodeType: number; // 0=设备,1=包袋
  qrcodeTotal: number;
  merchantId?: number;
}

/** 批量下载/展示二维码参数 */
export interface BatchQrcodeParams {
  merchantId?: number;
  qrcodeFlag: number; // 0=下载压缩包,1=展示base64
  qrcodeIds: number[];
}

/** 批量二维码返回数据 */
export interface BatchQrcodeData {
  qrcodeId: number;
  merchantId: number;
  qrcodeCode: string;
  base64QrCode: string;
}

/** 1. 分页查询二维码 */
export function getQrcodePageApi(params: QrcodePageParams) {
  return requestClient.get('/merchant/qrcode/page', { params });
}

/** 2. 列表查询二维码 */
export function getQrcodeListApi(params?: any) {
  return requestClient.get('/merchant/qrcode/list', { params });
}

/** 3. 二维码详情 */
export function getQrcodeDetailApi(qrcodeId: number) {
  return requestClient.get('/merchant/qrcode/detail', { params: { qrcodeId } });
}

/** 4. 生成二维码 */
export function generateQrcodeApi(data: GenerateQrcodeParams) {
  return requestClient.post('/merchant/qrcode/generatorQrcode', data);
}

/** 5.1 批量下载二维码（返回文件流/Blob） */
export function batchDownQrcodeFileApi(data: BatchQrcodeParams) {
  return requestClient.post(
    '/merchant/qrcode/batch/downBatchQrcode', 
    { ...data, qrcodeFlag: 0 }, // 强制设为下载模式
    { responseType: 'blob' }    // 关键：交给拦截器特殊处理
  );
}

/** 5.2 批量展示二维码（返回 JSON/Base64） */
export function batchDownQrcodeJsonApi(data: BatchQrcodeParams) {
  return requestClient.post(
    '/merchant/qrcode/batch/downBatchQrcode', 
    { ...data, qrcodeFlag: 1 }  // 强制设为展示模式
  );
}
