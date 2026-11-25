# 后续模块接口速查

> 当前后端 `Result` 使用 `message` 字段，所以本文按 `message` 写；前端也兼容 `msg`，二选一即可。  
> 完整字段、枚举和错误码见 [API.md](API.md)，OpenAPI 见 [openapi.yaml](openapi.yaml)。

## 通用约定

```text
Base URL：http://localhost:8080/api
认证头：Authorization: Bearer <token>
```

成功：

```json
{
  "code": 1,
  "message": "success",
  "data": {}
}
```

失败：

```json
{
  "code": 0,
  "message": "参数校验失败",
  "data": null
}
```

HTTP 状态码：

| 场景 | 状态码 |
| --- | --- |
| 成功 | 200 / 201 |
| 参数错误 | 400 |
| 未登录 | 401 |
| 无权限 | 403 |
| 不存在 | 404 |
| 冲突 | 409 |
| 服务端异常 | 500 |

---

# 1. 投递管理

页面：`/applications`

## 1.1 分页查询

`GET /api/applications`

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `keyword` | String | 否 | 公司 / 岗位 / 地点 / 标签 / 备注 |
| `status` | String | 否 | `WISHLIST` / `APPLIED` / `SCREENING` / `INTERVIEW` / `OFFER` / `REJECTED` |
| `channel` | String | 否 | `BOSS` / `REFERRAL` / `OFFICIAL` / `LINKEDIN` / `CAMPUS` / `OTHER` |
| `page` | Integer | 否 | 默认 1 |
| `size` | Integer | 否 | 默认 20，最大 100 |
| `sort` | String | 否 | `updatedAt,desc` 等 |

响应：

```json
{
  "code": 1,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "1",
        "company": "字节跳动",
        "position": "前端开发实习生",
        "location": "北京 · 海淀",
        "salary": "300–400/天",
        "channel": "BOSS",
        "status": "INTERVIEW",
        "priority": "HIGH",
        "appliedAt": "2026-11-07",
        "nextActionAt": "2026-11-20",
        "tags": ["React", "TypeScript"],
        "notes": "准备性能优化",
        "resumeId": "1",
        "createdAt": "2026-11-07T10:00:00",
        "updatedAt": "2026-11-18T18:00:00"
      }
    ],
    "total": 1,
    "page": 1,
    "size": 20
  }
}
```

## 1.2 新增

`POST /api/applications`

```json
{
  "company": "字节跳动",
  "position": "前端开发实习生",
  "location": "北京 · 海淀",
  "salary": "300–400/天",
  "channel": "BOSS",
  "status": "APPLIED",
  "priority": "HIGH",
  "appliedAt": "2026-11-23",
  "nextActionAt": "2026-11-26",
  "tags": ["React", "TypeScript"],
  "notes": "官网投递",
  "resumeId": "1"
}
```

响应：新增后的投递对象。

## 1.3 详情 / 编辑 / 删除

```text
GET    /api/applications/{id}
PUT    /api/applications/{id}
DELETE /api/applications/{id}
```

## 1.4 拖拽改状态

`PATCH /api/applications/{id}/status`

```json
{
  "status": "INTERVIEW"
}
```

响应：更新后的投递对象。

## 1.5 后端要点

- 所有查询必须带当前 `userId`
- `size` 最大 100
- 排序字段白名单
- 删除投递级联删除关联面试
- 拖拽只更新 `status`、`updatedAt`
- `status != WISHLIST` 且 `appliedAt` 为空时补当天

---

# 2. 面试日程

页面：`/interviews`

## 2.1 查询

`GET /api/interviews`

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `from` | Date | 起始日期 |
| `to` | Date | 结束日期 |
| `status` | String | `UPCOMING` / `COMPLETED` / `CANCELLED` |

响应：

```json
{
  "code": 1,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "1",
        "applicationId": "1",
        "company": "字节跳动",
        "position": "前端开发实习生",
        "round": "业务一面",
        "type": "VIDEO",
        "scheduledAt": "2026-11-24T14:00:00",
        "durationMinutes": 45,
        "location": "飞书视频会议",
        "link": "https://meeting.feishu.cn/",
        "interviewer": "王老师",
        "status": "UPCOMING",
        "notes": "准备项目难点",
        "createdAt": "2026-11-20T10:00:00",
        "updatedAt": "2026-11-20T10:00:00"
      }
    ],
    "total": 1
  }
}
```

## 2.2 新增

`POST /api/interviews`

```json
{
  "applicationId": "1",
  "company": "字节跳动",
  "position": "前端开发实习生",
  "round": "业务一面",
  "type": "VIDEO",
  "scheduledAt": "2026-11-24T14:00:00",
  "durationMinutes": 45,
  "location": "飞书视频会议",
  "link": "https://meeting.feishu.cn/",
  "interviewer": "王老师",
  "status": "UPCOMING",
  "notes": "准备项目难点"
}
```

