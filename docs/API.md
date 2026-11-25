# OfferPilot 后端接口文档

> 版本：v1.0  
> 前端项目：Vue 3 + TypeScript + Vite  
> 后端建议：Spring Boot 3 + Spring Security + JWT + MyBatis-Plus / JPA + MySQL 8  
> 接口前缀：`/api`

这份文档与前端代码中的 `src/api/index.ts`、`src/types/index.ts` 保持一致。前端只调用真实接口，启动 Spring Boot 后端并在 `.env.development` 中配置代理地址即可联调，不需要改动页面组件。

---

## 1. 通用约定

### 1.1 基础地址

| 环境 | Base URL |
| --- | --- |
| 本地开发 | `http://localhost:8080/api` |
| 前端代理 | `/api`（Vite 已代理到 `VITE_PROXY_TARGET`，默认 `http://localhost:8080`） |

前端 Axios 实例定义在 `src/api/http.ts`，默认超时 15 秒。

### 1.2 认证

除注册、登录外，所有接口都需要携带 JWT：

```http
Authorization: Bearer <token>
```

Token 建议使用 `HS256`，`sub` 存放用户 ID，有效期 7 天。登录成功后将 token 和用户信息一起返回，前端保存到 `localStorage`。

### 1.3 请求与响应格式

前端 Axios 同时兼容两种响应方式，推荐使用统一包装：

```json
{
  "code": 1,
  "msg": "success",
  "data": {
    "id": "app-1",
    "company": "字节跳动",
    "position": "前端开发实习生"
  }
}
```

失败：

```json
{
  "code": 0,
  "msg": "参数校验失败",
  "data": null,
  "fieldErrors": {
    "company": "公司名称不能为空"
  }
}
```

`code = 1` 表示成功，`code = 0` 表示业务失败；同时要返回正确的 HTTP 状态码：`400` 参数错误、`401` 未登录、`403` 无权限、`404` 不存在、`409` 冲突、`500` 服务端异常。

前端代码位于 `src/api/http.ts`，检测到 `{ code, msg, data }` 会自动解包。**下文各接口的响应示例展示的是 `data` 字段内容，省略了外层包装。** 如果后端直接返回 `data`，前端也兼容。

更完整的认证模块包装示例见 [API_AUTH_DOC.md](API_AUTH_DOC.md)。

### 1.4 日期与时间

| 类型 | 格式 | 示例 |
| --- | --- | --- |
| 日期 | `yyyy-MM-dd` | `2026-11-20` |
| 日期时间 | `yyyy-MM-dd'T'HH:mm:ss` | `2026-11-20T14:00:00` |
| 服务端时间戳 | ISO-8601 带时区 | `2026-11-19T20:00:00+08:00` |

推荐后端使用 `LocalDate` 接收 `appliedAt`、`nextActionAt`，使用 `LocalDateTime` 接收 `scheduledAt`。所有时间按 `Asia/Shanghai` 处理。

### 1.5 分页

投递列表使用分页：

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `page` | `1` | 从 1 开始 |
| `size` | `20` | 最大 100 |

响应：

```json
{
  "items": [],
  "total": 16,
  "page": 1,
  "size": 20
}
```

面试、简历数量较少，返回 `{ "items": [], "total": 0 }`，不分页。

### 1.6 枚举

#### 投递状态 `ApplicationStatus`

| 值 | 中文 | 说明 |
| --- | --- | --- |
| `WISHLIST` | 想投递 | 尚未投递，可没有 `appliedAt` |
| `APPLIED` | 已投递 | 简历已送达 |
| `SCREENING` | 筛选中 | HR / 业务评估中 |
| `INTERVIEW` | 面试中 | 已进入面试流程 |
| `OFFER` | 已获 Offer | 已发 Offer |
| `REJECTED` | 未通过 | 流程结束 |

#### 投递渠道 `ApplicationChannel`

`BOSS`（BOSS 直聘）、`REFERRAL`（内推）、`OFFICIAL`（企业官网）、`LINKEDIN`、`CAMPUS`（校园招聘）、`OTHER`

