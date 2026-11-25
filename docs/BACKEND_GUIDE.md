# Spring Boot 后端落地指南

这份指南不是完整代码，而是把 OfferPilot 后端拆成可执行的步骤，配合 `docs/API.md` 使用。目标是让你在 3–5 天内跑通一条完整链路，而不是一开始就追求“企业级”。

---

## 1. 技术选型

推荐一套和你现有技能匹配、面试也好讲的组合：

| 层 | 选型 | 理由 |
| --- | --- | --- |
| Web | Spring Boot 3.3+ | 主流、资料多 |
| 安全 | Spring Security + JWT | 面试高频 |
| ORM | MyBatis-Plus | CRUD 快，SQL 可控 |
| 数据库 | MySQL 8 | 通用 |
| 参数校验 | Jakarta Validation | `@Valid` + `@NotBlank` |
| 文档 | springdoc-openapi | 可直接导入 `docs/openapi.yaml` 对照 |
| 文件 | 本地目录 / MinIO | 先本地，部署再换 OSS |

Maven 依赖：

```xml
<dependencies>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
  </dependency>
  <dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
  </dependency>
  <dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
    <version>3.5.9</version>
  </dependency>
  <dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
  </dependency>
  <dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
  </dependency>
  <dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
  </dependency>
  <dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
  </dependency>
  <dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
  </dependency>
</dependencies>
```

---

## 2. 配置文件

`src/main/resources/application.yml`：

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/offerpilot?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: root
    password: your_password
    driver-class-name: com.mysql.cj.jdbc.Driver
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 12MB
  jackson:
    time-zone: Asia/Shanghai
    date-format: yyyy-MM-dd HH:mm:ss

mybatis-plus:
  configuration:
    map-underscore-to-camel-case: true
  global-config:
    db-config:
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0

offerpilot:
  jwt:
    secret: "replace-with-at-least-32-bytes-secret-key"
    expiration-hours: 168
  upload:
    dir: "./uploads"
    public-prefix: "http://localhost:8080/files"
```

> 真实项目不要把密钥写进 Git，改成环境变量：`${JWT_SECRET}`。演示项目也建议在 README 中说明这一点。

---

## 3. 统一返回与异常

前端约定**成功直接返回数据**，所以不要用 `Result<T>` 包装成功响应。只需要统一错误：

```java
public record ApiError(
    String code,
    String message,
    Map<String, String> fieldErrors,
    Instant timestamp
) {}
```

`@RestControllerAdvice` 统一处理：

- `MethodArgumentNotValidException` → 400，收集字段错误
- `BadCredentialsException` → 401
- 自定义 `BusinessException` → 对应状态码
- 其他异常 → 500，日志记录完整堆栈，但响应不暴露 SQL / 堆栈

```java
@ExceptionHandler(MethodArgumentNotValidException.class)
@ResponseStatus(HttpStatus.BAD_REQUEST)
public ApiError handleValidation(MethodArgumentNotValidException ex) {
    Map<String, String> errors = new LinkedHashMap<>();
    ex.getBindingResult().getFieldErrors()
        .forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));
    return new ApiError("VALIDATION_ERROR", "参数校验失败", errors, Instant.now());
}
```

---

## 4. 用户与 JWT

### 4.1 表字段

`users` 表见 `docs/schema.sql`。密码只存 `BCryptPasswordEncoder` 的 hash。

### 4.2 登录流程

1. 按 email 查用户
2. `passwordEncoder.matches(raw, hash)`
3. 生成 JWT，`subject = userId`
4. 返回 `{ token, user }`（不要返回 `password_hash`）

### 4.3 JWT 过滤器

```java
@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserMapper userMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Long userId = jwtService.parseUserId(header.substring(7));
                User user = userMapper.selectById(userId);
                if (user != null) {
                    var auth = new UsernamePasswordAuthenticationToken(
                        new LoginUser(userId), null, List.of());
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (JwtException ignored) {
                // 交给后续的 401 处理
            }
        }
        chain.doFilter(request, response);
    }
}
```

安全配置关键点：

```java
http
  .csrf(AbstractHttpConfigurer::disable)
  .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
  .authorizeHttpRequests(auth -> auth
      .requestMatchers("/api/auth/login", "/api/auth/register").permitAll()
      .requestMatchers("/files/**").permitAll()
      .anyRequest().authenticated())
  .exceptionHandling(e -> e.authenticationEntryPoint(jsonUnauthorizedEntryPoint()))
  .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
