import { MERCHANT_PERMISSIONS } from './merchant';
import { PLAT_PERMISSIONS } from './plat';

/**
 * 全局权限常量集合
 */
export const PERMISSIONS = {
  PLAT: PLAT_PERMISSIONS,
  MERCHANT: MERCHANT_PERMISSIONS,
} as const;

// 单独导出子端，方便页面精准按需引入
export { MERCHANT_PERMISSIONS, PLAT_PERMISSIONS };
