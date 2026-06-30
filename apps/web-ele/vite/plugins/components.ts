// import IconsResolver from 'unplugin-icons/resolver';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';

export default (path: any) => {
  return Components({
    resolvers: [
      // 自动导入 Element Plus 组件
      ElementPlusResolver(),
      // 自动注册图标组件
      // IconsResolver({
      //   enabledCollections: ['ep'],
      // }),
    ],
    dts: path.resolve(path.resolve(__dirname, '../../'), 'types', 'components.d.ts'),
  });
};
