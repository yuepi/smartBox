# PC 测试环境发布

## 2026-09-20 订单状态展开筛选发布

- 包含家政订单、上门回收订单的展开状态筛选，使用测试构建，接口仍为 `/api` 并代理到 `127.0.0.1:8342`。
- 发布包：`outputs/pc-test-20260920-status-filters.tar.gz`，SHA-256：`7a35c1fe2d07130f394adbfe987ea24fe2c632a0f3f931e4fe34b54e5f2bbf14`。
- 旧版备份：`/www/backup/pc-status-filters-20260920-rM2psB/dist-before`，同目录保存发布包和原 Nginx 配置。
- 首页 SHA-256：`ac5836cb204cf4e9120364f19078e608b25a34fbdde7f3e77631ce81f1585872`。
- 仅替换测试站静态文件，未修改 Nginx、JAR、数据库或正式环境；登录后筛选交互仍需独立验收。

## 2026-09-20 前端更新

- 使用项目本地 Node/pnpm 执行 `pnpm --filter @vben/web-ele build:test`，发布当前工作区前端。
- 发布包：`outputs/pc-test-20260920-frontend.tar.gz`，SHA-256：`62e6e384ca8d2f4b8ba4c7ee4a7390f4a01f9d17e0970b21737c8b226878d096`。
- 旧静态文件：`/www/backup/pc-test-20260920-mxugni/dist-before`；同目录保留发布包及发布前 Nginx 配置。
- 测试站静态目录：`/www/wwwroot/recycletest.huishoucloud.com/apps/web-ele/dist`。
- 构建配置为 `/api`，产物未含正式 API 域名；现有代理仍指向 `127.0.0.1:8342`。未改 Nginx 配置、未发布 JAR、未执行 SQL。
- 首页 SHA-256：`1207d96badc79d6af9c3c777cb44f5458fa327ca51a487052fc9e3245b0ed84b`。发布不等于登录后业务流程验收。

## 2026-09-19 完整分类与服务编辑器发布

- 已发布 `outputs/pc-test-20260919-full-service-editor.zip`，SHA-256：`e5a8a328e1e68775cb9e55e59733dcbf19a33615ad3259d33ee13ff5e2ccfe62`。
- 旧前端及Nginx配置备份：`/www/backup/pc-full-service-editor-20260919-x5Ilnu/`；旧目录为 `dist-before`。
- 外网首页与本地构建SHA-256一致，HTTP 200；运行时接口为 `/api`，服务器代理仍为 `127.0.0.1:8342`，CSP未放行正式接口域名。
- 未登录API返回业务JSON的1000未登录，不是HTML；此项只验证代理连通，不代表登录后编辑保存验收。
- 本次仅发布前端，不发布JAR、不执行分类字段SQL、不改Nginx配置或正式站点。合并保存仍依赖配套新版后端和分类字段迁移。

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
