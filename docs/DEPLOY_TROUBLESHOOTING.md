# 上线排错总结

> 时间：2026-11-25
> 前端：`http://findjob.aicaipu.top`（Vue 3 + Vite 7）
> 后端：`http://api.findjob.aicaipu.top`（Spring Boot 4 + MyBatis-Plus + MySQL 8）
> 部署：宝塔面板 + Nginx，前后端同机（39.105.67.22）

---

## 一、问题总览

| # | 现象 | 根因 | 所属层 |
| --- | --- | --- | --- |
| 1 | `npm run build` 报 `EPERM` / `Access is denied` | 项目目录被打了 Windows「低完整性级别」标记 | 操作系统 / 本地环境 |
| 2 | 不确定跨域是否解决 | 开发用 Vite 代理绕开跨域，但后端 CORS 白名单不完整 | 前后端联调 |
| 3 | 线上页面打开但「无法连接服务器」 | 前端域名的 Nginx 没有把 `/api` 反向代理给后端 | Nginx |
| 4 | 加上代理后登录/注册返回 500「服务端异常」 | 服务器数据库缺 `users`、`applications` 表 | 数据库 / 后端 |

---

## 二、问题 1：本地构建失败

### 现象

```
error TS5033: Could not write file '.../node_modules/.tmp/tsconfig.app.tsbuildinfo': EPERM
[vite:esbuild-transpile] remove C:\Users\...\Temp\esbuild-xxxx: Access is denied.
```

### 排查过程

1. 先怀疑代码问题 → 类型检查本身没有报错；
2. 用 `icacls` 查看项目目录权限，发现两个异常：
   ```
   D:\简历项目\FinfJobvue   Everyone:(CI)(DENY)(DC)
                            S-1-4-363423330-103044429:(OI)(CI)(W,D,DC)
                            S-1-4-101902803-52541554:(OI)(CI)(W,D,DC)
                            Mandatory Label\Low Mandatory Level:(OI)(CI)(NW)
   ```
3. 单独测试：项目目录内能写，`%TEMP%` 里的临时文件删不掉，但手动删又成功 → 与"文件本身权限"无关，是**进程降权**导致的。

### 根因

项目文件夹被写入了 **Low 完整性级别（Mandatory Integrity Control）** 标记，并且带上了一组额外的 ACL 项。这些标记是之前以"沙箱/受限"模式运行工具时留下的残留，**不是项目本身的配置**。

低完整性进程受限，无法删除普通（Medium）完整性的文件，于是 esbuild 清理 `%TEMP%` 临时文件时被拒绝。

### 解决

```powershell
# 1) 抬高完整性级别到 Medium，并递归处理所有子项
icacls "D:\简历项目\FinfJobvue" /setintegritylevel '(OI)(CI)M' /T /C

# 2) 重置继承关系（清掉残留的额外 ACL 项）
icacls "D:\简历项目\FinfJobvue" /reset /T /C

# 3) 给自己重新授权完全控制
icacls "D:\简历项目\FinfJobvue" /grant "$($env:USERNAME):(OI)(CI)F"
```

另外 `npm run build` 一开始还报了：

```
npm : 无法加载文件 D:\worktool\npm.ps1，因为在此系统上禁止运行脚本
```

这是 **PowerShell 执行策略**（ExecutionPolicy）拦截了 `npm.ps1`。两种解法：

- 临时：用 `npm.cmd run build`；
- 长期：`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`。

### 知识点

- **Windows 完整性级别（MIC）**：Low / Medium / High / System。低级别进程对高级别对象"只能读、不能写删"。
- **`icacls`**：查看/修改文件 ACL 与完整性标签。`(OI)(CI)` 表示对文件、目录都继承。
- **执行策略**：`Get-ExecutionPolicy -List` 查看；`RemoteSigned` 是本机脚本可执行、网上下载需签名。
- 结论：**不要在项目目录上长期保留受限工具的权限残留**，遇到"手动能删、程序删不掉"优先查 ACL 和完整性级别。

---

## 三、问题 2：跨域到底解决没有

### 现象

开发环境不确定有没有跨域问题；线上部署后又出现连接失败。

### 排查结论

- 前端统一走相对路径 `/api`（`src/api/http.ts` 的 `baseURL`），开发时由 Vite 代理转发：
  ```ts
  server.proxy = { '/api': { target: 'http://localhost:8080', changeOrigin: true } }
  ```
  浏览器看到的是**同源请求**，所以不会触发 CORS。实测 `http://127.0.0.1:5173/api/...` 返回 200。
- 但后端 CORS 白名单只写了 `https://findjob.aicaipu.top` 一个来源。直连后端时：
  ```
  Origin: http://127.0.0.1:5173      -> 403 Invalid CORS request
  Origin: http://findjob.aicaipu.top -> 403 Invalid CORS request
  Origin: https://findjob.aicaipu.top -> 200
  ```
