# 认证模块接口文档（登录 / 注册）

> 本文是认证接口的详细实现说明，示例采用“直接返回 data”的格式。  
> 如果你要截图中的 `{ code, msg, data }` 包装格式，请看 [API_AUTH_DOC.md](API_AUTH_DOC.md)；前端已兼容两种格式。

> 对应页面：`/login`  
> 对应前端文件：`src/views/LoginView.vue`、`src/stores/auth.ts`、`src/api/index.ts`  
> 完整项目接口见 [API.md](API.md)。

---

## 1. 模块范围

第一个页面需要以下接口：

| 方法 | 路径 | 说明 | 是否需要 token |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 注册并自动登录 | 否 |
| POST | `/api/auth/login` | 登录 | 否 |
| GET | `/api/auth/me` | 获取当前登录用户 | 是 |
| PUT | `/api/auth/profile` | 更新个人资料 | 是 |
| PUT | `/api/auth/password` | 修改密码 | 是 |

其中前 3 个是登录页闭环必须的；后 2 个是“个人设置”页面用的，可以和认证模块一起写。

---

## 2. 通用约定

### 2.1 Base URL

```text
http://localhost:8080/api
```

前端开发时通过 Vite 代理：

```text
前端请求 /api/auth/login
        ↓
代理到 http://localhost:8080/api/auth/login
```

### 2.2 请求头

登录、注册：

```http
Content-Type: application/json
```

需要登录的接口：

```http
Authorization: Bearer <token>
```

### 2.3 成功响应

直接返回业务数据，**不要包 `{ code, data }`**。

### 2.4 失败响应

```json
{
  "code": "INVALID_CREDENTIALS",
  "message": "邮箱或密码不正确",
  "timestamp": "2026-11-19T20:00:00+08:00"
}
```

字段校验失败时：

```json
{
  "code": "VALIDATION_ERROR",
  "message": "参数校验失败",
  "fieldErrors": {
    "email": "邮箱格式不正确",
    "password": "密码至少 6 位"
  },
  "timestamp": "2026-11-19T20:00:00+08:00"
}
```

### 2.5 时间格式

`createdAt` / `updatedAt` 使用 ISO-8601：

```text
2026-11-19T20:00:00+08:00
```

---

## 3. 用户对象

注册、登录、`/me` 都返回同一个用户结构：

```json
{
  "id": "1",
  "name": "林知遥",
  "email": "lin@example.com",
  "school": "华中科技大学",
  "major": "软件工程",
  "graduationYear": 2027,
  "targetRole": "前端开发实习生",
  "location": "武汉 / 上海",
  "bio": "软件工程 2027 届，正在寻找前端开发实习。",
  "weeklyGoal": 8
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string / number | 前端只透传，不参与计算；建议后端序列化为字符串或数字均可 |
| `name` | string | 昵称 / 姓名 |
| `email` | string | 登录邮箱，唯一 |
| `school` | string | 学校 |
| `major` | string | 专业 |
| `graduationYear` | number | 毕业年份 |
| `targetRole` | string | 目标岗位 |
| `location` | string | 期望城市 |
| `bio` | string | 个人简介 |
| `weeklyGoal` | number | 每周投递目标，1–30 |

**绝对不要返回 `passwordHash`。**

---

## 4. 注册

### `POST /api/auth/register`

请求：

```json
{
  "name": "林知遥",
  "email": "lin@example.com",
  "password": "123456"
}
```

校验：

- `name` 非空，长度 1–50
- `email` 合法且唯一
- `password` 至少 6 位

成功：`201 Created`

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "1",
    "name": "林知遥",
    "email": "lin@example.com",
    "school": "",
    "major": "",
    "graduationYear": 2027,
    "targetRole": "",
    "location": "",
    "bio": "",
    "weeklyGoal": 8
  }
}
```

失败：

| HTTP | code | 场景 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 字段缺失、邮箱格式错误、密码太短 |
| 409 | `EMAIL_ALREADY_EXISTS` | 邮箱已注册 |

说明：

- 注册成功后直接返回 token，前端会直接进入工作台
- 新用户没有投递、面试、简历，首页会显示空状态，这是正常的
- 不要把测试账号硬编码进生产逻辑

---

## 5. 登录

### `POST /api/auth/login`

请求：

```json
{
  "email": "lin@example.com",
  "password": "123456",
  "remember": true
}
```

`remember` 是前端“记住我”开关，后端可以忽略，也可以用它决定 token 有效期；当前前端始终把 token 存 `localStorage`。

