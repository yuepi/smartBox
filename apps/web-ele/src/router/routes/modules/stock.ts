// routes/modules/stock.ts
import type { RouteRecordRaw } from 'vue-router';

import { PERMISSIONS } from '#/constants/auth';
import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'StockManagement',
    path: '/stock',
    redirect: '/stock/in',
    meta: {
      icon: 'lucide:warehouse',
      title: $t('page.stock.title') || '库存管理',
      order: 30,
      authority: [PERMISSIONS.MERCHANT.STOCK.MANAGE],
    },
    children: [
      // 1. 仓库管理（含货位）
      {
        name: 'Warehouse',
        path: 'warehouse',
        component: () => import('#/views/merchant/stock/warehouse/index.vue'),
        meta: {
          icon: 'lucide:building-2',
          title: $t('page.stock.warehouse') || '仓库管理',
          authority: [PERMISSIONS.MERCHANT.STOCK.WAREHOUSE.ROUTE],
        },
      },
      // 2. 客户管理（回收商）
      {
        name: 'Customer',
        path: 'customer',
        component: () => import('#/views/merchant/stock/customer/index.vue'),
        meta: {
          icon: 'lucide:users',
          title: $t('page.stock.customer') || '客户管理',
          authority: [PERMISSIONS.MERCHANT.STOCK.CUSTOMER.ROUTE],
        },
      },
      // 3. 入库管理
      {
        name: 'StockIn',
        path: 'in',
        component: () => import('#/views/merchant/stock/in/index.vue'),
        meta: {
          icon: 'lucide:arrow-down-to-line',
          title: $t('page.stock.in') || '入库管理',
          authority: [PERMISSIONS.MERCHANT.STOCK.IN.ROUTE],
        },
      },
      // 4. 出库管理
      {
        name: 'StockOut',
        path: 'out',
        component: () => import('#/views/merchant/stock/out/index.vue'),
        meta: {
          icon: 'lucide:arrow-up-from-line',
          title: $t('page.stock.out') || '出库管理',
          authority: [PERMISSIONS.MERCHANT.STOCK.OUT.ROUTE],
        },
      },
      // 5. 库存查询
      {
        name: 'StockCurrent',
        path: 'current',
        component: () => import('#/views/merchant/stock/current/index.vue'),
        meta: {
          icon: 'lucide:package-search',
          title: $t('page.stock.current') || '库存查询',
          authority: [PERMISSIONS.MERCHANT.STOCK.CURRENT.ROUTE],
        },
      },
      // 6. 库存盘点
      {
        name: 'StockCheck',
        path: 'check',
        component: () => import('#/views/merchant/stock/check/index.vue'),
        meta: {
          icon: 'lucide:clipboard-check',
          title: $t('page.stock.check') || '库存盘点',
          authority: [PERMISSIONS.MERCHANT.STOCK.CHECK.ROUTE],
        },
      },
    ],
  },
];

export default routes;
