// api/common/oss.ts
import { requestClient } from '#/api/request';

/**
 * 获取oss临时凭证
 * 
 */
export function getOssTokenApi() {
  return requestClient.get<any>('/common/upload/gettoken');
}



