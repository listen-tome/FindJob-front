# 后端从 0 开始：OfferPilot 实施步骤

> 适用前提：会 Java 基础、了解 Spring Boot 的 Controller / Service / Mapper，但还没有这个项目的后端代码。  
> 目标：用 7–10 个晚上（每天 2–4 小时）做出可联调、可演示、可讲清楚的后端。  
> 接口的唯一事实来源：[API.md](API.md)；字段和建表：[schema.sql](schema.sql)；技术细节：[BACKEND_GUIDE.md](BACKEND_GUIDE.md)。

---

## 0. 先定开发顺序

不要按“先写所有实体，再写所有接口”的顺序做，容易写到一半看不到效果。按**一条能跑通的业务链**推进：

```text
环境 + 建库
  ↓
注册 / 登录 / 当前用户
  ↓
投递列表 + 新增 + 编辑 + 删除
  ↓
拖拽改状态
  ↓
面试
  ↓
简历上传
  ↓
Dashboard
  ↓
Analytics
  ↓
前端切真实接口 + 验收
```

每完成一个阶段，都用 curl 或 Apifox 验证，再接前端页面点一遍。

---

## 1. 准备环境（0.5 天）

需要安装：

| 工具 | 版本 | 用途 |
| --- | --- | --- |
| JDK | 17 或 21 | Spring Boot 3 最低 17 |
| Maven | 3.8+ | 构建 |
| MySQL | 8.0+ | 数据库 |
| IntelliJ IDEA | 2023+ | 开发 |
| Apifox / Postman | 任意 | 调接口 |
| Git | 任意 | 版本管理 |

检查：

```bash
java -version
mvn -version
mysql --version
```

### 1.1 创建数据库

用 `docs/schema.sql`：

```bash
mysql -u root -p < docs/schema.sql
```

或者在 Navicat / DataGrip 里执行整个脚本。执行后应该有 4 张表：

```text
users
resumes
applications
interviews
```

### 1.2 创建 Spring Boot 工程

