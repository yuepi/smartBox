import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:users',
      title: $t('page.member.title') || '会员财务',
      order: 30,
      authority: ['merchant:manage:finance'],
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
          authority: ['merchant:member:list'],
        },
      },
      {
        name: 'MemberWallet',
        path: '/wallet',
        component: () => import('#/views/merchant/member/wallet/index.vue'),
        meta: {
          icon: 'lucide:wallet',
          title: $t('page.member.wallet') || '会员钱包',
          authority: ['merchant:member:wallet'],
        },
      },
      {
        name: 'MemberWalletFlow',
        path: '/walletFlow',
        component: () => import('#/views/merchant/member/walletFlow/index.vue'),
        meta: {
          icon: 'lucide:repeat',
          title: $t('page.member.walletFlow') || '会员流水',
          authority: ['merchant:member:flow'],
        },
      },
      {
        name: 'MemberWithdraw',
        path: '/withdraw',
        component: () => import('#/views/merchant/member/withdraw/index.vue'),
        meta: {
          icon: 'lucide:banknote',
          title: $t('page.member.withdraw') || '提现审核',
          authority: ['merchant:member:withdraw'],
        },
      },
    ],
  },
];

export default routes;
