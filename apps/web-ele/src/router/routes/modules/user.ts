import type { RouteRecordRaw } from 'vue-router';

import { PERMISSIONS } from '#/constants/auth';
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
      authority: [PERMISSIONS.PLAT.USER_GROUP.MANAGE],
    },
    children: [
      {
        name: 'UserManagement',
        path: '/user',
        component: () => import('#/views/plat/user/user/index.vue'),
        meta: {
          icon: 'lucide:users',
          title: $t('page.user.user') || '用户管理',
          authority: [PERMISSIONS.PLAT.USER_GROUP.USER.ROUTE],
        },
      },
      {
        name: 'RoleManagement',
        path: '/role',
        component: () => import('#/views/plat/user/role/index.vue'),
        meta: {
          icon: 'lucide:shield-check',
          title: $t('page.user.role') || '角色管理',
          authority: [PERMISSIONS.PLAT.USER_GROUP.ROLE.ROUTE],
        },
      },
      {
        name: 'MenuManagement',
        path: '/menu',
        component: () => import('#/views/plat/user/menu/index.vue'),
        meta: {
          icon: 'lucide:menu',
          title: $t('page.user.menu') || '菜单管理',
          authority: [PERMISSIONS.PLAT.USER_GROUP.MENU.ROUTE],
        },
      },
      {
        name: 'DeptManagement',
        path: '/dept',
        component: () => import('#/views/plat/user/dept/index.vue'),
        meta: {
          icon: 'lucide:network',
          title: $t('page.user.dept') || '部门管理',
          authority: [PERMISSIONS.PLAT.USER_GROUP.DEPT.ROUTE],
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
      authority: [PERMISSIONS.MERCHANT.USER_GROUP.MANAGE],
    },
    children: [
      {
        name: 'UserManagement',
        path: '/user',
        component: () => import('#/views/merchant/user/user/index.vue'),
        meta: {
          icon: 'lucide:users',
          title: $t('page.user.user') || '用户管理',
          authority: [PERMISSIONS.MERCHANT.USER_GROUP.USER.ROUTE],
        },
      },
      {
        name: 'RoleManagement',
        path: '/role',
        component: () => import('#/views/merchant/user/role/index.vue'),
        meta: {
          icon: 'lucide:shield-check',
          title: $t('page.user.role') || '角色管理',
          authority: [PERMISSIONS.MERCHANT.USER_GROUP.ROLE.ROUTE],
        },
      },
      {
        name: 'MenuManagement',
        path: '/menu',
        component: () => import('#/views/merchant/user/menu/index.vue'),
        meta: {
          icon: 'lucide:menu',
          title: $t('page.user.menu') || '菜单管理',
          authority: [PERMISSIONS.MERCHANT.USER_GROUP.MENU.ROUTE],
        },
      },
      {
        name: 'DeptManagement',
        path: '/dept',
        component: () => import('#/views/merchant/user/dept/index.vue'),
        meta: {
          icon: 'lucide:network',
          title: $t('page.user.dept') || '部门管理',
          authority: [PERMISSIONS.MERCHANT.USER_GROUP.DEPT.ROUTE],
        },
      },
    ],
  },
];

export default routes;