- `src/utils/request.ts` 里还有一份直连 `VITE_BASE_URL` 的**死代码**（没有任何地方引用），一旦被引用就会跨域。`.env.development` 里的 `VITE_BASE_URL` 可以删掉。

### 解决思路（二选一）

- **方案 A（推荐）**：生产用 Nginx 同源反向代理（见问题 3），前端保持 `baseURL = '/api'`，彻底不需要 CORS；
- **方案 B**：前端直连后端域名，则必须
  1. `.env.production` 写 `VITE_API_BASE_URL=http://api.findjob.aicaipu.top`，重新打包；
  2. 后端 `CorsConfig` 白名单补齐 `http://findjob.aicaipu.top`、`https://findjob.aicaipu.top`、本地开发源。

### 知识点

- **同源策略**：协议 + 域名 + 端口三者完全一致才是同源。
- **CORS**：跨域时浏览器自动加 `Origin`，服务端必须回 `Access-Control-Allow-Origin`；非简单请求（`Content-Type: application/json`、带 `Authorization`）会先发 `OPTIONS` 预检。
- **`changeOrigin`** 只改 `Host` 头，**不会改 `Origin` 头**——代理转发时 `Origin` 原样透传，这是本次最容易被忽略的一点。
- **`spring.sql.init`** 与 CORS 无关，但同一份配置文件里都容易搞混，见问题 4。

---

## 四、问题 3：线上"无法连接服务器"

### 现象

前端页面能打开，但所有接口失败，页面提示"网络连接异常，请检查后端服务是否启动"。

### 排查过程

| 请求 | 结果 | 说明 |
| --- | --- | --- |
| `http://api.findjob.aicaipu.top/api/jobs` | `401` + JSON | 后端正常 |
| `http://findjob.aicaipu.top/api/jobs` | `200` 但 `text/html` 1081 字节 | 返回的是 `index.html` |
| 线上 JS 包里的 `baseURL` | `"/api"` | 请求确实打到了前端域名 |

### 根因

1. 前端域名站点的 Nginx **没有 `/api` 的反向代理**，请求落到 SPA 兜底规则 `try_files ... /index.html`，axios 拿到 HTML 而不是 JSON；
2. 只加代理还不够：浏览器对 POST/PUT 会带 `Origin`，Nginx 默认原样转发，后端 CORS 白名单不含 `http://findjob.aicaipu.top` → `403 Invalid CORS request`。

### 解决

在**前端站点**的 Nginx 配置里，`location /` 之前加入：

```nginx
location ^~ /api/ {
    proxy_pass http://api.findjob.aicaipu.top/api/;
    proxy_http_version 1.1;
    proxy_set_header Host              api.findjob.aicaipu.top;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Origin "";          # 关键：同源反代去掉 Origin
    proxy_connect_timeout 10s;
    proxy_read_timeout    120s;
    client_max_body_size  10m;           # 简历上传
}
```

前端**不需要重新打包**，因为 `baseURL` 本来就是相对的 `/api`。

### 知识点

- **SPA 兜底**：`try_files $uri $uri/ /index.html;` 会把不存在的路径都返回首页，所以"接口 200 但内容是 HTML"是典型信号。
- **`location ^~ /api/`**：`^~` 表示前缀匹配且不再尝试正则，优先级高于普通 `location /`。
- **`proxy_pass` 末尾斜杠**：`proxy_pass http://host/api/;` 会把 `/api/xxx` 映射为 `/api/xxx`；写成 `http://host/;` 则会剥掉 `/api` 前缀，注意别多一层或少一层。
- **`proxy_set_header Origin ""`**：Nginx 中把请求头设为空字符串即表示"不转发该头"。同源反代时后端视为非跨域请求，从而绕过 CORS 校验。
- **为什么去 Origin 是安全的**：本项目用 `localStorage + Bearer Token` 鉴权，不依赖 Cookie，不存在 CSRF 借 Cookie 自动携带的问题。
- **`client_max_body_size`**：Nginx 默认 1MB，上传简历会 413，需放大。

---

## 五、问题 4：登录/注册返回 500

### 现象

```
POST /api/auth/login   -> 500 {"code":0,"data":null,"message":"服务端异常"}
POST /api/auth/register -> 500 同上
```

而所有需要登录的接口都正常返回 `401`。

### 排查过程中的一次误判（重要教训）

一开始用 PowerShell 调 `curl.exe` 传 JSON：

```powershell
curl.exe -s -X POST 'http://...' -H 'Content-Type: application/json' --data '{"email":"a@b.com","password":"123456"}'
```

后端始终回 `请求参数格式错误`，几乎让我误判成"后端读不到请求体"。打开 Spring 的 TRACE 日志后看到真实异常：

```
HttpMessageNotReadableException: JSON parse error: Unexpected character ('e' (code 101)):
was expecting double-quote to start property name
```

实际发出去的 body 变成了 `{email:a@b.com,...}`——**PowerShell 调用原生程序时把参数里的双引号吃掉了**。换成 `Invoke-WebRequest` 或 `--data-binary @file.json` 后，后端立刻正确返回校验错误，证明 `@RequestBody` + record 完全正常。

