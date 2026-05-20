import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:cpu',
      title: $t('page.device.title') || '设备管理',
      order: 10,
      authority: ['merchant:manage:device'],
    },
    name: 'DeviceManagement',
    path: 'merchant/device',
    redirect: '/device',
    children: [
      {
        name: 'DeviceList',
        path: '/device',
        component: () => import('#/views/merchant/device/device/index.vue'),
        meta: {
          icon: 'lucide:box',
          title: $t('page.device.list') || '设备管理',
          authority: ['merchant:device'],
        },
      },
      {
        name: 'DeviceConfig',
        path: '/deviceConfig',
        component: () => import('#/views/merchant/device/config/index.vue'),
        meta: {
          icon: 'lucide:settings',
          title: $t('page.device.config') || '设备配置',
          authority: ['merchant:device:config'],
        },
      },
      {
        name: 'DeviceHatch',
        path: '/deviceHatch',
        component: () => import('#/views/merchant/device/hatch/index.vue'),
        meta: {
          icon: 'lucide:layout-grid',
          title: $t('page.device.hatch') || '仓口配置',
          authority: ['merchant:device:hatch'],
        },
      },
      {
        name: 'DeviceBag',
        path: '/deviceBag',
        component: () => import('#/views/merchant/device/bag/index.vue'),
        meta: {
          icon: 'lucide:shopping-bag',
          title: $t('page.device.bag') || '包袋管理',
          authority: ['merchant:device:bag'],
        },
      },
      {
        name: 'DevicePackage',
        path: '/devicePackage',
        component: () => import('#/views/merchant/device/package/index.vue'),
        meta: {
          icon: 'lucide:calculator',
          title: $t('page.device.package') || '计费套餐',
          authority: ['merchant:device:package'],
        },
      },
      {
        name: 'DeviceFault',
        path: '/deviceFault',
        component: () => import('#/views/merchant/device/fault/index.vue'),
        meta: {
          icon: 'lucide:alert-triangle',
          title: $t('page.device.fault') || '设备故障',
          authority: ['merchant:device:fault'],
        },
      },
      {
        name: 'QrCode',
        path: '/qrCode',
        component: () => import('#/views/merchant/device/qrCode/index.vue'),
        meta: {
          icon: 'lucide:qr-code',
          title: $t('page.device.qrCode') || '二维码',
          authority: ['merchant:qrcode'],
        },
      },
    ],
  },
];

export default routes;
