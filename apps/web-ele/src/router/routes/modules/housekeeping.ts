import type { RouteRecordRaw } from 'vue-router';

/** 两个独立业务菜单组；保留原订单URL，平台功能按平台权限单独过滤。 */
const housekeepingRoutes: RouteRecordRaw[] = [
  {
    name: 'OnsiteRecycle',
    path: '/onsite-recycle',
    meta: { icon: 'lucide:home', title: '上门回收', order: 29 },
    children: [
      {
        name: 'OnsiteRecycleOrder',
        path: '/housekeeping/onsite-recycle',
        component: () =>
          import('#/views/merchant/housekeeping/onsite/index.vue'),
        meta: {
          title: '预约订单',
          order: 10,
          authority: ['merchant:onsiteRecycleOrder:view'],
        },
      },
      {
        name: 'OnsiteRecycleScope',
        path: '/housekeeping/onsite-scope',
        component: () =>
          import('#/views/merchant/housekeeping/onsite/ScopePage.vue'),
        meta: {
          title: '可收类目配置',
          order: 20,
          authority: ['merchant:onsiteRecycleOrder:scope'],
        },
      },
      {
        name: 'OnsiteRecycleBookingRule',
        path: '/housekeeping/onsite-booking-rule',
        component: () =>
          import('#/views/merchant/housekeeping/onsite/BookingRulePage.vue'),
        meta: {
          title: '预约规则',
          order: 25,
          authority: ['merchant:onsiteRecycleOrder:scope'],
        },
      },
      {
        name: 'OnsiteRecycleCatalog',
        path: '/plat/onsite-recycle/catalog',
        component: () => import('#/views/plat/onsite/CatalogPage.vue'),
        meta: {
          title: '回收类目管理',
          order: 30,
          authority: ['plat:onsiteRecycleItem:view'],
        },
      },
      {
        name: 'OnsiteRecycleSupervision',
        path: '/plat/onsite-recycle/orders',
        component: () =>
          import('#/views/merchant/housekeeping/onsite/index.vue'),
        props: { platform: true },
        meta: {
          title: '订单监管',
          order: 40,
          authority: ['plat:onsiteRecycleOrder:view'],
        },
      },
    ],
  },
  {
    name: 'Housekeeping',
    path: '/housekeeping',
    meta: { icon: 'lucide:home', title: '上门家政', order: 30 },
    children: [
      {
        name: 'HousekeepingOrder',
        path: '/housekeeping/order',
        component: () =>
          import('#/views/merchant/housekeeping/order/OrderPage.vue'),
        meta: {
          title: '服务订单',
          // 快捷筛选只改变查询参数，不新增一张服务订单标签页。
          fullPathKey: false,
          order: 10,
          authority: ['merchant:homeOrder:view'],
        },
      },
      {
        name: 'HousekeepingRefund',
        path: '/housekeeping/refund',
        // 兼容旧书签，退款统一进入服务订单，不再保留独立菜单和标签页。
        redirect: { path: '/housekeeping/order', query: { refundOnly: '1' } },
        meta: {
          title: '服务订单',
          hideInMenu: true,
          hideInTab: true,
          order: 20,
          authority: ['merchant:homeOrder:view'],
        },
      },
      {
        name: 'HousekeepingItem',
        path: '/housekeeping/item',
        component: () => import('#/views/merchant/housekeeping/item/index.vue'),
        meta: {
          title: '服务项目与规格',
          order: 30,
          authority: ['merchant:homeItem:view'],
        },
      },
      // 合作配置入口仅保留平台“商户合作关系”，商户侧不再展示自助绑定菜单。
      {
        name: 'HousekeepingBookingRule',
        path: '/housekeeping/booking-rule',
        component: () =>
          import('#/views/merchant/housekeeping/order/BookingRulePage.vue'),
        meta: {
          title: '预约规则',
          order: 45,
          authority: ['merchant:homeItem:view'],
        },
      },
      {
        name: 'HousekeepingCategoryManagement',
        path: '/plat/housekeeping/categories',
        component: () => import('#/views/plat/system/homeCategory/index.vue'),
        meta: {
          title: '服务类目',
          order: 50,
          authority: ['plat:homeCategory:view'],
        },
      },
      {
        name: 'HousekeepingMerchants',
        path: '/plat/housekeeping/merchants',
        component: () => import('#/views/plat/onsite/HomeMerchantsPage.vue'),
        meta: {
          title: '家政商户',
          order: 60,
          authority: ['plat:homeMerchant:view'],
        },
      },
      {
        name: 'HousekeepingRelations',
        path: '/plat/housekeeping/relations',
        component: () =>
          import('#/views/merchant/housekeeping/partners/PartnersPage.vue'),
        props: { platform: true },
        meta: {
          title: '商户合作关系',
          order: 70,
          authority: ['plat:homeMerchant:view'],
        },
      },
      {
        name: 'HousekeepingSupervision',
        path: '/plat/housekeeping/orders',
        component: () =>
          import('#/views/merchant/housekeeping/order/OrderPage.vue'),
        props: { platform: true },
        meta: {
          title: '订单监管',
          order: 80,
          authority: ['plat:homeOrder:view'],
        },
      },
    ],
  },
];
export default housekeepingRoutes;
