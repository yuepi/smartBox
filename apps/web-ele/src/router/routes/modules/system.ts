import type { RouteRecordRaw } from 'vue-router';

import { PERMISSIONS } from '#/constants/auth';
import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'PlatSystem',
    path: '/plat/system',
    redirect: '/log',
    meta: {
      icon: 'lucide:settings',
      title: $t('page.system.title') || '系统管理',
      order: 100,
      authority: [PERMISSIONS.PLAT.SYSTEM.MANAGE],
    },
    children: [
      {
        name: 'DictManagement',
        path: '/dict',
        component: () => import('#/views/plat/system/dict/index.vue'),
        meta: {
          icon: 'lucide:book-open',
          title: $t('page.system.dict') || '数据字典',
          order: 10,
          authority: [PERMISSIONS.PLAT.SYSTEM.DICT.ROUTE],
        },
      },
      {
        name: 'LogManagement',
        path: '/log',
        meta: {
          icon: 'lucide:monitor',
          title: $t('page.monitor.title') || '日志管理',
          order: 20,
          authority: [PERMISSIONS.PLAT.SYSTEM.LOG.MANAGE],
        },
        children: [
          {
            name: 'LoginLog',
            path: '/login-log',
            component: () => import('#/views/plat/system/log/login/index.vue'),
            meta: {
              icon: 'lucide:log-in',
              title: $t('page.monitor.loginLog') || '登录日志',
              authority: [PERMISSIONS.PLAT.SYSTEM.LOG.LOGIN.ROUTE],
            },
          },
          {
            name: 'OperateLog',
            path: '/operate-log',
            component: () =>
              import('#/views/plat/system/log/operate/index.vue'),
            meta: {
              icon: 'lucide:clipboard-list',
              title: $t('page.monitor.operationLog') || '操作日志',
              authority: [PERMISSIONS.PLAT.SYSTEM.LOG.OPERATE.ROUTE],
            },
          },
        ],
      },
      {
        name: 'OssManagement',
        path: '/oss',
        component: () => import('#/views/plat/system/oss/index.vue'),
        meta: {
          icon: 'lucide:cloud-upload',
          title: $t('page.system.oss') || '对象存储',
          authority: [PERMISSIONS.PLAT.SYSTEM.OSS.ROUTE],
        },
      },
    ],
  },
  {
    name: 'MerchantSystem',
    path: '/merchant/system',
    redirect: '/log',
    meta: {
      icon: 'lucide:settings',
      title: $t('page.system.title') || '系统管理',
      order: 100,
      authority: [PERMISSIONS.MERCHANT.SYSTEM.MANAGE],
    },
    children: [
      {
        name: 'LogManagement',
        path: '/log',
        meta: {
          icon: 'lucide:monitor',
          title: $t('page.monitor.title') || '日志管理',
          order: 90,
          authority: [PERMISSIONS.MERCHANT.SYSTEM.LOG_GROUP.MANAGE],
        },
        children: [
          {
            name: 'LoginLog',
            path: '/login-log',
            component: () =>
              import('#/views/merchant/system/log/login/index.vue'),
            meta: {
              icon: 'lucide:log-in',
              title: $t('page.monitor.loginLog') || '登录日志',
              authority: [
                PERMISSIONS.MERCHANT.SYSTEM.LOG_GROUP.LOGIN_LOG.ROUTE,
              ],
            },
          },
          {
            name: 'OperateLog',
            path: '/operate-log',
            component: () =>
              import('#/views/merchant/system/log/operate/index.vue'),
            meta: {
              icon: 'lucide:clipboard-list',
              title: $t('page.monitor.operationLog') || '操作日志',
              authority: [
                PERMISSIONS.MERCHANT.SYSTEM.LOG_GROUP.OPERATE_LOG.ROUTE,
              ],
            },
          },
        ],
      },
    ],
  },
];

export default routes;
