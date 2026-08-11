import type { RouteRecordRaw } from 'vue-router';

import { PERMISSIONS } from '#/constants/auth';
import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:cpu',
      title: $t('page.device.title') || '设备管理',
      order: 10,
      authority: [PERMISSIONS.MERCHANT.DEVICE.MANAGE],
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
          authority: [PERMISSIONS.MERCHANT.DEVICE.LIST.ROUTE],
        },
      },
      {
        name: 'DeviceConfig',
        path: '/deviceConfig',
        component: () => import('#/views/merchant/device/config/index.vue'),
        meta: {
          icon: 'lucide:settings',
          title: $t('page.device.config') || '设备配置',
          authority: [PERMISSIONS.MERCHANT.DEVICE.CONFIG.ROUTE],
        },
      },
      {
        name: 'DeviceHatch',
        path: '/deviceHatch',
        component: () => import('#/views/merchant/device/hatch/index.vue'),
        meta: {
          icon: 'lucide:layout-grid',
          title: $t('page.device.hatch') || '仓口配置',
          authority: [PERMISSIONS.MERCHANT.DEVICE.HATCH.ROUTE],
        },
      },
      {
        name: 'DeviceBag',
        path: '/deviceBag',
        component: () => import('#/views/merchant/device/bag/index.vue'),
        meta: {
          icon: 'lucide:shopping-bag',
          title: $t('page.device.bag') || '包袋管理',
          authority: [PERMISSIONS.MERCHANT.DEVICE.BAG.ROUTE],
        },
      },
      {
        name: 'DevicePackage',
        path: '/devicePackage',
        component: () => import('#/views/merchant/device/package/index.vue'),
        meta: {
          icon: 'lucide:calculator',
          title: $t('page.device.package') || '计费套餐',
          authority: [PERMISSIONS.MERCHANT.DEVICE.PACKAGE.ROUTE],
        },
      },
      {
        name: 'DeviceFault',
        path: '/deviceFault',
        component: () => import('#/views/merchant/device/fault/index.vue'),
        meta: {
          icon: 'lucide:alert-triangle',
          title: $t('page.device.fault') || '设备故障',
          authority: [PERMISSIONS.MERCHANT.DEVICE.FAULT.ROUTE],
        },
      },
      {
        name: 'QrCode',
        path: '/qrCode',
        component: () => import('#/views/merchant/device/qrCode/index.vue'),
        meta: {
          icon: 'lucide:qr-code',
          title: $t('page.device.qrCode') || '二维码',
          authority: [PERMISSIONS.MERCHANT.DEVICE.QRCODE.ROUTE],
        },
      },
    ],
  },
];

export default routes;