#### 优先级 `ApplicationPriority`

`HIGH`、`MEDIUM`、`LOW`

#### 面试形式 `InterviewType`

`PHONE`（电话）、`VIDEO`（视频）、`ONSITE`（现场）

#### 面试状态 `InterviewStatus`

`UPCOMING`（待参加）、`COMPLETED`（已完成）、`CANCELLED`（已取消）

#### 分析区间 `AnalyticsRange`

`30d`、`90d`、`365d`

---

## 2. 数据模型

### 2.1 User

```ts
interface User {
  id: string
  name: string
  email: string
  school: string
  major: string
  graduationYear: number
  targetRole: string
  location: string
  bio: string
  weeklyGoal: number
}
```

### 2.2 Application

```ts
interface Application {
  id: string
  company: string
  position: string
  location: string
  salary: string
  channel: ApplicationChannel
  status: ApplicationStatus
  priority: ApplicationPriority
  appliedAt: string | null       // yyyy-MM-dd
  nextActionAt: string | null    // yyyy-MM-dd
  tags: string[]
  notes: string
  resumeId: string | null
  createdAt: string              // ISO-8601
  updatedAt: string              // ISO-8601
}
```

`ApplicationInput` 是去掉 `id`、`createdAt`、`updatedAt` 后的字段集合，用于新增和编辑。

### 2.3 Interview

```ts
interface Interview {
  id: string
  applicationId: string | null
  company: string
  position: string
  round: string
  type: InterviewType
  scheduledAt: string            // yyyy-MM-ddTHH:mm:ss
  durationMinutes: number
  location: string
  link: string
  interviewer: string
  status: InterviewStatus
  notes: string
  createdAt: string
  updatedAt: string
}
```

### 2.4 Resume

```ts
interface Resume {
  id: string
  name: string
  targetRole: string
  version: number
  fileName: string
  fileSize: number
  fileType: string
  fileUrl: string                // 可为空；有值时应可直接打开或下载
  isDefault: boolean
  createdAt: string
  updatedAt: string
}
```

### 2.5 MetricValue

仪表盘和分析页中的指标统一使用：

```ts
interface MetricValue {
  value: number   // 指标值
  delta: number   // 与上一周期相比的变化
}
```

百分比指标 `value` 是百分数（例如 `78.6` 表示 78.6%），`delta` 是百分点；天数指标 `delta` 是天数差。

---

## 3. 认证接口

### 3.1 登录

`POST /auth/login`

请求：

```json
{
  "email": "lin@example.com",
  "password": "123456",
  "remember": true
}
```

响应 `200`：

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "user-1",
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

失败：`401 INVALID_CREDENTIALS`。

### 3.2 注册

`POST /auth/register`

```json
{
  "name": "林知遥",
  "email": "lin@example.com",
  "password": "123456"
}
```

响应同登录。邮箱已存在返回 `409 EMAIL_ALREADY_EXISTS`。

### 3.3 当前用户

`GET /auth/me` → `User`

### 3.4 更新资料

`PUT /auth/profile`

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

响应更新后的 `User`。

> `weeklyGoal` 范围建议 1–30。邮箱暂不允许在资料页修改。

### 3.5 修改密码

`PUT /auth/password`

```json
{
  "currentPassword": "offerpilot",
  "newPassword": "newpass123"
}
```

成功返回 `204 No Content`。当前密码错误返回 `400 INVALID_PASSWORD`。

---

## 4. 投递管理

### 4.1 分页查询投递

`GET /applications`

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `keyword` | string | 否 | 模糊匹配公司、岗位、地点、标签、备注 |
| `status` | enum | 否 | 不传或 `ALL` 表示全部 |
| `channel` | enum | 否 | 不传或 `ALL` 表示全部 |
| `page` | int | 否 | 默认 1 |
| `size` | int | 否 | 默认 20，最大 100 |
| `sort` | string | 否 | 默认 `updatedAt,desc` |

排序白名单：

- `updatedAt,desc` / `updatedAt,asc`
- `appliedAt,desc` / `appliedAt,asc`
- `company,asc`

