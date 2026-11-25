# OfferPilot · 认证模块接口文档 V1.0

> 模块：注册 / 登录 / 当前用户 / 个人资料 / 修改密码  
> 对应页面：登录页、个人设置页  
> 前端文件：`src/views/LoginView.vue`、`src/stores/auth.ts`、`src/api/http.ts`

---

## 基础信息

| 项目 | 说明 |
| --- | --- |
| 模块名称 | 认证模块 |
| Base URL | `http://localhost:8080/api` |
| 请求方式 | `GET` / `POST` / `PUT` |
| 数据格式 | `application/json` |
| 字符编码 | `UTF-8` |
| 认证方式 | `Authorization: Bearer <token>` |

---

## 统一响应格式

### 成功

```json
{
  "code": 1,
  "msg": "success",
  "data": {}
}
```

### 失败

```json
{
  "code": 0,
  "msg": "参数校验失败",
  "data": null
}
```

字段校验失败时，可额外返回 `fieldErrors`：

```json
{
  "code": 0,
  "msg": "参数校验失败",
  "data": null,
  "fieldErrors": {
    "email": "邮箱格式不正确",
    "password": "密码至少 6 位"
  }
}
```

> 前端 Axios 已兼容该格式：检测到 `{ code, msg, data }` 会自动解包，页面组件仍然只读取 `data`。

---

## 错误码说明

| code | HTTP 状态码 | 含义 |
| --- | --- | --- |
| `1` | `200` / `201` | 成功 |
| `0` | `400` | 参数校验失败 |
| `0` | `409` | 业务冲突，例如邮箱已注册 |
| `401` | `401` | 未登录、token 失效或账号密码错误 |
| `404` | `404` | 资源不存在 |
| `500` | `500` | 服务器内部错误 |

---

# 1. 用户注册

## 基础信息

| 项目 | 说明 |
| --- | --- |
| 接口名称 | 用户注册 |
| 请求方式 | `POST` |
| 接口路径 | `/api/auth/register` |
| 接口描述 | 创建账号，注册成功后自动登录 |
| 是否需要登录 | 否 |

## 请求参数

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | String | 是 | 用户姓名，1–50 个字符 |
| `email` | String | 是 | 登录邮箱，全局唯一，需符合邮箱格式 |
| `password` | String | 是 | 登录密码，6–64 位 |

请求示例：

```json
{
  "name": "林知遥",
  "email": "lin@example.com",
  "password": "123456"
}
```

## 响应参数

| 参数名 | 类型 | 说明 |
| --- | --- | --- |
| `data.token` | String | JWT，后续请求放入 Authorization |
| `data.user` | Object | 用户信息 |
| `data.user.id` | String | 用户 ID |
| `data.user.name` | String | 姓名 |
| `data.user.email` | String | 邮箱 |
| `data.user.school` | String | 学校，注册时为空字符串 |
| `data.user.major` | String | 专业，注册时为空字符串 |
| `data.user.graduationYear` | Integer | 毕业年份，注册默认 2027 |
| `data.user.targetRole` | String | 目标岗位，注册时为空字符串 |
| `data.user.location` | String | 期望城市，注册时为空字符串 |
| `data.user.bio` | String | 个人简介，注册时为空字符串 |
| `data.user.weeklyGoal` | Integer | 每周投递目标，注册默认 8 |

## 响应示例

```json
{
  "code": 1,
  "msg": "success",
  "data": {
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
}
```

## 失败示例

邮箱已存在：HTTP `409`

```json
{
  "code": 0,
  "msg": "邮箱已注册",
  "data": null
}
```

参数校验失败：HTTP `400`

```json
{
  "code": 0,
  "msg": "参数校验失败",
  "data": null,
  "fieldErrors": {
    "email": "邮箱格式不正确",
    "password": "密码至少 6 位"
  }
}
```

---

# 2. 用户登录

## 基础信息

| 项目 | 说明 |
| --- | --- |
| 接口名称 | 用户登录 |
| 请求方式 | `POST` |
| 接口路径 | `/api/auth/login` |
| 接口描述 | 使用邮箱和密码登录，返回 JWT |
| 是否需要登录 | 否 |

## 请求参数

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `email` | String | 是 | 登录邮箱 |
| `password` | String | 是 | 登录密码，6–64 位 |
| `remember` | Boolean | 否 | 是否记住登录，前端目前始终保存 token，可忽略 |

请求示例：

```json
{
  "email": "lin@example.com",
  "password": "123456",
  "remember": true
}
```

## 响应参数

| 参数名 | 类型 | 说明 |
| --- | --- | --- |
| `data.token` | String | JWT |
| `data.user` | Object | 当前用户信息，字段同注册接口 |

## 响应示例

```json
{
  "code": 1,
  "msg": "success",
  "data": {
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
}
```

## 失败示例

邮箱或密码错误：HTTP `401`

```json
{
  "code": 401,
  "msg": "邮箱或密码不正确",
  "data": null
}
```

---

# 3. 获取当前用户

## 基础信息

