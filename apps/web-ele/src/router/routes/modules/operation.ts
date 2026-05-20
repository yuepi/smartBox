import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:clipboard-list',
      title: $t('page.operate.title') || '运营管理',
      order: 20,
      authority: ['merchant:manage:operate'],
    },
    name: 'OperationManagement',
    path: 'merchant/operate',
    redirect: '/recycleOrder',
    children: [
      {
        name: 'RecycleOrder',
        path: '/recycleOrder',
        component: () => import('#/views/merchant/operate/recycleOrder/index.vue'),
        meta: {
          icon: 'lucide:shopping-cart',
          title: $t('page.operate.recycleOrder') || '回收订单',
          authority: ['merchant:recycle:order'],
        },
      },
      {
        name: 'CleanTask',
        path: '/cleanTask',
        component: () => import('#/views/merchant/operate/cleanTask/index.vue'),
        meta: {
          icon: 'lucide:truck',
          title: $t('page.operate.cleanTask') || '清运任务',
          authority: ['merchant:recycle:cleanTask'],
        },
      },
      {
        name: 'SortTask',
        path: '/sortTask',
        component: () => import('#/views/merchant/operate/sortTask/index.vue'),
        meta: {
          icon: 'lucide:filter',
          title: $t('page.operate.sortTask') || '分拣任务',
          authority: ['merchant:recycle:sortTask'],
        },
      },
    ],
  },
];

export default routes;