响应：

```json
{
  "items": [
    {
      "id": "app-1",
      "company": "字节跳动",
      "position": "前端开发实习生",
      "location": "北京 · 海淀",
      "salary": "300–400/天",
      "channel": "BOSS",
      "status": "INTERVIEW",
      "priority": "HIGH",
      "appliedAt": "2026-11-07",
      "nextActionAt": "2026-11-20",
      "tags": ["React", "TypeScript", "大厂"],
      "notes": "一面已通过，重点准备性能优化。",
      "resumeId": "res-2",
      "createdAt": "2026-11-07T10:00:00+08:00",
      "updatedAt": "2026-11-18T18:00:00+08:00"
    }
  ],
  "total": 16,
  "page": 1,
  "size": 20
}
```

> 前端看板会请求 `page=1&size=100` 一次拿到全部记录，再在客户端做拖拽展示；列表页也使用这一份数据。后端仍需支持标准分页，方便后续扩展。

### 4.2 查询单条

`GET /applications/{id}` → `Application`  
不存在：`404 APPLICATION_NOT_FOUND`。

### 4.3 新增投递

`POST /applications`

```json
{
  "company": "字节跳动",
  "position": "前端开发实习生",
  "location": "北京 · 海淀",
  "salary": "300–400/天",
  "channel": "BOSS",
  "status": "APPLIED",
  "priority": "HIGH",
  "appliedAt": "2026-11-19",
  "nextActionAt": "2026-11-22",
  "tags": ["React", "TypeScript"],
  "notes": "官网投递，等待 HR 回复。",
  "resumeId": "res-1"
}
```

校验：

- `company`、`position` 必填，最长 40 / 60 字符
- `channel`、`status`、`priority` 必须是合法枚举
- `status != WISHLIST` 时，`appliedAt` 为空则默认当天
- `resumeId` 必须存在且属于当前用户，或传 `null`

响应 `201` + 完整 `Application`。

### 4.4 更新投递

`PUT /applications/{id}`

请求体与新增一致。响应更新后的 `Application`。  
建议在服务端校验状态机（可选）：例如不允许从 `REJECTED` 直接回到 `APPLIED`，或者只记录状态变更日志，由你决定。当前前端不限制状态跳转。

### 4.5 更新状态（看板拖拽）

`PATCH /applications/{id}/status`

```json
{
  "status": "INTERVIEW"
}
```

响应更新后的 `Application`。  
前端拖拽后会先乐观更新界面，失败时回滚。

### 4.6 删除投递

`DELETE /applications/{id}` → `204`

建议级联删除该投递关联的面试记录，或在数据库外键上设置 `ON DELETE CASCADE`。前端删除确认文案已提示“关联面试日程会一并移除”。

---

## 5. 面试日程

### 5.1 查询面试

`GET /interviews`

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `from` | `yyyy-MM-dd` | 起始日期（含当天） |
| `to` | `yyyy-MM-dd` | 结束日期（含当天） |
| `status` | enum | `UPCOMING` / `COMPLETED` / `CANCELLED`；`ALL` 或不传为全部 |

响应：

```json
{
  "items": [
    {
      "id": "int-1",
      "applicationId": "app-1",
      "company": "字节跳动",
      "position": "前端开发实习生",
      "round": "业务一面",
      "type": "VIDEO",
      "scheduledAt": "2026-11-20T14:00:00",
      "durationMinutes": 45,
      "location": "飞书视频会议",
      "link": "https://meeting.feishu.cn/",
      "interviewer": "王老师",
      "status": "UPCOMING",
      "notes": "重点：项目难点、React 渲染性能。",
      "createdAt": "2026-11-17T12:00:00+08:00",
      "updatedAt": "2026-11-18T09:00:00+08:00"
    }
  ],
  "total": 1
}
```

建议按 `scheduledAt` 升序返回。

### 5.2 新增面试

`POST /interviews`

