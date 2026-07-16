import { createApp, watchEffect } from 'vue';

import { registerAccessDirective } from '@vben/access';
import { registerLoadingDirective } from '@vben/common-ui';
import { preferences } from '@vben/preferences';
import { initStores } from '@vben/stores';
import '@vben/styles';
import '@vben/styles/ele';

import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import DataV from '@kjgl77/datav-vue3';
import { useTitle } from '@vueuse/core';
import { ElLoading } from 'element-plus';

import BaseTableLayout from '#/components/BaseTableLayout/index.vue';
import ColumnSelector from '#/components/ColumnSelector/index.vue';
import PublicComponent from '#/components/componentInstall';
import DictTag from '#/components/DictTag/index.vue';
import ExportButton from '#/components/ExportButton/index.vue';
import { setupGlobalComponent } from '#/components/global';
import { $t, setupI18n } from '#/locales';

import { initComponentAdapter } from './adapter/component';
import { initSetupVbenForm } from './adapter/form';
import App from './app.vue';
import { router } from './router';

// 引入全局css
import './assets/scss/style.scss';
// 引入图表（所有图标见 icon 目录下的 demo_index.html）
import './assets/icon/iconfont.css'
import 'element-plus/dist/index.css';
import './app.scss';

async function bootstrap(namespace: string) {
  // 初始化组件适配器
  await initComponentAdapter();

  // 初始化表单组件
  await initSetupVbenForm();

  // // 设置弹窗的默认配置
  // setDefaultModalProps({
  //   fullscreenButton: false,
  // });
  // // 设置抽屉的默认配置
  // setDefaultDrawerProps({
  //   zIndex: 2000,
  // });

  const app = createApp(App);

  // 注册Element Plus图标组件
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
  }

  app.component('DictTag', DictTag);
  app.component('ExportButton', ExportButton);
  app.component('ColumnSelector', ColumnSelector);
  app.component('BaseTableLayout', BaseTableLayout);

  app.use(PublicComponent);
  app.use(DataV);

  // 全局组件
  // setupGlobalComponent(app);

  window._AMapSecurityConfig = {
    securityJsCode: 'a86b98b035ae5281d0217de05d841fe2',
  };

  // 注册Element Plus提供的v-loading指令
  app.directive('loading', ElLoading.directive);

  // 注册Vben提供的v-loading和v-spinning指令
  registerLoadingDirective(app, {
    loading: false, // Vben提供的v-loading指令和Element Plus提供的v-loading指令二选一即可，此处false表示不注册Vben提供的v-loading指令
    spinning: 'spinning',
  });

  // 国际化 i18n 配置
  await setupI18n(app);

  // 配置 pinia-tore
  await initStores(app, { namespace });

  // 安装权限指令
  registerAccessDirective(app);

  // 初始化 tippy
  const { initTippy } = await import('@vben/common-ui/es/tippy');
  initTippy(app);

  // 配置路由及路由守卫
  app.use(router);

  // 配置Motion插件
  const { MotionPlugin } = await import('@vben/plugins/motion');
  app.use(MotionPlugin);

  // 动态更新标题
  watchEffect(() => {
    if (preferences.app.dynamicTitle) {
      const routeTitle = router.currentRoute.value.meta?.title;
      const pageTitle =
        (routeTitle ? `${$t(routeTitle)} - ` : '') + preferences.app.name;
      useTitle(pageTitle);
    }
  });

  app.mount('#app');
}

export { bootstrap };
