import path from 'node:path';

import { defineConfig } from '@vben/vite-config';

import AutoImport from 'unplugin-auto-import/vite';
import ElementPlus from 'unplugin-element-plus/vite';
import IconsResolver from 'unplugin-icons/resolver';
import Icons from 'unplugin-icons/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      plugins: [
        ElementPlus({
          format: 'esm',
        }),
        AutoImport({
          imports: [
            'vue', // Vue 核心 API (ref, computed, watch...)
            'vue-router', // Vue Router (useRoute, useRouter...)
            'pinia', // Pinia (defineStore, storeToRefs...)
            '@vueuse/core', // VueUse 工具库 (可选)
          ],
          dirs: [
            './src/hooks/**', // 自定义 hooks
            './src/stores/**', // Pinia stores
          ],
          // eslint-disable-next-line n/prefer-global/process
          dts: path.resolve(process.cwd(), 'types', 'auto-imports.d.ts'),
          vueTemplate: true,
          eslintrc: {
            enabled: true, // 开启生成
            filepath: './.eslintrc-auto-import.json', // 生成路径
            globalsPropValue: true,
          },
          resolvers: [
            ElementPlusResolver(),
            // Auto import icon components
            // 自动导入图标组件
            IconsResolver({
              prefix: 'Icon',
            }),
          ],
        }),
        Components({
          // eslint-disable-next-line n/prefer-global/process
          dts: path.resolve(process.cwd(), 'types', 'components.d.ts'),
          resolvers: [
            // Auto register icon components
            // 自动注册图标组件
            IconsResolver({
              prefix: 'Icon',
              enabledCollections: ['ep'],
            }),
            // Auto register Element Plus components
            // 自动导入 Element Plus 组件
            ElementPlusResolver(),
          ],
        }),
        Icons({
          autoInstall: true,
          compiler: 'vue3',
        }),
      ],
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            // mock代理目标地
            // target: 'http://localhost:5320/api'
            target: 'http://recycletestapi.huishoucloud.com/api',
            ws: true,
          },
        },
      },
    },
  };
});
