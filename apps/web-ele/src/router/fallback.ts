import type { Router } from 'vue-router';

/** 必须在权限路由加载完成后调用，避免把尚未注册的正常业务页面误判为不存在。 */
export function resolveAccessibleLocation(
  router: Router,
  target: string,
  homePaths: (string | undefined)[],
) {
  const resolved = router.resolve(target);
  if (resolved.matched.length && resolved.name !== 'FallbackNotFound') {
    return resolved;
  }
  for (const path of homePaths) {
    // 根路径可能再次重定向到失效首页，不把它作为兜底，防止循环跳转。
    if (!path || path === '/' || path === resolved.path) continue;
    const home = router.resolve(path);
    if (home.matched.length && home.name !== 'FallbackNotFound'
      && !home.matched.at(-1)?.redirect) {
      return home;
    }
  }
  // 首页本身也未配置时保留原结果，不通过反复重定向掩盖菜单配置错误。
  return resolved;
}
