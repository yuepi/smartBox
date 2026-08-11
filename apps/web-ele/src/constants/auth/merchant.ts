// MANAGE为父级路由（目录），ROUTE为子级路由（具体页面），ADD、EDIT、DEL为操作权限
export const MERCHANT_PERMISSIONS = {
  /** 用户管理（父级目录） */
  USER_GROUP: {
    MANAGE: 'merchant:manage:user', // 父级目录
    USER: {
      ROUTE: 'merchant:user',
      ADD: 'merchant:user:add',
      EDIT: 'merchant:user:edit',
      DEL: 'merchant:user:del',
    },
    /** 部门管理 */
    DEPT: {
      ROUTE: 'merchant:dept',
      ADD: 'merchant:dept:add',
      EDIT: 'merchant:dept:edit',
      DEL: 'merchant:dept:del',
    },

    /** 菜单管理 */
    MENU: {
      ROUTE: 'merchant:menu',
      ADD: 'merchant:menu:add',
      EDIT: 'merchant:menu:edit',
      DEL: 'merchant:menu:del',
    },

    /** 角色管理 */
    ROLE: {
      ROUTE: 'merchant:role',
      ADD: 'merchant:role:add',
      EDIT: 'merchant:role:edit',
      DEL: 'merchant:role:del',
    },
  },

  /** 系统管理分组 */
  SYSTEM: {
    MANAGE: 'merchant:manage:system',
    LOG_GROUP: {
      MANAGE: 'merchant:manage:log',
      LOGIN_LOG: {
        ROUTE: 'merchant:log:login',
      },
      OPERATE_LOG: {
        ROUTE: 'merchant:log:operate',
      },
    },
  },

  /** 商户中心 */
  MERCHANT: {
    MANAGE: 'merchant:manage:merchant',
    INFO: {
      ROUTE: 'merchant:merchant:detail',
    },
  },

  /** 运营管理 */
  OPERATE: {
    MANAGE: 'merchant:manage:operate',
    RECYCLE_ORDER: {
      ROUTE: 'merchant:recycle:order',
    },
    CLEAN_TASK: {
      ROUTE: 'merchant:recycle:cleanTask',
    },
    SORT_TASK: {
      ROUTE: 'merchant:recycle:sortTask',
    },
  },

  /** 会员财务 */
  MEMBER: {
    MANAGE: 'merchant:manage:finance',
    LIST: {
      ROUTE: 'merchant:member:list',
    },
    WALLET: {
      ROUTE: 'merchant:member:wallet',
    },
    FLOW: {
      ROUTE: 'merchant:member:flow',
    },
    WITHDRAW: {
      ROUTE: 'merchant:member:withdraw',
    },
  },

  /** 设备管理 */
  DEVICE: {
    MANAGE: 'merchant:manage:device',
    LIST: {
      ROUTE: 'merchant:device',
    },
    CONFIG: {
      ROUTE: 'merchant:device:config',
    },
    HATCH: {
      ROUTE: 'merchant:device:hatch',
    },
    BAG: {
      ROUTE: 'merchant:device:bag',
    },
    PACKAGE: {
      ROUTE: 'merchant:device:package',
    },
    FAULT: {
      ROUTE: 'merchant:device:fault',
    },
    QRCODE: {
      ROUTE: 'merchant:qrcode',
    },
  },
} as const;
