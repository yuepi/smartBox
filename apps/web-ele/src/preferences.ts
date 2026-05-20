import { defineOverridesPreferences } from '@vben/preferences';

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    name: import.meta.env.VITE_APP_TITLE,
    layout: 'header-nav',
     // 是否开启检查更新
    enableCheckUpdates: true,
    // 检查更新的时间间隔，单位为分钟
    checkUpdatesInterval: 1,
    // 登录过期模式，modal 弹窗提示，redirect 重定向到登录页
    loginExpiredMode: 'modal',
  },
  logo: {
    source: import.meta.env.VITE_APP_LOGO,
    sourceDark: import.meta.env.VITE_APP_LOGO_DARK,
  },
   header: {
    menuAlign: "center",
  },
  tabbar:{
    showRefresh: false,
    showMaximize: false,
  },
  theme: {
    builtinType: "green",
    colorPrimary: "hsl(161 90% 43%)",
    mode: "light"
  },
  widget: {
    themeToggle: false,
    sidebarToggle: false,
    timezone: false,
  },
   copyright: {
    companyName: '慧小分',
    companySiteLink: 'https://tadmin.huiyifamily.com',
    date: '2026',
    enable: true,
    icp: '',
    icpLink: '',
    settingShow: true,
  },
});
