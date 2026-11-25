# 注册接口手把手实现步骤

> 目标：从零做出 `POST /api/auth/register`，把用户写入 MySQL，密码用 BCrypt 加密，并返回正确的状态码和错误格式。  
> 完成这一篇后再写登录、JWT 和投递管理。  
> 接口契约见 [API_AUTH.md](API_AUTH.md)。

---

## 0. 最终要达成的效果

请求：

```bash
curl -i -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "林知遥",
    "email": "lin@example.com",
    "password": "123456"
  }'
```

成功响应：

```http
HTTP/1.1 201 Created
Content-Type: application/json
```

```json
{
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
```

数据库里应出现：

```text
id  name    email             password_hash
1   林知遥   lin@example.com   $2a$10$...
```

密码不能是明文。

---

## 1. 创建数据库

在项目目录执行：

```bash
mysql -u root -p < docs/schema.sql
```

进入 MySQL 确认：

```bash
mysql -u root -p
```

```sql
USE offerpilot;
SHOW TABLES;
DESCRIBE users;
```

至少要有 `users` 表。完整项目最终需要 4 张表，但注册接口只依赖 `users`。

如果暂时不想执行完整脚本，最小建表语句是：

```sql
CREATE DATABASE IF NOT EXISTS offerpilot
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE offerpilot;

CREATE TABLE users (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name            VARCHAR(50)     NOT NULL,
  email           VARCHAR(120)    NOT NULL,
  password_hash   VARCHAR(255)    NOT NULL,
  school          VARCHAR(80)     NOT NULL DEFAULT '',
  major           VARCHAR(80)     NOT NULL DEFAULT '',
  graduation_year SMALLINT        NOT NULL DEFAULT 2027,
  target_role     VARCHAR(80)     NOT NULL DEFAULT '',
  location        VARCHAR(80)     NOT NULL DEFAULT '',
  bio             VARCHAR(300)    NOT NULL DEFAULT '',
  weekly_goal     TINYINT UNSIGNED NOT NULL DEFAULT 8,
  created_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_email (email)
) ENGINE = InnoDB;
```

---

## 2. 创建 Spring Boot 工程