```

### 4.4 当前用户

统一从 `SecurityContext` 取：

```java
public Long currentUserId() {
    return ((LoginUser) SecurityContextHolder.getContext()
        .getAuthentication().getPrincipal()).id();
}
```

**所有业务查询都必须带 `user_id`**，不要直接 `selectById(id)` 后返回，否则换一个 ID 就能看到别人的数据。

---

## 5. 投递 CRUD

### 5.1 分页查询

```java
Page<Application> page = new Page<>(pageNo, size);
LambdaQueryWrapper<Application> q = Wrappers.lambdaQuery(Application.class)
    .eq(Application::getUserId, userId)
    .eq(status != null, Application::getStatus, status)
    .eq(channel != null, Application::getChannel, channel)
    .and(StringUtils.hasText(keyword), w -> w
        .like(Application::getCompany, keyword)
        .or().like(Application::getPosition, keyword)
        .or().like(Application::getLocation, keyword)
        .or().like(Application::getNotes, keyword));
```

标签搜索在 MySQL JSON 里可用 `JSON_SEARCH` / `JSON_CONTAINS`，但演示项目可以先在 Java 中过滤，或只对标签做 `CAST(tags AS CHAR) LIKE`。数据量小，优先保证逻辑正确。

排序白名单：

```java
switch (sort) {
  case "appliedAt,asc" -> q.orderByAsc(Application::getAppliedAt);
  case "company,asc"   -> q.orderByAsc(Application::getCompany);
  default              -> q.orderByDesc(Application::getUpdatedAt);
}
```

不要直接把前端字符串拼进 `ORDER BY`，使用枚举/白名单。

### 5.2 新增

- DTO 加 `@NotBlank`、`@Size`
- `userId` 从当前登录用户取
- `status != WISHLIST && appliedAt == null` 时补当天
- `resumeId` 校验归属
- `tags` 用 Jackson 转 JSON 存 `JSON` 列

### 5.3 状态更新

`PATCH /applications/{id}/status` 只更新 `status` 与 `updated_at`，并校验归属。

拖拽是高频操作，接口要轻，不要返回整个列表。

### 5.4 删除

```java
applicationMapper.delete(
    Wrappers.lambdaQuery(Application.class)
        .eq(Application::getId, id)
        .eq(Application::getUserId, userId)
);
```

数据库外键 `interviews.application_id ON DELETE CASCADE` 会处理面试记录。

---

## 6. Dashboard 聚合

这个接口建议单独写一个 `DashboardService`，不要在前端拼多个请求。

### 6.1 指标

```sql
-- 已投递（不含想投递）
SELECT COUNT(*) FROM applications
WHERE user_id = ? AND status <> 'WISHLIST';

-- 进行中
SELECT COUNT(*) FROM applications
WHERE user_id = ? AND status IN ('APPLIED', 'SCREENING', 'INTERVIEW');

-- Offer
SELECT COUNT(*) FROM applications
WHERE user_id = ? AND status = 'OFFER';

-- 有反馈
SELECT COUNT(*) FROM applications
WHERE user_id = ? AND status IN ('SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED');