```json
{
  "applicationId": "app-1",
  "company": "字节跳动",
  "position": "前端开发实习生",
  "round": "业务一面",
  "type": "VIDEO",
  "scheduledAt": "2026-11-20T14:00:00",
  "durationMinutes": 45,
  "location": "飞书视频会议",
  "link": "https://meeting.feishu.cn/",
  "interviewer": "王老师",
  "status": "UPCOMING",
  "notes": "重点：项目难点、React 渲染性能。"
}
```

校验：

- `scheduledAt` 必填
- `company`、`round` 必填
- 如果传了 `applicationId`，自动带出 company / position，并把该投递状态更新为 `INTERVIEW`（若当前不是 `OFFER` / `REJECTED`）

响应 `201` + `Interview`。

### 5.3 更新面试

`PUT /interviews/{id}`，请求体同新增。

### 5.4 更新面试状态

`PATCH /interviews/{id}/status`

```json
{ "status": "COMPLETED" }
```

响应更新后的 `Interview`。

### 5.5 删除面试

`DELETE /interviews/{id}` → `204`

---

## 6. 简历库

### 6.1 简历列表

`GET /resumes`

```json
{
  "items": [
    {
      "id": "res-1",
      "name": "前端开发 · 通用版",
      "targetRole": "前端开发实习生",
      "version": 4,
      "fileName": "林知遥_前端开发_通用版.pdf",
      "fileSize": 292864,
      "fileType": "application/pdf",
      "fileUrl": "http://localhost:8080/files/resumes/xxx.pdf",
      "isDefault": true,
      "createdAt": "2026-09-20T10:00:00+08:00",
      "updatedAt": "2026-11-17T20:00:00+08:00"
    }
  ],
  "total": 1
}
```

排序：默认简历优先，其余按 `updatedAt` 倒序。

### 6.2 上传简历

`POST /resumes`  
`Content-Type: multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `file` | file | 是 | PDF / DOC / DOCX，≤ 10MB |
| `name` | string | 是 | 版本名称 |
| `targetRole` | string | 是 | 目标岗位 |

响应 `201` + `Resume`。

实现建议：

- 文件保存到本地目录或 MinIO / 阿里云 OSS
- 数据库只存相对路径，返回时拼成可访问 URL
- 同一 `targetRole` 的 `version` 从 1 递增
- 用户的第一份简历自动设为默认
- 建议限制 filename 中的路径穿越字符，并校验真实 MIME / 扩展名

### 6.3 更新简历信息

`PUT /resumes/{id}`

```json
{
  "name": "字节跳动 · 前端定向版",
  "targetRole": "前端开发实习生"
}
```

响应更新后的 `Resume`，不改文件本身。

### 6.4 设为默认简历

`PATCH /resumes/{id}/default` → 更新后的 `Resume`

必须在同一事务里先把当前用户其他简历的 `is_default` 置为 `false`，再把目标记录置为 `true`。

### 6.5 删除简历

`DELETE /resumes/{id}` → `204`

- 若删除的是默认简历，自动把剩余最新的一份设为默认
- 引用该简历的投递记录应将 `resume_id` 置空（`ON DELETE SET NULL`）
- 同时删除磁盘文件（可异步）

---

## 7. 工作台

`GET /dashboard`

一次性返回仪表盘需要的聚合数据，避免前端发多个请求。

```json
{
  "metrics": {
    "total": { "value": 14, "delta": 3 },
    "active": { "value": 10, "delta": 10 },
    "interviews": { "value": 5, "delta": 3 },
    "offers": { "value": 2, "delta": 2 },
    "responseRate": { "value": 78.6, "delta": -21.4 },
    "weekly": { "applied": 3, "target": 8 }
  },
  "trend": [
    { "date": "2026-11-06", "label": "11/6", "applications": 0, "interviews": 0 },
    { "date": "2026-11-07", "label": "11/7", "applications": 1, "interviews": 0 }
  ],
  "funnel": [
    { "key": "applied", "label": "已投递", "value": 14, "rate": 100 },
    { "key": "screening", "label": "进入筛选", "value": 11, "rate": 78.6 },
    { "key": "interview", "label": "进入面试", "value": 7, "rate": 63.6 },
    { "key": "offer", "label": "收获 Offer", "value": 2, "rate": 28.6 }
  ],
  "statusDistribution": [
    { "status": "WISHLIST", "value": 2 },
    { "status": "APPLIED", "value": 3 },
    { "status": "SCREENING", "value": 2 },
    { "status": "INTERVIEW", "value": 5 },
    { "status": "OFFER", "value": 2 },
    { "status": "REJECTED", "value": 2 }
  ],
  "upcomingInterviews": [],
  "recentApplications": [],
  "tasks": [
    {
      "id": "interview-int-1",
      "title": "准备「字节跳动」业务一面",
      "meta": "11月20日 14:00 · 视频面",
      "kind": "INTERVIEW",
      "dueAt": "2026-11-20T14:00:00"
    }
  ]
}
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `metrics.total` | 已投递总数（不含 WISHLIST），`delta` 建议为近 7 天新增 |
| `metrics.active` | APPLIED + SCREENING + INTERVIEW |
| `metrics.interviews` | 待参加面试数 |
| `metrics.offers` | Offer 数 |
| `metrics.responseRate` | 有进展（SCREENING 及以后）/ 已投递 |
| `metrics.weekly` | 本周投递数 + 用户目标 |
| `trend` | 最近 14 天，按天返回 |
| `funnel[].rate` | 相对上一阶段的转化率，第一项为 100 |
| `statusDistribution` | 建议固定返回 6 个状态，没有则为 0 |
| `upcomingInterviews` | 最多 3 条，按时间升序 |
| `recentApplications` | 最多 5 条，按 `updatedAt` 倒序 |
| `tasks` | 最多 4 条，前端可本地勾选完成 |

