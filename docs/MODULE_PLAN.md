# 登录完成后的功能模块规划

> 当前状态：注册、登录、JWT、`/auth/me` 已完成。  
> 前端没有 Mock 数据，登录后所有页面都依赖真实接口。  
> 完整字段见 [API.md](API.md)，模块接口速查见 [API_MODULES.md](API_MODULES.md)。

---

## 一、先理解登录后会发生什么

前端登录成功后进入 `/dashboard`，`AppShell` 会立即请求：

```text
GET /api/applications
GET /api/interviews
```

工作台页面还会请求：

```text
GET /api/dashboard
```

如果这三个接口没写，浏览器 Network 会报错，页面会显示错误或空状态。

所以登录完成后，**不要马上做数据分析**，先让应用“能进入且不报错”。

---

## 二、推荐模块顺序

| 顺序 | 模块 | 页面 | 优先级 | 依赖 |
| --- | --- | --- | --- | --- |
| 0 | 最小占位接口 | 全局 | P0 | 无 |
| 1 | 投递管理 | `/applications` | P0 | 认证 |
| 2 | 工作台 | `/dashboard` | P0 | 投递、面试 |
| 3 | 面试日程 | `/interviews` | P1 | 投递 |
| 4 | 简历库 | `/resumes` | P1 | 认证、文件上传 |
| 5 | 数据分析 | `/analytics` | P2 | 投递、面试 |
| 6 | 个人资料 / 密码 | `/settings` | P2 | 认证 |

---

# 阶段 0：让登录后不报错

先实现三个“能返回空数据”的接口：

```text
GET /api/applications?page=1&size=100
GET /api/interviews
GET /api/dashboard
```

返回示例：

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "size": 100
}
```

```json
{
  "items": [],
  "total": 0
}
```

Dashboard 先返回结构完整的空数据，不要返回 404。

### 验收

- [ ] 登录后进入工作台，不跳回登录页
- [ ] 浏览器 Network 没有 404/500
- [ ] 页面显示空状态，而不是报错

---

# 模块 1：投递管理

## 功能

```text
新增投递
编辑投递
删除投递
列表 / 看板
搜索、状态筛选、渠道筛选、分页
拖拽更新状态
```

对应页面：

```text
/applications
```

## 核心业务

投递是项目的中心数据：

```text
投递 → 面试 → Offer / 拒绝
```

后面的 Dashboard、面试、Analytics 都依赖它。

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/applications` | 分页、搜索、筛选 |
| POST | `/api/applications` | 新增 |
| GET | `/api/applications/{id}` | 详情 |
| PUT | `/api/applications/{id}` | 编辑 |
| DELETE | `/api/applications/{id}` | 删除 |
| PATCH | `/api/applications/{id}/status` | 拖拽改状态 |

## 数据表

```text
applications
```

关键字段：

```text
id, user_id, company, position, location, salary,
channel, status, priority,
applied_at, next_action_at,
tags, notes, resume_id,
created_at, updated_at
```

## 后端要点

- 所有查询必须带 `user_id`
- 分页参数：`page`、`size`
- 排序用白名单，不拼 SQL
- `size` 最大 100
- 删除投递级联删除面试
- 拖拽接口只更新 `status` 和 `updated_at`

## 验收

- [ ] 新增后列表出现
- [ ] 刷新后仍存在
- [ ] 搜索公司/岗位有效
- [ ] 状态筛选有效
- [ ] 拖拽后刷新状态正确
- [ ] A 用户不能访问 B 用户的记录

---

# 模块 2：工作台

## 功能

```text
累计投递 / 进行中 / 待面试 / Offer
本周投递目标
最近 14 天投递趋势
投递转化漏斗
最近面试
最近更新的投递
今日待办
```

对应页面：

```text
/dashboard
```

## 依赖

- 投递数据
- 面试数据

## 接口

```text
GET /api/dashboard
```

一次返回所有聚合数据，不要让前端发 6 个请求。

## 后端计算

```text
已投递：status != WISHLIST
进行中：APPLIED + SCREENING + INTERVIEW
待面试：UPCOMING 且时间 >= 现在
Offer：status = OFFER
回复率：有反馈 / 已投递
```

趋势按天查询后，**Java 补零到连续 14 天**。

## 验收

- [ ] 指标和数据库一致
- [ ] 趋势图连续 14 个点
- [ ] 状态分布数量相加正确
- [ ] 新增/删除投递后刷新 Dashboard 有变化