-- 本周投递
SELECT COUNT(*) FROM applications
WHERE user_id = ? AND applied_at >= ? AND status <> 'WISHLIST';
```

响应率 = 有反馈 / 已投递 × 100，保留 1 位小数。

### 6.2 14 天趋势

推荐在 Java 里补零：

```java
Map<LocalDate, Long> counts = applicationMapper.countByAppliedDate(userId, startDate);
List<TrendPoint> trend = new ArrayList<>();
for (int i = 13; i >= 0; i--) {
    LocalDate date = LocalDate.now().minusDays(i);
    trend.add(new TrendPoint(
        date,
        date.format(DateTimeFormatter.ofPattern("M/d")),
        counts.getOrDefault(date, 0L),
        interviewCounts.getOrDefault(date, 0L)
    ));
}
```

SQL 只返回有数据的日期，缺失日期由 Java 补 0，避免前端画图出现断点。

### 6.3 待办

按 API 文档的规则生成 3–4 条即可，不一定要存表。示例：

```java
if (!upcomingInterviews.isEmpty()) {
    Interview next = upcomingInterviews.get(0);
    tasks.add(new Task("interview-" + next.getId(),
        "准备「" + next.getCompany() + "」" + next.getRound(),
        format(next.getScheduledAt()) + " · " + typeLabel(next.getType()),
        "INTERVIEW", next.getScheduledAt()));
}
```

---

## 7. Analytics 聚合

数据量小的阶段，建议**先把区间内的投递全部查出来，在 Java 里聚合**。这样比写 5 条复杂 SQL 更好维护，也更容易和 Dashboard 保持同一口径。

```java
List<Application> apps = applicationMapper.selectList(
    Wrappers.lambdaQuery(Application.class)
        .eq(Application::getUserId, userId)
        .ne(Application::getStatus, "WISHLIST")
        .ge(Application::getAppliedAt, start)
        .le(Application::getAppliedAt, end)
);
```

然后：

- `responseRate`：状态属于 SCREENING / INTERVIEW / OFFER / REJECTED
- `interviewRate`：INTERVIEW / OFFER
- `offerRate`：OFFER
- `avgResponseDays`：`ChronoUnit.DAYS.between(appliedAt, updatedAt)`，只统计有反馈记录
- `channels`：`groupingBy(Application::getChannel)`
- `weekdays`：按 `appliedAt.getDayOfWeek()` 分 7 组
- `trend`：30d 按天、90d 按 ISO 周、365d 按月

`delta` 与上一等长区间比较：

```java
LocalDate previousStart = start.minusDays(periodDays);
LocalDate previousEnd = start.minusDays(1);
```

小数点统一 `BigDecimal.setScale(1, RoundingMode.HALF_UP)`，避免前端出现 `33.333333`。

---

## 8. 文件上传

### 8.1 保存

```java
@PostMapping(value = "/resumes", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
public Resume upload(@RequestPart("file") MultipartFile file,
                     @RequestParam String name,
                     @RequestParam String targetRole) throws IOException {
    // 1. 校验扩展名、大小、真实 MIME
    // 2. 生成 UUID 文件名，按 userId 分目录
    // 3. Files.copy 到 uploadDir
    // 4. 写 resumes 表，第一份自动默认
}
```

### 8.2 访问

- 本地开发：把 `uploadDir` 映射为 `/files/**`
- 生产：Nginx / OSS / MinIO，直接返回公网 URL
- 不要用用户上传的原始文件名拼接路径，避免目录穿越
- 上传目录放在项目外，不要打进 jar

### 8.3 默认简历

同一个用户只允许一份默认简历，用事务：

```java
@Transactional
public Resume setDefault(Long userId, Long resumeId) {
    resumeMapper.clearDefault(userId);
    resumeMapper.markDefault(userId, resumeId);
    return resumeMapper.selectOwned(userId, resumeId);
}
```

---

## 9. 联调顺序与验收

按这个顺序做，能最快看到完整前端：

1. `POST /auth/register`、`POST /auth/login`、`GET /auth/me`
2. `GET /applications` + `POST /applications`
3. `PUT /applications/{id}` + `PATCH /applications/{id}/status`
4. `DELETE /applications/{id}`
5. `GET /interviews` + `POST /interviews`
6. `GET /resumes` + `POST /resumes`
7. `GET /dashboard`
8. `GET /analytics?range=30d`

每完成一步，就启动前端页面点一遍，用真实接口联调，不要等全部接口写完再联调。

### 验收清单

- [ ] 未登录访问 `/dashboard` 会跳转登录页
- [ ] 刷新页面后登录态保持
- [ ] A 用户无法通过改 ID 访问 B 用户数据
- [ ] 新增投递后看板、列表、Dashboard 数量同步
- [ ] 拖拽卡片后刷新页面状态仍正确
- [ ] 删除投递后关联面试不再出现
- [ ] 上传 PDF 后能拿到可访问的 `fileUrl`
- [ ] 默认简历同一时间只有一份
- [ ] 分页 `size > 100` 被限制
- [ ] 错误响应是 JSON，不是 Spring 默认 HTML
- [ ] CORS / 代理下前端无跨域报错

---

## 10. 面试时怎么讲这个后端

不要只说“写了 CRUD”。可以按这条线讲：

1. **领域建模**：投递是主实体，面试是子流程，简历是可复用资产；状态机把“想投递 → 已投递 → 筛选 → 面试 → Offer / 拒绝”串起来。
2. **数据隔离**：所有查询都带 `user_id`，JWT 里只放用户标识，不信任前端传入的用户 ID。
3. **写操作一致性**：删除投递级联删除面试；设置默认简历用事务；上传文件与数据库记录分开处理。
4. **聚合接口设计**：Dashboard 和 Analytics 由后端聚合，前端只负责展示；用“补零”保证趋势图连续。
5. **权衡**：当前数据量小，分析在 Java 内聚合；如果数据量增长，再引入日汇总表或 OLAP，而不是过早优化。
6. **可测试性**：Controller 只做参数校验和鉴权，Service 承担业务规则，Mapper 负责数据访问；用 MockMvc 覆盖 401、越权、参数错误。

这比“我用了 Spring Boot + MyBatis”更能体现工程判断。