| 项目 | 说明 |
| --- | --- |
| 接口名称 | 获取当前登录用户 |
| 请求方式 | `GET` |
| 接口路径 | `/api/auth/me` |
| 接口描述 | 根据 token 获取当前用户资料，用于刷新登录态 |
| 是否需要登录 | 是 |

## 请求参数

无。用户身份从 `Authorization` 请求头中的 token 解析。

请求头：

```http
Authorization: Bearer <token>
```

## 响应参数

| 参数名 | 类型 | 说明 |
| --- | --- | --- |
| `data.id` | String | 用户 ID |
| `data.name` | String | 姓名 |
| `data.email` | String | 邮箱 |
| `data.school` | String | 学校 |
| `data.major` | String | 专业 |
| `data.graduationYear` | Integer | 毕业年份 |
| `data.targetRole` | String | 目标岗位 |
| `data.location` | String | 期望城市 |
| `data.bio` | String | 个人简介 |
| `data.weeklyGoal` | Integer | 每周投递目标 |

## 响应示例

```json
{
  "code": 1,
  "msg": "success",
  "data": {
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

## 失败示例

未登录或 token 失效：HTTP `401`

```json
{
  "code": 401,
  "msg": "登录状态已失效，请重新登录",
  "data": null
}
```

---

# 4. 更新个人资料

## 基础信息

| 项目 | 说明 |
| --- | --- |
| 接口名称 | 更新个人资料 |
| 请求方式 | `PUT` |
| 接口路径 | `/api/auth/profile` |
| 接口描述 | 更新姓名、学校、专业、目标岗位、周目标等资料 |
| 是否需要登录 | 是 |

## 请求参数

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | String | 是 | 姓名，1–50 个字符 |
| `school` | String | 否 | 学校 |
| `major` | String | 否 | 专业 |
| `graduationYear` | Integer | 否 | 毕业年份，建议 2020–2035 |
| `targetRole` | String | 否 | 目标岗位 |
| `location` | String | 否 | 期望城市 |
| `bio` | String | 否 | 个人简介，最多 200 字 |
| `weeklyGoal` | Integer | 是 | 每周投递目标，1–30 |

请求示例：

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

## 响应参数

返回更新后的完整用户对象，字段同 `/api/auth/me`。

## 响应示例

```json
{
  "code": 1,
  "msg": "success",
  "data": {
    "id": "1",
    "name": "林知遥",
    "email": "lin@example.com",
    "school": "华中科技大学",
    "major": "软件工程",
    "graduationYear": 2027,
    "targetRole": "前端开发实习生",
    "location": "武汉 / 上海",
    "bio": "喜欢把复杂流程做得简单、好看、好用。",
    "weeklyGoal": 8
  }
}
```

---

# 5. 修改密码

## 基础信息

| 项目 | 说明 |
| --- | --- |
| 接口名称 | 修改登录密码 |
| 请求方式 | `PUT` |
| 接口路径 | `/api/auth/password` |
| 接口描述 | 校验当前密码后设置新密码 |
| 是否需要登录 | 是 |

## 请求参数

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `currentPassword` | String | 是 | 当前密码 |
| `newPassword` | String | 是 | 新密码，6–64 位 |

请求示例：

```json
{
  "currentPassword": "123456",
  "newPassword": "newpass123"
}
```

## 响应参数

| 参数名 | 类型 | 说明 |
| --- | --- | --- |
| `code` | Integer | `1` 表示成功 |
| `msg` | String | `success` |
| `data` | null | 无返回数据 |

## 响应示例

```json
{
  "code": 1,
  "msg": "success",
  "data": null
}
```

## 失败示例

当前密码错误：HTTP `400`

```json
{
  "code": 0,
  "msg": "当前密码不正确",
  "data": null
}
```

---

# 6. JWT 与请求头

| 项目 | 说明 |
| --- | --- |
| 算法 | HS256 |
| `sub` | 用户 ID |
| 有效期 | 7 天 |
| 请求头 | `Authorization: Bearer <token>` |
| 前端存储 | `localStorage` 的 `offerpilot.token` |

需要登录的接口：

```http
GET /api/auth/me
PUT /api/auth/profile
PUT /api/auth/password
```

Spring Security 放行：

```text
POST /api/auth/register
POST /api/auth/login
```

其余接口都要求认证。

---

# 7. 后端返回示例（Spring Boot）

如果使用统一包装，可以定义：

```java
public record Result<T>(int code, String msg, T data) {

    public static <T> Result<T> ok(T data) {
        return new Result<>(1, "success", data);
    }

    public static <T> Result<T> fail(String msg) {
        return new Result<>(0, msg, null);
    }
}
```

Controller：

```java
@PostMapping("/register")
public ResponseEntity<Result<AuthResponse>> register(
        @Valid @RequestBody RegisterRequest request
) {
    return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(Result.ok(authService.register(request)));
}
```

异常处理器返回：

```java
return ResponseEntity
        .status(HttpStatus.BAD_REQUEST)
        .body(Result.fail("参数校验失败"));
```

> 前端已兼容该包装，不需要改页面组件。