成功：`200 OK`

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "1",
    "name": "林知遥",
    "email": "lin@example.com",
    "school": "华中科技大学",
    "major": "软件工程",
    "graduationYear": 2027,
    "targetRole": "前端开发实习生",
    "location": "武汉 / 上海",
    "bio": "软件工程 2027 届，正在寻找前端开发实习。",
    "weeklyGoal": 8
  }
}
```

失败：

| HTTP | code | 场景 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 邮箱 / 密码为空 |
| 401 | `INVALID_CREDENTIALS` | 邮箱不存在或密码错误 |

安全建议：

- 不区分“邮箱不存在”和“密码错误”，统一提示“邮箱或密码不正确”
- 使用 BCrypt，不要明文或 MD5
- 登录失败不要返回密码 hash、数据库异常等内部信息

---

## 6. 当前用户

### `GET /api/auth/me`

请求头：

```http
Authorization: Bearer <token>
```

成功：`200 OK`

```json
{
  "id": "1",
  "name": "林知遥",
  "email": "lin@example.com",
  "school": "华中科技大学",
  "major": "软件工程",
  "graduationYear": 2027,
  "targetRole": "前端开发实习生",
  "location": "武汉 / 上海",
  "bio": "软件工程 2027 届，正在寻找前端开发实习。",
  "weeklyGoal": 8
}
```

失败：

| HTTP | code | 场景 |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | 没带 token、token 过期、签名不合法 |

说明：

- 这个接口用于刷新页面后恢复登录态
- 前端登录成功后会把 user 存本地，但刷新时仍建议调用 `/me` 校验 token 是否有效
- Controller 不要接收 userId 参数，从 `SecurityContext` 取

---

## 7. 更新个人资料

### `PUT /api/auth/profile`

请求头：

```http
Authorization: Bearer <token>
```

请求：

```json
{
  "name": "林知遥",
  "school": "华中科技大学",
  "major": "软件工程",
  "graduationYear": 2027,
  "targetRole": "前端开发实习生",
  "location": "武汉 / 上海",
  "bio": "喜欢把复杂流程做得简单、好看、好用。",
  "weeklyGoal": 8
}
```

成功：`200 OK`，返回更新后的完整用户对象。

校验：

- `name` 非空
- `weeklyGoal` 1–30
- `graduationYear` 合理范围（如 2020–2035）
- 邮箱不允许在这里修改

---

## 8. 修改密码

### `PUT /api/auth/password`

请求头：

```http
Authorization: Bearer <token>
```

请求：

```json
{
  "currentPassword": "123456",
  "newPassword": "newpass123"
}
```

成功：`204 No Content`

失败：

| HTTP | code | 场景 |
| --- | --- | --- |
| 400 | `INVALID_PASSWORD` | 当前密码错误 |
| 400 | `VALIDATION_ERROR` | 新密码少于 6 位 |

实现要点：

- 先 `passwordEncoder.matches(currentPassword, hash)`
- 再 `passwordEncoder.encode(newPassword)` 更新
- 修改成功后可以选择让旧 token 失效；演示项目可以暂不处理

---

## 9. JWT 约定

建议：

- 算法：HS256
- `sub`：用户 ID
- 有效期：7 天（`expiration-hours: 168`）
- 请求头：`Authorization: Bearer <token>`
- 密钥：至少 32 字节，放在环境变量里

JWT 中只放用户标识即可，不要放密码、手机号等敏感信息。

Spring Security 需要放行：

```text
POST /api/auth/register
POST /api/auth/login
```

其他 `/api/**` 都要求认证。

401 要返回 JSON，而不是 Spring 默认登录页：

```json
{
  "code": "UNAUTHORIZED",
  "message": "登录状态已失效，请重新登录",
  "timestamp": "2026-11-19T20:00:00+08:00"
}
```

---

## 10. curl 自测

### 注册

```bash
curl -i -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "林知遥",
    "email": "lin@example.com",
    "password": "123456"
  }'
```

### 登录

```bash
curl -i -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "lin@example.com",
    "password": "123456"
  }'
```

复制返回的 token：

```bash
TOKEN="粘贴 token"
```

### 当前用户

```bash
curl -i http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 无 token 测试

```bash
curl -i http://localhost:8080/api/auth/me
```

应返回 `401`，且 `Content-Type: application/json`。

---

## 11. 前端联调验收

把 `.env.development` 确认为：

```dotenv
VITE_API_BASE_URL=/api
VITE_PROXY_TARGET=http://localhost:8080
```

重启前端。

逐项检查：

- [ ] 注册成功后自动进入工作台
- [ ] 退出后可以用刚注册的账号登录
- [ ] 刷新页面后仍保持登录
- [ ] 错误密码提示“邮箱或密码不正确”
- [ ] 重复邮箱提示“邮箱已注册”
- [ ] 不登录直接访问 `/dashboard` 会跳转 `/login`
- [ ] 浏览器 DevTools 里请求头带 `Authorization: Bearer ...`
- [ ] 后端日志没有把密码或 token 完整打印出来

---

## 12. 这一阶段先不要做的事

- 不要先写投递、面试、简历接口
- 不要先做 Dashboard 聚合
- 不要接短信、邮箱验证码、第三方登录
- 不要做复杂的 RBAC 权限系统

当前只需要：**一个用户表 + 注册 + 登录 + JWT + /me**。  
这条链路跑通，再进入投递管理页面。
