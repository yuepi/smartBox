import type { RouteRecordRaw } from 'vue-router';

import { PERMISSIONS } from '#/constants/auth';
import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'Merchant',
    path: '/plat/merchant',
    redirect: '/merchant',
    meta: {
      icon: 'lucide:settings',
      title: $t('page.merchant.title') || '商户管理',
      order: 90,
      authority: [PERMISSIONS.PLAT.MERCHANT.MANAGE],
    },
    children: [
      {
        name: 'MerchantManagement',
        path: '/merchant',
        component: () => import('#/views/plat/merchant/merchant/index.vue'),
        meta: {
          icon: 'lucide:store',
          title: $t('page.merchant.merchant') || '商户管理',
          authority: [PERMISSIONS.PLAT.MERCHANT.MERCHANT.ROUTE],
        },
      }
    ],
  },
   {
    name: 'MerchantHome',
    path: '/merchant',
    redirect: '/info',
    meta: {
      icon: 'lucide:store',
      title: $t('page.merchant.center') || '商户中心',
      order: 90,
      authority: [PERMISSIONS.MERCHANT.MERCHANT.MANAGE],
    },
    children: [
      {
        name: 'MerchantInfo',
        path: 'info',
        component: () => import('#/views/merchant/merchant/info/index.vue'),
        meta: {
          icon: 'lucide:settings',
          title: $t('page.merchant.info') || '商户信息',
          authority: [PERMISSIONS.MERCHANT.MERCHANT.INFO.ROUTE],
        },
      },
    ],
  },
];

export default routes;
