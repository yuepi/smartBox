import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'DataScreen',
    path: '/datascreen',
    component: () => import('#/views/dashboard/datascreen/index.vue'),
    meta: {
      icon: 'lucide:monitor',
      title: $t('page.dashboard.datascreen'),
      noBasicLayout: true,
    },
  },
];

export default routes;
