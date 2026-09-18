# PC 测试环境发布

测试站：`http://recycletest.huishoucloud.com`。

## 环境隔离

- 使用 `pnpm --filter @vben/web-ele build:test`，不能上传正式环境构建产物。
- `.env.test` 的接口地址固定为 `/api`，登录缓存命名空间与旧环境隔离。
- 将本目录 `test-isolation.conf` 安装到测试站 Nginx 的 extension 目录。它只代理到本机测试 Java 服务 `8342`，不得用于正式站点。
- CSP 的连接白名单不包含正式接口域名；不要改成 `*`、`https:` 或整个 `*.huishoucloud.com`。
- 首页和 `_app.config.js` 禁止缓存。发布后已打开的旧标签页必须重新加载，新响应头无法追溯约束已经加载的旧页面。

## 发布和验证

1. 备份当前 dist 和 Nginx 配置。
2. 构建后检查 `dist/_app.config.js` 的接口为 `/api`，扫描 dist 不得出现 `recycleapi.huishoucloud.com`。
3. 上传到临时目录，安装测试隔离配置，运行 `nginx -t` 通过后 reload，替换测试站 dist。
4. 检查首页 CSP、入口与配置缓存头、`/api/` 返回真实测试接口结果而非 HTML。
5. 重新登录测试账号，检查菜单及业务列表；无登录响应只代表代理连通，不代表业务验收通过。

## 2026-09-18 发布记录

- 测试站静态目录：`/www/wwwroot/recycletest.huishoucloud.com/apps/web-ele/dist`。
- 回滚备份：`/www/backup/pc-test-release-20260918-o07seT`。
- 本次只发布 PC 前端和测试站代理配置，未发布 Jar，未修改数据库和正式站点。
- 回滚时仍须保留测试隔离配置，不能恢复旧版指向正式接口的 `_app.config.js`。