打开 [start.spring.io](https://start.spring.io/)，选择：

- Project：Maven
- Language：Java
- Spring Boot：3.3.x 或 3.4.x
- Group：`com.offerpilot`
- Artifact：`offerpilot-api`
- Packaging：Jar
- Java：17 或 21

依赖勾选：

- Spring Web
- Spring Security
- Validation
- MySQL Driver
- Lombok
- Configuration Processor

生成后解压，用 IDEA 打开。先确认能启动：

```bash
mvn spring-boot:run
```

默认端口 8080。

### 1.3 加额外依赖

在 `pom.xml` 里加 MyBatis-Plus 和 JWT（完整片段见 [BACKEND_GUIDE.md](BACKEND_GUIDE.md#1-技术选型)）：

- `mybatis-plus-spring-boot3-starter`
- `jjwt-api` / `jjwt-impl` / `jjwt-jackson`

如果你更熟 JPA，也可以把 MyBatis-Plus 换成 Spring Data JPA；**接口契约不变**，只是 Mapper / Repository 写法不同。

### 1.4 配置 application.yml

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/offerpilot?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: root
    password: 你的密码
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 12MB
  jackson:
    time-zone: Asia/Shanghai

mybatis-plus:
  configuration:
    map-underscore-to-camel-case: true

offerpilot:
  jwt:
    secret: 至少32字节的随机字符串
    expiration-hours: 168
  upload:
    dir: ./uploads
    public-prefix: http://localhost:8080/files
```

### 1.5 第一阶段验收

- [ ] 项目能启动
- [ ] 数据库 4 张表存在
- [ ] 访问一个临时 `/api/health` 返回 `ok`（这个接口可以临时加，联调完删掉）

---

## 2. 用户与认证（1–2 天）

这是整个后端的地基。不要先做业务 CRUD，否则后面每个接口都要返工加 `userId`。

### 2.1 建包结构

```text
com.offerpilot
├── OfferPilotApplication.java
├── common
│   ├── ApiError.java
│   ├── BusinessException.java
│   └── GlobalExceptionHandler.java
├── config
│   ├── SecurityConfig.java
│   └── CorsConfig.java
├── auth
│   ├── AuthController.java
│   ├── AuthService.java
│   ├── JwtService.java
│   ├── JwtFilter.java
│   └── dto
├── user
│   ├── User.java
│   ├── UserMapper.java
│   └── UserService.java
└── ...
```

### 2.2 先写 User 实体和 Mapper

字段与 `users` 表一致：

```java
@Data
@TableName("users")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String email;
    private String passwordHash;
    private String school;
    private String major;
    private Integer graduationYear;
    private String targetRole;
    private String location;
    private String bio;
    private Integer weeklyGoal;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

`UserMapper extends BaseMapper<User>`。

### 2.3 注册

`POST /api/auth/register`

服务逻辑：

1. 校验 name / email / password
2. 查邮箱是否存在，存在抛 409
3. `passwordEncoder.encode(password)`
4. 插入用户，默认 `weeklyGoal = 8`
5. 生成 JWT
6. 返回 `{ token, user }`，**不要返回 passwordHash**

### 2.4 登录

`POST /api/auth/login`

1. 按 email 查用户
2. `passwordEncoder.matches(raw, hash)`
3. 失败返回 401 `INVALID_CREDENTIALS`
4. 成功生成 JWT，返回 `{ token, user }`

### 2.5 JWT + Security

需要三种东西：

1. `JwtService`：生成、解析、校验 token；`subject` 放 userId
2. `JwtFilter`：从 `Authorization: Bearer ...` 解析用户并写入 `SecurityContext`
3. `SecurityConfig`：
   - 关闭 CSRF
   - `SessionCreationPolicy.STATELESS`
   - 放行 `/api/auth/login`、`/api/auth/register`
   - 其他请求要求认证
   - 401 返回 JSON，不要返回 Spring 默认登录页

**关键原则**：Controller 里不要相信前端传的 `userId`，统一从 `SecurityContext` 取。

### 2.6 当前用户与资料

- `GET /api/auth/me`
- `PUT /api/auth/profile`
- `PUT /api/auth/password`

`/me` 和 `/profile` 都从 token 里取 userId，再查库。

### 2.7 统一异常

至少处理：

- 参数校验失败 → 400 `VALIDATION_ERROR`
- 邮箱重复 → 409
- 密码错误 → 401
- 未登录 → 401
- 业务不存在 → 404
- 其他 → 500

错误格式按 [API.md](API.md#13-请求与响应格式)。

### 2.8 第二阶段验收

用 curl 走一遍：

```bash
# 注册
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"测试用户","email":"test@example.com","password":"123456"}'

# 登录
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'

# 带 token 查当前用户
curl http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer <token>"
```

- [ ] 注册成功返回 token
- [ ] 重复邮箱返回 409
- [ ] 错误密码返回 401
- [ ] 不带 token 访问 `/me` 返回 401 JSON
- [ ] 返回的 user 不包含密码

---

## 3. 投递 CRUD（2 天）

这是项目的核心业务，先把这一块做扎实。

### 3.1 实体

`Application` 对应 `applications` 表。注意：

- `tags` 是 JSON 数组，可用 MyBatis-Plus 的 `JacksonTypeHandler`
- `appliedAt` / `nextActionAt` 用 `LocalDate`
- `createdAt` / `updatedAt` 用 `LocalDateTime`
- 枚举可以直接用 String，减少类型转换成本

### 3.2 DTO 与校验

新增 / 编辑用 `ApplicationInput`：

```java
public class ApplicationInput {
    @NotBlank @Size(max = 40)
    private String company;

    @NotBlank @Size(max = 60)
    private String position;

    private String location;
    private String salary;

    @NotNull
    private String channel;

    @NotNull
    private String status;

    @NotNull
    private String priority;

    private LocalDate appliedAt;
    private LocalDate nextActionAt;

    private List<String> tags;
    @Size(max = 500)
    private String notes;

    private Long resumeId;
}
```

### 3.3 列表接口

`GET /api/applications`

必须支持：

- `keyword`
- `status`
- `channel`
- `page`
- `size`
- `sort`

实现要点：

- 所有查询都加 `user_id = 当前用户`
- 排序用白名单，不拼 SQL
- 返回 `{ items, total, page, size }`
- `size` 最大 100

### 3.4 新增 / 查询单条 / 编辑 / 删除

- `POST /api/applications`
- `GET /api/applications/{id}`
- `PUT /api/applications/{id}`
- `DELETE /api/applications/{id}`

每个接口都要校验“这条记录属于当前用户”。

删除时：

- 数据库外键 `interviews.application_id ON DELETE CASCADE`
- 或者 Service 里手动删关联面试
- 不要留下孤儿面试记录

### 3.5 拖拽改状态

`PATCH /api/applications/{id}/status`

```json
{ "status": "INTERVIEW" }
```

只更新状态和 `updatedAt`。前端是乐观更新，所以这个接口要快，失败时前端会回滚。

### 3.6 第三阶段验收

- [ ] 新增投递后能在列表查到
- [ ] 按状态 / 渠道 / 关键词筛选正确
- [ ] 分页 total 正确
- [ ] 编辑后 `updatedAt` 变化
- [ ] 删除后记录消失
- [ ] 用户 A 改 URL 里的 id 无法访问用户 B 的记录（重点）
- [ ] 拖拽状态后刷新仍保持

完成到这里，前端 `/applications` 页面就可以切真实接口了。

---

## 4. 面试日程（1 天）

### 4.1 接口

- `GET /api/interviews?from=&to=&status=`
- `POST /api/interviews`
- `PUT /api/interviews/{id}`
- `PATCH /api/interviews/{id}/status`
- `DELETE /api/interviews/{id}`

### 4.2 业务规则

- `scheduledAt` 用 `LocalDateTime`，格式 `yyyy-MM-ddTHH:mm:ss`
- `from` / `to` 是日期，按天边界过滤
- 新增面试时如果传了 `applicationId`：
  - 校验投递归属
  - 自动补 company / position
  - 把投递状态推进到 `INTERVIEW`（如果当前不是 OFFER / REJECTED）
- 列表按 `scheduledAt` 升序

### 4.3 验收

- [ ] 新增面试后投递状态自动变成面试中
- [ ] 前端面试日历能看到记录
- [ ] 修改时间后日历位置更新
- [ ] 标记完成 / 取消后状态正确
- [ ] 删除投递后关联面试消失

---

## 5. 简历上传（1 天）

### 5.1 接口

- `GET /api/resumes`
- `POST /api/resumes`（multipart）
- `PUT /api/resumes/{id}`
- `PATCH /api/resumes/{id}/default`
- `DELETE /api/resumes/{id}`

### 5.2 文件保存

1. 校验扩展名：pdf / doc / docx
2. 校验大小 ≤ 10MB
3. 生成 UUID 文件名
4. 存到 `offerpilot.upload.dir`
5. 数据库存 `file_name`、`file_size`、`file_type`、`file_url`
6. 映射 `/files/**` 到上传目录，或者用 OSS / MinIO

**不要**用用户原始文件名直接拼路径，防止目录穿越。

### 5.3 默认简历

必须在一个事务里：

```text
把当前用户所有简历 is_default = false
把目标简历 is_default = true
```

删除默认简历时，自动把剩余最新一份设为默认。

删除简历时，把所有引用它的投递 `resume_id` 置空。

### 5.4 验收

- [ ] 上传 PDF 成功，返回可访问的 fileUrl
- [ ] 文件超过 10MB 返回 413
- [ ] 默认简历同时只有一份
- [ ] 删除默认简历后自动产生新的默认
- [ ] 前端“简历库”能显示、预览、删除

---

## 6. Dashboard（1 天）

`GET /api/dashboard`

这个接口返回前端工作台要的所有数据。不要在前端发 6 个请求。

### 6.1 指标

- 已投递总数（不含 WISHLIST）
- 进行中：APPLIED + SCREENING + INTERVIEW
- 待参加面试数
- Offer 数
- 回复率
- 本周投递数 / 周目标

### 6.2 趋势

最近 14 天，按天统计：

- `applications`：当天 `applied_at` 数量
- `interviews`：当天 `scheduled_at` 数量

SQL 只查有数据的日期，**Java 里补零**，保证 14 个点连续。

### 6.3 漏斗 / 状态分布 / 最近记录 / 待办

- 漏斗：已投递 → 进入筛选 → 进入面试 → Offer
- 状态分布：固定返回 6 个状态，没有则为 0
- 最近更新：5 条，按 `updated_at` 倒序
- 待参加面试：3 条，按时间升序
- 待办：最多 4 条，规则见 [API.md](API.md#7-工作台)

### 6.4 验收

- [ ] 前端工作台指标与数据库一致
- [ ] 趋势图 14 个点连续，没有断点
- [ ] 状态分布数量相加等于全部记录
- [ ] 最近面试、最近投递显示正确
- [ ] 新增/删除投递后刷新 Dashboard 数据更新

---

## 7. Analytics（1 天）

`GET /api/analytics?range=30d|90d|365d`

### 7.1 推荐实现方式

数据量小，**不要写 10 条复杂 SQL**。先查区间内投递，再在 Java 里聚合：

```java
List<Application> apps = applicationMapper.selectList(
    Wrappers.lambdaQuery(Application.class)
        .eq(Application::getUserId, userId)
        .ne(Application::getStatus, "WISHLIST")
        .ge(Application::getAppliedAt, start)
        .le(Application::getAppliedAt, end)
);
```

### 7.2 指标

- `applications`：区间内数量
- `responseRate`：SCREENING / INTERVIEW / OFFER / REJECTED
- `interviewRate`：INTERVIEW / OFFER
- `offerRate`：OFFER
- `avgResponseDays`：有反馈记录的平均反馈天数

`delta` 与“前一个等长区间”比较。

### 7.3 趋势

- 30d：按天，30 个点
- 90d：按周，13 个点
- 365d：按月，12 个点

缺失的桶补 0。

### 7.4 渠道与星期

- `channels`：按渠道分组，返回投递、面试、Offer、回复率
- `weekdays`：固定周一至周日 7 项

### 7.5 验收

- [ ] 切换 30/90/365 天数据变化
- [ ] 渠道合计等于区间投递数
- [ ] 星期合计等于区间投递数
- [ ] 百分比保留 1 位小数
- [ ] 前端趋势图、环形图、渠道条正常

---

## 8. 接前端（0.5 天）

### 8.1 确认接口地址

`.env.development`：

```dotenv
VITE_API_BASE_URL=/api
VITE_PROXY_TARGET=http://localhost:8080
```

确保后端运行在 8080，然后重启 `npm run dev`。前端不包含 Mock 数据，所有数据都来自后端。

### 8.2 如果不用代理

直接请求 8080 时，需要 CORS 放行：

```text
http://localhost:5173
http://127.0.0.1:5173
```

### 8.3 联调顺序

1. 登录页登录成功，刷新后仍登录
2. 投递看板显示数据库数据
3. 新建投递 / 拖拽 / 删除
4. 面试日历
5. 简历上传
6. 工作台
7. 数据分析

### 8.4 常见联调问题

| 现象 | 原因 |
| --- | --- |
| 401 | token 没带 / JWT secret 不一致 / 过期 |
| 403 | Spring Security 拦截了未放行路径 |
| 400 日期解析失败 | 前端传 `yyyy-MM-dd`，后端用了 `LocalDateTime` |
| 返回字段驼峰不对 | MyBatis `map-underscore-to-camel-case` 未开 |
| 前端没有请求后端 | 后端未启动 / 代理地址不对 / Vite 未重启 |
| 上传 413 | multipart 大小限制没调 |
| 刷新 404 | 前端 history 路由需要 Nginx fallback 到 index.html |

---

## 9. 测试与收尾（1 天）

至少写这几类测试：

1. **认证**：注册、重复邮箱、错误密码、无 token
2. **越权**：用户 A 访问用户 B 的投递 / 面试 / 简历，返回 404 或 403
3. **参数校验**：缺 company、非法 status、size > 100
4. **状态流转**：拖拽接口更新成功
5. **文件**：格式不支持、超过 10MB

可以用 MockMvc：

```java
mockMvc.perform(get("/api/applications/{id}", otherUserId)
        .header("Authorization", "Bearer " + tokenA))
    .andExpect(status().isNotFound());
```

收尾清单：

- [ ] 所有接口在 Apifox 里保存示例
- [ ] `README` 写清启动方式和测试账号
- [ ] 敏感配置用环境变量
- [ ] 上传目录加入 `.gitignore`
- [ ] 数据库脚本可重复执行
- [ ] 录一段 1–2 分钟的演示视频

---

## 10. 建议排期

| 天 | 内容 | 产出 |
| --- | --- | --- |
| Day 1 | 环境、建库、Spring Boot 骨架 | 能启动 |
| Day 2 | 注册、登录、JWT、/me | 登录闭环 |
| Day 3 | 投递列表、新增、编辑、删除 | 投递 CRUD |
| Day 4 | 状态更新、筛选、分页 | 看板可用 |
| Day 5 | 面试 CRUD | 日历可用 |
| Day 6 | 简历上传、默认简历 | 简历库可用 |
| Day 7 | Dashboard | 工作台可用 |
| Day 8 | Analytics | 分析页可用 |
| Day 9 | 前端联调 + 修 bug | 全流程跑通 |
| Day 10 | 测试、文档、演示视频 | 可面试展示 |

如果时间紧，优先做 **Day 1–4 + Day 7**：登录、投递、看板、工作台，已经足够演示核心价值；面试和简历可以后补。

---

## 11. 接口速查

完整字段与示例见 [API.md](API.md)。按模块记：

| 模块 | 接口 |
| --- | --- |
| 认证 | `POST /auth/register`、`POST /auth/login`、`GET /auth/me`、`PUT /auth/profile`、`PUT /auth/password` |
| 投递 | `GET/POST /applications`、`GET/PUT/DELETE /applications/{id}`、`PATCH /applications/{id}/status` |
| 面试 | `GET/POST /interviews`、`PUT/DELETE /interviews/{id}`、`PATCH /interviews/{id}/status` |
| 简历 | `GET/POST /resumes`、`PUT/DELETE /resumes/{id}`、`PATCH /resumes/{id}/default` |
| 工作台 | `GET /dashboard` |
| 分析 | `GET /analytics?range=30d` |

所有接口前缀 `/api`，除注册/登录外都需要：

```http
Authorization: Bearer <token>
```

---

## 12. 一句话原则

**先把“用户 + 投递 + 状态”这条主链路做通，再扩展面试、简历、统计。**  
不要先追求所有表、所有接口、所有设计模式；能联调、能演示、能讲清楚取舍，比“代码看起来企业级”更重要。