`tasks[].kind`：`INTERVIEW`、`FOLLOW_UP`、`REVIEW`。

建议任务生成规则：

1. 最近一场待参加面试 → “准备「公司」轮次”
2. `nextActionAt` 临近的 APPLIED / SCREENING 投递 → “跟进「公司」的投递进度”
3. 最早的一条 WISHLIST → “完善「公司」的投递材料”
4. 最多返回 4 条

---

## 8. 数据分析

`GET /analytics?range=30d`

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `range` | 否 | `30d` / `90d` / `365d`，默认 `30d` |

```json
{
  "range": "30d",
  "summary": {
    "applications": { "value": 13, "delta": 12 },
    "responseRate": { "value": 76.9, "delta": -23.1 },
    "interviewRate": { "value": 46.2, "delta": -53.8 },
    "offerRate": { "value": 15.4, "delta": -9.6 },
    "avgResponseDays": { "value": 7.9, "delta": -19.1 }
  },
  "trend": [
    { "date": "2026-10-21", "label": "10/21", "applications": 0, "interviews": 0 }
  ],
  "channels": [
    {
      "channel": "REFERRAL",
      "applications": 5,
      "interviews": 4,
      "offers": 1,
      "responseRate": 100
    }
  ],
  "statusDistribution": [
    { "status": "APPLIED", "value": 3 }
  ],
  "weekdays": [
    { "label": "周一", "value": 2 },
    { "label": "周二", "value": 1 },
    { "label": "周三", "value": 5 },
    { "label": "周四", "value": 0 },
    { "label": "周五", "value": 2 },
    { "label": "周六", "value": 1 },
    { "label": "周日", "value": 0 }
  ]
}
```

计算口径：

| 字段 | 口径 |
| --- | --- |
| `applications` | 区间内 `appliedAt` 在范围内的已投递记录 |
| `responseRate` | 进入 SCREENING / INTERVIEW / OFFER / REJECTED 的比例 |
| `interviewRate` | INTERVIEW + OFFER 的比例 |
| `offerRate` | OFFER 的比例 |
| `avgResponseDays` | 有反馈记录从投递到最近更新的平均天数 |
| `trend` | 30d 按天、90d 按周、365d 按月聚合 |
| `channels` | 按渠道聚合，只返回有投递的渠道 |
| `weekdays` | 固定周一至周日 7 项 |