---

# 模块 3：面试日程

## 功能

```text
面试列表
新增面试
编辑面试
标记完成 / 取消
删除面试
月历展示
当天安排
准备清单（前端本地）
```

对应页面：

```text
/interviews
```

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/interviews` | 按日期、状态查询 |
| POST | `/api/interviews` | 新增 |
| PUT | `/api/interviews/{id}` | 编辑 |
| PATCH | `/api/interviews/{id}/status` | 完成/取消 |
| DELETE | `/api/interviews/{id}` | 删除 |

## 业务规则

- 新增面试可以关联 `applicationId`
- 关联后自动带出公司、岗位
- 同时把投递状态推进到 `INTERVIEW`
- 按 `scheduledAt` 升序

## 验收

- [ ] 新增后日历出现
- [ ] 修改时间后位置更新
- [ ] 投递状态自动变成面试中
- [ ] 删除投递后面试消失

---

# 模块 4：简历库

## 功能

```text
上传简历
多个版本
设置默认简历
编辑版本名称 / 目标岗位
删除简历
预览 / 下载文件
```

对应页面：

```text
/resumes
```

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/resumes` | 列表 |
| POST | `/api/resumes` | multipart 上传 |
| PUT | `/api/resumes/{id}` | 修改名称/岗位 |
| PATCH | `/api/resumes/{id}/default` | 设默认 |
| DELETE | `/api/resumes/{id}` | 删除 |

## 业务规则

- PDF / DOC / DOCX，最大 10MB
- 文件用 UUID 命名
- 第一份简历自动默认
- 默认简历唯一，设置时用事务
- 删除默认简历后自动选一份新的
- 删除简历时把投递里的 `resumeId` 置空

## 验收

- [ ] 上传成功后前端能拿到 fileUrl
- [ ] 默认简历只有一份
- [ ] 删除默认简历后自动切换
- [ ] 超过 10MB 返回 413

---

# 模块 5：数据分析

## 功能

```text
近 30 / 90 / 365 天
投递总量、回复率、面试转化率、Offer 率、平均反馈天数
投递与面试趋势
渠道表现
状态分布
投递星期分布
```

对应页面：

```text
/analytics
```

## 接口

```text
GET /api/analytics?range=30d
```

`range` 支持：

```text
30d / 90d / 365d
```

## 实现建议

数据量小，直接查区间内投递，在 Java 里聚合，不要一开始写复杂 SQL。

## 验收

- [ ] 切换时间范围数据变化
- [ ] 渠道合计等于区间投递数
- [ ] 星期合计等于区间投递数
- [ ] 百分比保留 1 位小数

---

# 模块 6：个人资料与设置

## 功能

```text
修改姓名、学校、专业、毕业年份
修改目标岗位、期望城市、简介
修改每周投递目标
修改密码
退出登录
```

对应页面：

```text
/settings
```

## 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/auth/me` | 当前用户（已完成） |
| PUT | `/api/auth/profile` | 更新资料 |
| PUT | `/api/auth/password` | 修改密码 |

## 验收

- [ ] 保存后刷新仍生效
- [ ] 周目标 1–30
- [ ] 修改密码后旧密码失效
- [ ] 退出后不能访问受保护页面

---

# 三、建议排期

| 天 | 任务 |
| --- | --- |
| Day 1 | 三个空接口：applications / interviews / dashboard |
| Day 2–3 | 投递新增、列表、详情、编辑、删除 |
| Day 4 | 拖拽状态、筛选、分页 |
| Day 5 | Dashboard 聚合 |
| Day 6 | 面试 CRUD + 状态 |
| Day 7 | 简历上传 + 默认简历 |
| Day 8 | Analytics |
| Day 9 | 资料与密码 |
| Day 10 | 全流程联调、越权测试、演示 |

时间紧就优先完成：

```text
空接口 → 投递 CRUD → 拖拽 → Dashboard
```

这四块已经足够演示项目核心价值。

---

# 四、联调注意

- 登录后 AppShell 会自动请求 applications / interviews
- 没有接口时不要返回 404，先返回空列表
- 所有响应字段用驼峰
- 日期用 `yyyy-MM-dd`
- 日期时间用 `yyyy-MM-ddTHH:mm:ss`
- 401 返回 JSON，不要返回登录页
- 每个业务查询都要带当前 `userId`
- 前端已经不再使用 Mock，数据只来自后端
