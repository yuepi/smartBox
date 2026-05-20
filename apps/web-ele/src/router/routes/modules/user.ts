import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'PlatUser',
    path: '/plat/user',
    redirect: "/user",
    meta: {
      icon: 'lucide:settings',
      title: $t('page.user.title') || '用户管理',
      order: 100,
      authority: ['plat:manage:user'],
    },
    children: [
      {
        name: 'UserManagement',
        path: '/user',
        component: () => import('#/views/plat/user/user/index.vue'),
        meta: {
          icon: 'lucide:users',
          title: $t('page.user.user') || '用户管理',
          authority: ['plat:user'],
        },
      },
      {
        name: 'RoleManagement',
        path: '/role',
        component: () => import('#/views/plat/user/role/index.vue'),
        meta: {
          icon: 'lucide:shield-check',
          title: $t('page.user.role') || '角色管理',
          authority: ['plat:role'],
        },
      },
      {
        name: 'MenuManagement',
        path: '/menu',
        component: () => import('#/views/plat/user/menu/index.vue'),
        meta: {
          icon: 'lucide:menu',
          title: $t('page.user.menu') || '菜单管理',
          authority: ['plat:menu'],
        },
      },
      {
        name: 'DeptManagement',
        path: '/dept',
        component: () => import('#/views/plat/user/dept/index.vue'),
        meta: {
          icon: 'lucide:network',
          title: $t('page.user.dept') || '部门管理',
          authority: ['plat:dept'],
        },
      },
    ],
  },
  {
    name: 'MerchantUser',
    path: '/merchant/user',
    redirect: "/user",
    meta: {
      icon: 'lucide:settings',
      title: $t('page.user.title') || '用户管理',
      order: 100,
      authority: ['merchant:manage:user'],
    },
    children: [
      {
        name: 'UserManagement',
        path: '/user',
        component: () => import('#/views/merchant/user/user/index.vue'),
        meta: {
          icon: 'lucide:users',
          title: $t('page.user.user') || '用户管理',
          authority: ['merchant:user'],
        },
      },
      {
        name: 'RoleManagement',
        path: '/role',
        component: () => import('#/views/merchant/user/role/index.vue'),
        meta: {
          icon: 'lucide:shield-check',
          title: $t('page.user.role') || '角色管理',
          authority: ['merchant:role'],
        },
      },
      {
        name: 'MenuManagement',
        path: '/menu',
        component: () => import('#/views/merchant/user/menu/index.vue'),
        meta: {
          icon: 'lucide:menu',
          title: $t('page.user.menu') || '菜单管理',
          authority: ['merchant:menu'],
        },
      },
      {
        name: 'DeptManagement',
        path: '/dept',
        component: () => import('#/views/merchant/user/dept/index.vue'),
        meta: {
          icon: 'lucide:network',
          title: $t('page.user.dept') || '部门管理',
          authority: ['merchant:dept'],
        },
      },
    ],
  },
];

export default routes;