### 根因

服务器 MySQL 的 `findjob` 库只有 `interviews`、`resumes` 两张表（后端 `resources/schema.sql` 里只有这两张），缺 `users`、`applications`。

应用启动时 `spring.sql.init.mode=always` 只会执行这两张表的建表语句，所以能启动；但一登录，`userMapper.selectOne(...)` 查不到表直接抛 SQL 异常，被 `GlobalExceptionHandler` 的兜底 `@ExceptionHandler(Exception.class)` 捕获成"服务端异常"。

### 解决

1. 把 `users`、`applications` 建表语句补进后端 `src/main/resources/schema.sql`（全部 `CREATE TABLE IF NOT EXISTS`）；
2. 重新 `mvn clean package`，上传 jar 覆盖，重启；
3. 启动时自动建表，无需手动进 phpMyAdmin。

也可以手动执行 SQL 应急，注意两个坑：

- 应用账号 `FindJob` 通常没有 `CREATE DATABASE` 权限 → 报 `#1044`；
- 在 phpMyAdmin 里如果当前库是 `information_schema`，`CREATE TABLE` 会试图建到系统库 → 同样 `#1044`。

### 知识点

- **`spring.sql.init.mode=always`**：每次启动执行 `schema.sql`（建表）与 `data.sql`（初始数据），配合 `IF NOT EXISTS` 才能重复执行不报错。
- **`@ExceptionHandler(Exception.class)` 兜底**：它会掩盖真实错误。生产环境应把原始异常 `log.error` 出来，否则前端只看到"服务端异常"。
- **`MethodArgumentNotValidException` vs `HttpMessageNotReadableException`**：前者是"JSON 解析成功但字段校验失败"，后者是"请求体读不出来/不是合法 JSON"，排查时要区分。
- **MySQL 错误码**：`1044` 是"没有该库的权限"，`1045` 是"用户名或密码错误"，`1146` 是"表不存在"。
- **MyBatis-Plus 驼峰映射**：`map-underscore-to-camel-case: true`，实体 `passwordHash` 对应列 `password_hash`，建表语句的列名必须严格一致。

---

## 六、上线检查清单

- [ ] 前端 `npm run build` 通过，`dist/` 已上传
- [ ] 前端站点 `location /` 有 `try_files $uri $uri/ /index.html`（history 路由必需）
- [ ] 前端站点有 `location ^~ /api/` 反代到后端
- [ ] 反代里 `proxy_set_header Origin ""`
- [ ] `client_max_body_size` ≥ 10m
- [ ] 后端 `schema.sql` 包含全部表
- [ ] 后端 `application.yml` 数据库地址/账号/密码与服务器一致
- [ ] 后端日志无 `未处理的服务端异常`
- [ ] `curl http://api.findjob.aicaipu.top/api/jobs` 返回 401 JSON
- [ ] 浏览器能完成注册 → 登录 → 进入工作台
- [ ] **两个域名都配置 HTTPS 并开启强制跳转**（当前 443 未开放，登录 token 明文传输）

---

## 七、常用排查命令

```powershell
# 只看状态码和类型，快速判断是否走错路由
curl.exe -s -o NUL -w "%{http_code} %{content_type}`n" "http://findjob.aicaipu.top/api/jobs"

# 看响应头（判断 CORS、Server、缓存）
curl.exe -s -D - -o NUL "http://api.findjob.aicaipu.top/api/jobs"

# 带 Origin 模拟跨域预检
curl.exe -s -o NUL -w "%{http_code}`n" -X OPTIONS "http://api.findjob.aicaipu.top/api/auth/login" `
  -H "Origin: http://findjob.aicaipu.top" -H "Access-Control-Request-Method: POST"

# 发送 JSON 时避免 PowerShell 吞引号：用文件
'{"email":"a@b.com","password":"123456"}' | Out-File -Encoding utf8 body.json
curl.exe -s -X POST "http://api.findjob.aicaipu.top/api/auth/login" `
  -H "Content-Type: application/json" --data-binary "@body.json"

# 查 Nginx 配置语法
nginx -t
```

```bash
# 服务器上确认表是否存在
mysql -uroot -p findjob -e "show tables;"
```

Spring 侧想看请求体解析失败的真正原因，临时打开 TRACE：

```bash
java -jar app.jar --logging.level.org.springframework.web.servlet.mvc.method.annotation=TRACE
```

---

## 八、一句话教训

1. "手动能删、程序删不掉" → 查 ACL / 完整性级别，别改代码；
2. 代理只改 `Host` 不改 `Origin`，同源反代记得清掉 `Origin`；
3. 接口 `200` 但内容是 HTML → 几乎都是 SPA 兜底吃掉了路由；
4. 前端只看到"服务端异常"时，一定要去后端日志找 `Caused by`；
5. 用 PowerShell 调 `curl.exe` 传 JSON 会被吞引号，改用 `Invoke-RestMethod` 或 `--data-binary @file`。
