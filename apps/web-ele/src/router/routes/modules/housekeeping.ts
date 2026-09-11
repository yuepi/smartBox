import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const housekeepingRoutes: RouteRecordRaw[] = [
  {
    name: 'Housekeeping',
    path: '/housekeeping',
    redirect: '/housekeeping/order',
    meta: {
      icon: 'lucide:home',
      title: $t('page.housekeeping.title') || '家政服务',
      order: 30,
      // authority: [PERMISSIONS.MERCHANT.HOUSEKEEPING.MANAGE],
    },
    children: [
      {
        name: 'HousekeepingOrder',
        path: '/housekeeping/order',
        component: () => import('#/views/merchant/housekeeping/order/index.vue'),
        meta: {
          icon: 'lucide:file-text',
          title: $t('page.housekeeping.order') || '家政订单',
          order: 10,
          // authority: [PERMISSIONS.MERCHANT.HOUSEKEEPING.ORDER.ROUTE],
        },
      },
      {
        name: 'HousekeepingItem',
        path: '/housekeeping/item',
        component: () => import('#/views/merchant/housekeeping/item/index.vue'),
        meta: {
          icon: 'lucide:layers',
          title: $t('page.housekeeping.item') || '服务项配置',
          order: 20,
          // authority: [PERMISSIONS.MERCHANT.HOUSEKEEPING.ITEM.ROUTE],
        },
      },
    ],
  },
];

export default housekeepingRoutes;
