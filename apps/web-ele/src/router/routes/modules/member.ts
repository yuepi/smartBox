import type { RouteRecordRaw } from 'vue-router';

import { PERMISSIONS } from '#/constants/auth';
import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:users',
      title: $t('page.member.title') || '会员财务',
      order: 30,
      authority: [PERMISSIONS.MERCHANT.MEMBER.MANAGE],
    },
    name: 'MemberManagement',
    path: 'merchant/member',
    redirect: '/member',
    children: [
      {
        name: 'MemberList',
        path: '/member',
        component: () => import('#/views/merchant/member/list/index.vue'),
        meta: {
          icon: 'lucide:user-round',
          title: $t('page.member.list') || '会员列表',
          authority: [PERMISSIONS.MERCHANT.MEMBER.LIST.ROUTE],
        },
      },
      {
        name: 'MemberWithdraw',
        path: '/withdraw',
        component: () => import('#/views/merchant/member/withdraw/index.vue'),
        meta: {
          icon: 'lucide:banknote',
          title: $t('page.member.withdraw') || '提现审核',
          authority: [PERMISSIONS.MERCHANT.MEMBER.WITHDRAW.ROUTE],
        },
      },
    ],
  },
];

export default routes;
