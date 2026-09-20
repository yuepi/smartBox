import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import { resolveAccessibleLocation } from '../fallback';

function testRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/workspace', name: 'Workspace', component: {} },
      { path: '/orders', name: 'Orders', component: {} },
      { path: '/personal', name: 'Personal', component: {} },
      { path: '/:path(.*)*', name: 'FallbackNotFound', component: {} },
    ],
  });
}

describe('权限路由加载后的首页兜底', () => {
  it('切换后旧页面不存在时回到首页，不保留旧查询参数', () => {
    const result = resolveAccessibleLocation(testRouter(), '/old-page?id=1', ['/workspace']);
    expect(result.fullPath).toBe('/workspace');
  });

  it('仍有权限的页面保留查询参数与锚点', () => {
    expect(resolveAccessibleLocation(testRouter(), '/orders?id=1#detail', ['/workspace']).fullPath)
      .toBe('/orders?id=1#detail');
  });

  it('优先使用用户首页，失效时使用默认首页', () => {
    expect(resolveAccessibleLocation(testRouter(), '/missing', ['/personal', '/workspace']).path).toBe('/personal');
    expect(resolveAccessibleLocation(testRouter(), '/missing', ['/old-home', '/workspace']).path).toBe('/workspace');
  });

  it('动态页面注册完成后不误跳首页', () => {
    const router = testRouter();
    router.addRoute({ path: '/new-page', name: 'NewPage', component: {} });
    expect(resolveAccessibleLocation(router, '/new-page', ['/workspace']).name).toBe('NewPage');
  });

  it('首页本身缺失时不产生循环跳转', () => {
    const router = testRouter();
    router.removeRoute('Workspace');
    expect(resolveAccessibleLocation(router, '/workspace', ['/', '/workspace']).fullPath).toBe('/workspace');
  });

  it('跳过配置成重定向的首页以避免循环', () => {
    const router = testRouter();
    router.addRoute({ path: '/loop', redirect: '/missing' });
    expect(resolveAccessibleLocation(router, '/missing', ['/loop', '/workspace']).path).toBe('/workspace');
  });

  it('首页挂在带默认重定向的根布局下时仍可跳转', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', redirect: '/workspace', component: {}, children: [
          { path: '/workspace', name: 'Workspace', component: {} },
        ] },
        { path: '/:path(.*)*', name: 'FallbackNotFound', component: {} },
      ],
    });
    expect(resolveAccessibleLocation(router, '/missing', ['/workspace']).path).toBe('/workspace');
  });
});
