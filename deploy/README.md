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

## 2026-09-18 家政履约与预约规则发布

- PC代码版本：`844031b0`，已执行 `build:test` 并发布。
- 确认用户发布的后端Jar SHA-256为 `300fa96a9b94fac80efd2675440e60c56649a0c2dd25843dc70cd6c890b682be`，8342端口已监听。
- 前端包SHA-256：`d8255b60e13ed23ae416e10276555ce0726f6e6951bbbdb5fe0ad76db92b7517`。
- 原前端及隔离配置备份：`/www/backup/pc-home-844031b0-JElX5t`。
- 已核验线上 `_app.config.js` 为 `/api`；首页和配置禁止缓存，CSP仍不允许连接正式接口。
- 使用已有测试商户登录会话，确认新“预约规则”菜单及表单读取成功：08:00至18:00、提前60分钟、7天、开关停用。未保存或启用规则。
- 本次仅发布前端，未修改数据库或正式站点，未发起派工、完工、支付、退款等业务写操作。真实上传与完整履约仍需专项验收。
