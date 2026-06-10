import type { RouteRecordRaw } from "vue-router";

import { $t } from "#/locales";

const routes: RouteRecordRaw[] = [
  {
    name: "PlatSystem",
    path: "/plat/system",
    redirect: "/log",
    meta: {
      icon: "lucide:settings",
      title: $t("page.system.title") || "系统管理",
      order: 100,
      authority: ["plat:manage:system"],
    },
    children: [
      {
        name: "DictManagement",
        path: "/dict",
        component: () => import("#/views/plat/system/dict/index.vue"),
        meta: {
          icon: "lucide:book-open",
          title: $t("page.system.dict") || "数据字典",
           order: 10,
          authority: ["plat:system:dict"],
        },
      },
      {
        name: "LogManagement",
        path: "/log",
        meta: {
          icon: "lucide:monitor",
          title: $t("page.monitor.title") || "日志管理",
          order: 20,
          authority: ["plat:manage:log"],
        },
        children: [
          {
            name: "LoginLog",
            path: "/login-log",
            component: () => import("#/views/plat/system/log/login/index.vue"),
            meta: {
              icon: "lucide:log-in",
              title: $t("page.monitor.loginLog") || "登录日志",
              authority: ["plat:log:login"],
            },
          },
          {
            name: "OperateLog",
            path: "/operate-log",
            component: () => import("#/views/plat/system/log/operate/index.vue"),
            meta: {
              icon: "lucide:clipboard-list",
              title: $t("page.monitor.operationLog") || "操作日志",
              authority: ["plat:log:operate"],
            },
          },
        ],
      },
       {
            name: "OssManagement",
            path: "/oss",
            component: () => import("#/views/plat/system/oss/index.vue"),
            meta: {
              icon: "lucide:cloud-upload",
              title: $t("page.system.oss") || "对象存储",
              authority: ["plat:system:oss"],
            },
          },
    ],
  },
  {
    name: "MerchantSystem",
    path: "/merchant/system",
    redirect: "/log",
    meta: {
      icon: "lucide:settings",
      title: $t("page.system.title") || "系统管理",
      order: 100,
      authority: ["merchant:manage:system"],
    },
    children: [
      {
        name: "LogManagement",
        path: "/log",
        meta: {
          icon: "lucide:monitor",
          title: $t("page.monitor.title") || "日志管理",
          order: 90,
          authority: ["merchant:manage:log"],
        },
        children: [
          {
            name: "LoginLog",
            path: "/login-log",
            component: () => import("#/views/merchant/system/log/login/index.vue"),
            meta: {
              icon: "lucide:log-in",
              title: $t("page.monitor.loginLog") || "登录日志",
              authority: ["merchant:log:login"],
            },
          },
          {
            name: "OperateLog",
            path: "/operate-log",
            component: () => import("#/views/merchant/system/log/operate/index.vue"),
            meta: {
              icon: "lucide:clipboard-list",
              title: $t("page.monitor.operationLog") || "操作日志",
              authority: ["merchant:log:operate"],
            },
          },
        ],
      },
    ],
  },
];

export default routes;