## 2.3 编辑 / 状态 / 删除

```text
PUT    /api/interviews/{id}
PATCH  /api/interviews/{id}/status
DELETE /api/interviews/{id}
```

状态请求：

```json
{
  "status": "COMPLETED"
}
```

## 2.4 业务规则

- `scheduledAt` 必填
- 关联 `applicationId` 时自动带出公司、岗位
- 新增面试后把投递推进到 `INTERVIEW`
- 列表按 `scheduledAt` 升序

---

# 3. 简历库

页面：`/resumes`

## 3.1 列表

`GET /api/resumes`

```json
{
  "code": 1,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "1",
        "name": "前端开发 · 通用版",
        "targetRole": "前端开发实习生",
        "version": 1,
        "fileName": "林知遥_前端开发.pdf",
        "fileSize": 292864,
        "fileType": "application/pdf",
        "fileUrl": "http://localhost:8080/files/xxx.pdf",
        "isDefault": true,
        "createdAt": "2026-11-23T10:00:00",
        "updatedAt": "2026-11-23T10:00:00"
      }
    ],
    "total": 1
  }
}
```

## 3.2 上传

`POST /api/resumes`

`Content-Type: multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `file` | File | 是 | PDF / DOC / DOCX，≤ 10MB |
| `name` | String | 是 | 版本名称 |
| `targetRole` | String | 是 | 目标岗位 |

## 3.3 修改 / 默认 / 删除

```text
PUT    /api/resumes/{id}
PATCH  /api/resumes/{id}/default
DELETE /api/resumes/{id}
```

## 3.4 业务规则

- 第一份简历自动默认
- 默认简历唯一，设置时用事务
- 删除默认简历后自动选一份新的
- 删除简历时把投递的 `resumeId` 置空
- 文件用 UUID 命名

---

# 4. 工作台

页面：`/dashboard`

`GET /api/dashboard`

```json
{
  "code": 1,
  "message": "success",
  "data": {
    "metrics": {
      "total": { "value": 14, "delta": 3 },
      "active": { "value": 10, "delta": 2 },
      "interviews": { "value": 5, "delta": 1 },
      "offers": { "value": 2, "delta": 0 },
      "responseRate": { "value": 78.6, "delta": 4.2 },
      "weekly": { "applied": 3, "target": 8 }
    },
    "trend": [
      { "date": "2026-11-22", "label": "11/22", "applications": 1, "interviews": 0 }
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
    "tasks": []
  }
}
```

## 计算口径

```text
已投递 = status != WISHLIST
进行中 = APPLIED + SCREENING + INTERVIEW
待面试 = UPCOMING 且 scheduledAt >= now
回复率 = 有反馈 / 已投递
```

趋势按最近 14 天返回，缺少的日期在 Java 里补 0。

---

# 5. 数据分析

页面：`/analytics`

`GET /api/analytics?range=30d`

`range`：`30d` / `90d` / `365d`

```json
{
  "code": 1,
  "message": "success",
  "data": {
    "range": "30d",
    "summary": {
      "applications": { "value": 13, "delta": 12 },
      "responseRate": { "value": 76.9, "delta": -23.1 },
      "interviewRate": { "value": 46.2, "delta": -53.8 },
      "offerRate": { "value": 15.4, "delta": -9.6 },
      "avgResponseDays": { "value": 7.9, "delta": -19.1 }
    },
    "trend": [
      { "date": "2026-10-25", "label": "10/25", "applications": 0, "interviews": 0 }
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
}
```

---

# 6. 个人资料与密码

页面：`/settings`

## 6.1 更新资料

`PUT /api/auth/profile`

```json
{
  "name": "林知遥",
  "school": "华中科技大学",
  "major": "软件工程",
  "graduationYear": 2027,
  "targetRole": "前端开发实习生",
  "location": "武汉 / 上海",
  "bio": "正在寻找前端开发实习。",
  "weeklyGoal": 8
}
```

响应：更新后的 user。

## 6.2 修改密码

`PUT /api/auth/password`

```json
{
  "currentPassword": "123456",
  "newPassword": "newpass123"
}
```

成功：`204 No Content`  
当前密码错误：`400`

---

# 7. 下一阶段建议顺序

```text
1. GET /applications（先返回空分页）
2. GET /interviews（先返回空列表）
3. GET /dashboard（先返回空结构）
4. 投递新增 / 列表 / 编辑 / 删除
5. PATCH /applications/{id}/status
6. Dashboard 聚合
7. 面试 CRUD
8. 简历上传
9. Analytics
10. profile / password
```

先做 1–5，前端就能完成“登录 → 投递看板”的核心闭环。