`delta` 为与“前一个等长区间”的差值。百分比类指标单位为百分点（pp）。

---

## 9. 错误码建议

| HTTP | code | 说明 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 参数校验失败 |
| 400 | `INVALID_PASSWORD` | 当前密码错误 |
| 401 | `INVALID_CREDENTIALS` | 邮箱或密码错误 |
| 401 | `UNAUTHORIZED` | 未登录或 token 失效 |
| 403 | `FORBIDDEN` | 无权访问他人数据 |
| 404 | `APPLICATION_NOT_FOUND` | 投递不存在 |
| 404 | `INTERVIEW_NOT_FOUND` | 面试不存在 |
| 404 | `RESUME_NOT_FOUND` | 简历不存在 |
| 409 | `EMAIL_ALREADY_EXISTS` | 邮箱已注册 |
| 413 | `FILE_TOO_LARGE` | 文件超过 10MB |
| 415 | `UNSUPPORTED_FILE_TYPE` | 文件格式不支持 |
| 500 | `INTERNAL_ERROR` | 服务端异常 |

---

## 10. Spring Boot 对接清单

### 10.1 跨域

前端开发地址是 `http://127.0.0.1:5173`，Vite 已代理 `/api` 到 `http://localhost:8080`，通常不需要 CORS。若你直接让前端请求 8080，需要放行：

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("http://localhost:5173", "http://127.0.0.1:5173")
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Authorization")
                .maxAge(3600);
    }
}
```

### 10.2 推荐包结构

```text
com.offerpilot
├── common          // Result、异常、枚举、分页
├── config          // Security、CORS、Jackson、上传配置
├── auth            // 登录、注册、JWT
├── user            // User 实体 / Mapper / Service
├── application     // 投递
├── interview       // 面试
├── resume          // 简历与文件
├── dashboard       // 工作台聚合
└── analytics       // 数据分析聚合
```

### 10.3 JWT 过滤器

- 从 `Authorization` 读取 Bearer token
- 校验签名和过期时间
- 将 userId 放入 `SecurityContext`
- 所有业务查询都必须带 `user_id` 条件，不能只按 id 查询，否则会越权
- 401 时返回统一错误 JSON，而不是默认的 HTML 登录页

### 10.4 数据隔离

每张业务表都应有 `user_id`：

```sql
WHERE id = ? AND user_id = ?
```

新增时从当前登录用户取 `userId`，不要相信前端传入的用户 ID。

### 10.5 文件上传

```yaml
spring:
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 12MB
```

返回给前端的 `fileUrl` 推荐是完整 URL，前端会直接 `window.open` / 下载。

### 10.6 前端连接真实接口

确认后端运行在 `http://localhost:8080`，`.env.development`：

```dotenv
VITE_API_BASE_URL=/api
VITE_PROXY_TARGET=http://localhost:8080
```

重启 `npm run dev`。前端不内置任何业务数据，所有列表、统计和上传都来自后端。

### 10.7 联调顺序

1. 注册 / 登录 + `/auth/me`
2. 投递列表、新增、编辑、删除
3. `PATCH /applications/{id}/status`（拖拽）
4. 面试列表与新增
5. 简历上传与默认简历
6. `/dashboard`
7. `/analytics`

先完成 1–3 就能看到项目主要流程，再补聚合接口。

---

## 11. curl 冒烟测试

```bash
# 登录
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"lin@example.com","password":"123456"}'

# 查询投递（替换 token）
curl "http://localhost:8080/api/applications?page=1&size=20&status=INTERVIEW" \
  -H "Authorization: Bearer <token>"

# 新增投递
curl -X POST http://localhost:8080/api/applications \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "company":"字节跳动",
    "position":"前端开发实习生",
    "location":"北京 · 海淀",
    "salary":"300–400/天",
    "channel":"BOSS",
    "status":"APPLIED",
    "priority":"HIGH",
    "appliedAt":"2026-11-19",
    "nextActionAt":"2026-11-22",
    "tags":["React"],
    "notes":"",
    "resumeId":null
  }'
```