打开 [start.spring.io](https://start.spring.io/)：

```text
Project: Maven
Language: Java
Spring Boot: 3.3.x（3.4/3.5 也可以）
Group: com.offerpilot
Artifact: offerpilot-api
Packaging: Jar
Java: 17 或 21
```

依赖勾选：

- Spring Web
- Spring Security
- Validation
- MySQL Driver
- Lombok

生成、解压，用 IDEA 打开。

### 2.1 补充 MyBatis-Plus 依赖

在 `pom.xml` 的 `<dependencies>` 里加：

```xml
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
    <version>3.5.9</version>
</dependency>
```

如果启动时报 MyBatis-Plus 与 Spring Boot 版本不兼容：

- 优先把 MyBatis-Plus 升到当前最新的 3.5.x
- 或者把 Spring Boot 降到 3.3.x

### 2.2 确认这些依赖存在

```xml
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
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>

<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>
```

---

## 3. 配置 application.yml

`src/main/resources/application.yml`：

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/offerpilot?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: root
    password: 你的数据库密码
    driver-class-name: com.mysql.cj.jdbc.Driver
  jackson:
    time-zone: Asia/Shanghai

mybatis-plus:
  configuration:
    map-underscore-to-camel-case: true
    # 调试 SQL 时可以打开，上线前删掉
    # log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
```

先启动一次：

```bash
mvn spring-boot:run
```

看到 `Started OfferPilotApplication` 即成功。此时访问接口可能返回 401，因为 Spring Security 默认拦截，下一步处理。

---

## 4. 建包结构

在 `src/main/java/com/offerpilot` 下创建：

```text
com.offerpilot
├── OfferPilotApplication.java        # 启动类，Initializr 已生成
├── common
│   ├── ApiError.java
│   ├── BusinessException.java
│   └── GlobalExceptionHandler.java
├── config
│   └── SecurityConfig.java
├── user
│   ├── User.java
│   ├── UserMapper.java
│   └── dto
│       └── UserResponse.java
└── auth
    ├── AuthController.java
    ├── AuthService.java
    └── dto
        └── RegisterRequest.java
```

---

## 5. 写 User 实体

`user/User.java`

```java
package com.offerpilot.user;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

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

注意：

- 表名是 `users`，不是 `user`（`user` 在部分数据库里是关键字）
- `passwordHash` 会自动映射到 `password_hash`
- `createdAt` / `updatedAt` 可以先交给数据库默认值，插入时不用赋值

---

## 6. 写 UserMapper

`user/UserMapper.java`

```java
package com.offerpilot.user;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<User> {
}
```

`@Mapper` 不能漏，否则启动时可能报 `Invalid bound statement`。

---

## 7. 配置 Security 与 BCrypt

`config/SecurityConfig.java`

```java
package com.offerpilot.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                // 注册阶段先全部放行，登录/JWT 写完后再改
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

        return http.build();
    }
}
```

这一步只是为了让注册接口不被 Spring Security 拦住。写登录和 JWT 时，会把 `anyRequest().permitAll()` 改成：

```java
.requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
.anyRequest().authenticated()
```

---

## 8. 统一错误体

`common/ApiError.java`

```java
package com.offerpilot.common;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        String code,
        String message,
        Map<String, String> fieldErrors,
        Instant timestamp
) {
    public ApiError(String code, String message) {
        this(code, message, null, Instant.now());
    }
}
```

`common/BusinessException.java`

```java
package com.offerpilot.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class BusinessException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    public BusinessException(String code, String message, HttpStatus status) {
        super(message);
        this.code = code;
        this.status = status;
    }
}
```

`common/GlobalExceptionHandler.java`

```java
package com.offerpilot.common;

import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(
            MethodArgumentNotValidException ex
    ) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        ex.getBindingResult().getFieldErrors().forEach(error ->
                fieldErrors.putIfAbsent(
                        error.getField(),
                        error.getDefaultMessage()
                )
        );

        ApiError body = new ApiError(
                "VALIDATION_ERROR",
                "参数校验失败",
                fieldErrors,
                Instant.now()
        );

        return ResponseEntity.badRequest().body(body);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(
            ConstraintViolationException ex
    ) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();

        ex.getConstraintViolations().forEach(violation -> {
            String path = violation.getPropertyPath().toString();
            String field = path.contains(".")
                    ? path.substring(path.lastIndexOf('.') + 1)
                    : path;
            fieldErrors.putIfAbsent(field, violation.getMessage());
        });

        return ResponseEntity.badRequest().body(
                new ApiError(
                        "VALIDATION_ERROR",
                        "参数校验失败",
                        fieldErrors,
                        Instant.now()
                )
        );
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadable(
            HttpMessageNotReadableException ex
    ) {
        return ResponseEntity.badRequest().body(
                new ApiError("INVALID_REQUEST_BODY", "请求体格式不正确")
        );
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiError> handleBusiness(
            BusinessException ex
    ) {
        return ResponseEntity
                .status(ex.getStatus())
                .body(new ApiError(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiError(
                        "INTERNAL_ERROR",
                        "服务暂时不可用，请稍后重试"
                ));
    }
}
```

---

## 9. 写注册请求 DTO

`auth/dto/RegisterRequest.java`

```java
package com.offerpilot.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(

        @NotBlank(message = "请输入姓名")
        @Size(max = 50, message = "姓名最多 50 个字符")
        String name,

        @NotBlank(message = "请输入邮箱")
        @Email(message = "邮箱格式不正确")
        @Size(max = 120, message = "邮箱最多 120 个字符")
        String email,

        @NotBlank(message = "请输入密码")
        @Size(min = 6, max = 64, message = "密码至少 6 位")
        String password
) {
}
```

必须使用：

```java
jakarta.validation.constraints.*
```

不是 `javax.validation.constraints.*`。

---

## 10. 写用户响应 DTO

`user/dto/UserResponse.java`

```java
package com.offerpilot.user.dto;

import com.offerpilot.user.User;

public record UserResponse(
        String id,
        String name,
        String email,
        String school,
        String major,
        Integer graduationYear,
        String targetRole,
        String location,
        String bio,
        Integer weeklyGoal
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                String.valueOf(user.getId()),
                user.getName(),
                user.getEmail(),
                user.getSchool(),
                user.getMajor(),
                user.getGraduationYear(),
                user.getTargetRole(),
                user.getLocation(),
                user.getBio(),
                user.getWeeklyGoal()
        );
    }
}
```

这里**没有** `passwordHash`，避免密码泄露。

---

## 11. 写注册 Service

`auth/AuthService.java`

```java
package com.offerpilot.auth;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.offerpilot.auth.dto.RegisterRequest;
import com.offerpilot.common.BusinessException;
import com.offerpilot.user.User;
import com.offerpilot.user.UserMapper;
import com.offerpilot.user.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);

        Long count = userMapper.selectCount(
                Wrappers.<User>lambdaQuery().eq(User::getEmail, email)
        );

        if (count != null && count > 0) {
            throw new BusinessException(
                    "EMAIL_ALREADY_EXISTS",
                    "邮箱已注册",
                    HttpStatus.CONFLICT
            );
        }

        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setSchool("");
        user.setMajor("");
        user.setGraduationYear(2027);
        user.setTargetRole("");
        user.setLocation("");
        user.setBio("");
        user.setWeeklyGoal(8);

        userMapper.insert(user);

        return UserResponse.from(user);
    }
}
```

关键点：

- 邮箱统一转小写，避免 `A@x.com` 和 `a@x.com` 注册两次
- 密码一定用 `passwordEncoder.encode(...)`，不要存明文
- `@Transactional` 保证插入过程一致
- 返回前转成 `UserResponse`

---

## 12. 写 Controller

`auth/AuthController.java`

```java
package com.offerpilot.auth;

import com.offerpilot.auth.dto.RegisterRequest;
import com.offerpilot.user.dto.UserResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        UserResponse user = authService.register(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(user);
    }
}
```

`@Valid` 不能漏，否则 DTO 上的校验注解不会生效。

---

## 13. 启动并测试

### 13.1 启动

```bash
mvn spring-boot:run
```

或者在 IDEA 里运行 `OfferPilotApplication`。

### 13.2 成功注册

```bash
curl -i -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "林知遥",
    "email": "lin@example.com",
    "password": "123456"
  }'
```

应该看到：

```http
HTTP/1.1 201 Created
```

```json
{
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
```

### 13.3 查数据库

```bash
mysql -u root -p -e "
USE offerpilot;
SELECT id, name, email,
       LEFT(password_hash, 7) AS hash_prefix,
       weekly_goal
FROM users;
"
```

应该看到：

```text
id  name    email             hash_prefix  weekly_goal
1   林知遥   lin@example.com   $2a$10$      8
```

看到 `$2a$10$` 或 `$2b$10$` 就说明 BCrypt 生效了。

---

## 14. 测试错误情况

### 14.1 邮箱格式错误

```bash
curl -i -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"测试","email":"abc","password":"123456"}'
```

期望：

```http
HTTP/1.1 400 Bad Request
```

```json
{
  "code": "VALIDATION_ERROR",
  "message": "参数校验失败",
  "fieldErrors": {
    "email": "邮箱格式不正确"
  },
  "timestamp": "..."
}
```

### 14.2 密码太短

```bash
curl -i -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"测试","email":"test@example.com","password":"123"}'
```

期望 `400 VALIDATION_ERROR`，`fieldErrors.password`。

### 14.3 重复邮箱

```bash
curl -i -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"林知遥","email":"lin@example.com","password":"123456"}'
```

期望：

```http
HTTP/1.1 409 Conflict
```

```json
{
  "code": "EMAIL_ALREADY_EXISTS",
  "message": "邮箱已注册"
}
```

### 14.4 请求体不是合法 JSON

```bash
curl -i -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":'
```

期望 `400 INVALID_REQUEST_BODY`。

---

## 15. 常见问题

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 500，提示 `Unknown column` | 实体字段与表字段不一致 | 确认 `passwordHash` 对应 `password_hash`，并开启驼峰映射 |
| 500，`Invalid bound statement` | Mapper 没被扫描 | 加 `@Mapper`，或在启动类加 `@MapperScan("com.offerpilot.**.mapper")` |
| 500，`Field 'school' doesn't have a default value` | 插入时没给 NOT NULL 字段赋值 | 给 school / major / bio 等设置 `""` |
| 接口返回 401 | Spring Security 默认拦截 | 当前阶段用 `anyRequest().permitAll()` |
| 接口返回 403 | CSRF 没关 | 配置 `.csrf(AbstractHttpConfigurer::disable)` |
| `@NotBlank` 不生效 | Controller 参数少 `@Valid` | 加 `@Valid @RequestBody` |
| `javax.validation` 报错 | 用了旧包 | 换成 `jakarta.validation.*` |
| 密码看起来是明文 | 直接 set 了原密码 | 必须 `passwordEncoder.encode(...)` |
| 邮箱大小写导致重复注册 | 没统一小写 | `trim().toLowerCase(Locale.ROOT)` |
| 返回 200 而不是 201 | 直接 return body | 用 `ResponseEntity.status(201)` |

---

## 16. 完成标准

- [ ] `HTTP 201` 注册成功
- [ ] users 表出现一条记录
- [ ] `password_hash` 是 `$2a$...` 开头
- [ ] 返回 JSON 不包含 `passwordHash`
- [ ] 重复邮箱返回 `409 EMAIL_ALREADY_EXISTS`
- [ ] 邮箱错误 / 密码太短返回 `400 VALIDATION_ERROR`
- [ ] 返回的 `Content-Type` 是 `application/json`
- [ ] 错误响应包含 `code` / `message` / `timestamp`

做完这些，**先停下来**，不要继续写投递。下一步是登录接口 + JWT，把 `POST /api/auth/login` 和 `GET /api/auth/me` 跑通，再去写投递管理。
