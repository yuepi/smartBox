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

  STOCK: {
    /** 库存管理-父级目录 */
    MANAGE: 'merchant:manage:stock',

    /** 仓库管理 */
    WAREHOUSE: {
      ROUTE: 'merchant:stock:warehouse',
      ADD: 'merchant:stock:warehouse:add',
      EDIT: 'merchant:stock:warehouse:edit',
      DEL: 'merchant:stock:warehouse:del',
      // 货位操作
      LOCATION_ADD: 'merchant:stock:location:add',
      LOCATION_EDIT: 'merchant:stock:location:edit',
      LOCATION_DEL: 'merchant:stock:location:del',
    },

    /** 客户管理（回收商） */
    CUSTOMER: {
      ROUTE: 'merchant:stock:customer',
      ADD: 'merchant:stock:customer:add',
      EDIT: 'merchant:stock:customer:edit',
      DEL: 'merchant:stock:customer:del',
    },

    /** 入库管理 */
    IN: {
      ROUTE: 'merchant:stock:in',
      ADD: 'merchant:stock:in:add',
      EDIT: 'merchant:stock:in:edit',
      DEL: 'merchant:stock:in:del',
      SUBMIT: 'merchant:stock:in:submit', // 提交入库
      DETAIL: 'merchant:stock:in:detail',
    },

    /** 出库管理 */
    OUT: {
      ROUTE: 'merchant:stock:out',
      ADD: 'merchant:stock:out:add',
      EDIT: 'merchant:stock:out:edit',
      DEL: 'merchant:stock:out:del',
      SUBMIT: 'merchant:stock:out:submit', // 提交出库
      CANCEL: 'merchant:stock:out:cancel', // 取消出库
      DETAIL: 'merchant:stock:out:detail',
    },

    /** 库存查询 */
    CURRENT: {
      ROUTE: 'merchant:stock:current',
      DETAIL: 'merchant:stock:current:detail',
      EXPORT: 'merchant:stock:current:export',
    },

    /** 库存盘点 */
    CHECK: {
      ROUTE: 'merchant:stock:check',
      ADD: 'merchant:stock:check:add', // 创建盘点单
      EDIT: 'merchant:stock:check:edit',
      DEL: 'merchant:stock:check:del',
      EXECUTE: 'merchant:stock:check:execute', // 执行盘点
      CONFIRM: 'merchant:stock:check:confirm', // 确认盘点
      DETAIL: 'merchant:stock:check:detail',
    },
  },
} as const;
