// MANAGE为父级路由（目录），ROUTE为子级路由（具体页面），ADD、EDIT、DEL为操作权限
export const PLAT_PERMISSIONS = {
  /** 用户管理（父级目录） */
  USER_GROUP: {
    MANAGE: 'plat:manage:user',
    USER: {
      ROUTE: 'plat:user',
      ADD: 'plat:user:add',
      EDIT: 'plat:user:edit',
      DEL: 'plat:user:del',
      EXPORT: 'plat:user:export',
    },
    ROLE: {
      ROUTE: 'plat:role',
      ADD: 'plat:role:add',
      EDIT: 'plat:role:edit',
      DEL: 'plat:role:del',
      EXPORT: 'plat:role:export',
    },
    MENU: {
      ROUTE: 'plat:menu',
      ADD: 'plat:menu:add',
      EDIT: 'plat:menu:edit',
      DEL: 'plat:menu:del',
      EXPORT: 'plat:menu:export',
    },
    DEPT: {
      ROUTE: 'plat:dept',
      ADD: 'plat:dept:add',
      EDIT: 'plat:dept:edit',
      DEL: 'plat:dept:del',
      EXPORT: 'plat:dept:export',
    },
  },

  /** 系统管理 */
  SYSTEM: {
    MANAGE: 'plat:manage:system',
    DICT: {
      ROUTE: 'plat:system:dict',
    },
    OSS: {
      ROUTE: 'plat:system:oss',
    },
    LOG: {
      MANAGE: 'plat:manage:log',
      LOGIN: {
        ROUTE: 'plat:log:login',
      },
      OPERATE: {
        ROUTE: 'plat:log:operate',
      },
    },
  },

  /** 商户管理 */
  MERCHANT: {
    MANAGE: 'plat:manage:merchant',
    MERCHANT: {
      ROUTE: 'plat:merchant',
    },
  },
} as const;
