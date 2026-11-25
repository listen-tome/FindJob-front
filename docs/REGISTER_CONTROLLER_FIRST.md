# 注册功能：Controller → Service → Mapper 开发指南

> 当前只完成一个功能：**用户注册**。  
> 代码顺序按你的要求：**先 Controller，再 Service，最后 Mapper / 数据库**。  
> 接口格式使用 `{ code, msg, data }`。

---

## 一、当前要完成的功能

```text
功能：用户注册
接口：POST /api/auth/register
目标：校验参数 → 邮箱查重 → BCrypt 加密 → 写入 users 表 → 返回用户信息
```

这一阶段**先不返回 token**，也先不做登录/JWT。  
原因：注册是独立闭环，先把“请求进来、业务处理、数据库落库”跑通；下一阶段再加登录和 JWT，避免一次学太多。

最终 curl 能返回 `HTTP 201`，数据库能看到 BCrypt 密码，这一阶段就算完成。

---

## 二、接口文档

### 基础信息

| 项目 | 说明 |
| --- | --- |
| 接口名称 | 用户注册 |
| 请求方式 | `POST` |
| 接口路径 | `/api/auth/register` |
| 接口描述 | 创建用户，校验邮箱唯一，密码 BCrypt 加密后入库 |
| 是否需要登录 | 否 |

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | String | 是 | 姓名，1–50 个字符 |
| `email` | String | 是 | 邮箱，唯一，格式合法 |
| `password` | String | 是 | 密码，6–64 位 |

请求示例：

```json
{
  "name": "林知遥",
  "email": "lin@example.com",
  "password": "123456"
}
```

### 响应参数

| 参数名 | 类型 | 说明 |
| --- | --- | --- |
| `code` | Integer | `1` 成功 |
| `msg` | String | `success` |
| `data.id` | String | 用户 ID |
| `data.name` | String | 姓名 |
| `data.email` | String | 邮箱 |
| `data.school` | String | 学校，注册时为空 |
| `data.major` | String | 专业，注册时为空 |
| `data.graduationYear` | Integer | 毕业年份，默认 2027 |
| `data.targetRole` | String | 目标岗位，注册时为空 |
| `data.location` | String | 期望城市，注册时为空 |
| `data.bio` | String | 简介，注册时为空 |
| `data.weeklyGoal` | Integer | 周目标，默认 8 |

成功响应：HTTP `201`

```json
{
  "code": 1,
  "msg": "success",
  "data": {
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

失败示例：

邮箱重复：HTTP `409`

```json
{
  "code": 0,
  "msg": "邮箱已注册",
  "data": null
}
```

参数错误：HTTP `400`

```json
{
  "code": 0,
  "msg": "参数校验失败",
  "data": null
}
```

---

## 三、开发顺序总览

严格按这个顺序写：

```text
第 1 步：Controller
第 2 步：Service
第 3 步：Mapper + 数据库建表
第 4 步：启动测试
```

但 Java 有编译依赖，Controller 需要 `AuthService`，Service 需要 `UserMapper`。  
所以我们会先创建一些**空壳类**让代码能编译，但真正的实现仍然按 Controller → Service → Mapper 的顺序完成。

| 阶段 | 主要工作 | 创建的类 | 数据库 |
| --- | --- | --- | --- |
| 1 | 写 HTTP 入口 | `RegisterRequest`、`UserResponse`、`Result`、`AuthService` 空壳、`AuthController` | 不建表 |
| 2 | 写注册业务 | `AuthService` 实现、`User` 实体、`UserMapper` 空接口、`SecurityConfig`、`BusinessException` | 不建表 |
| 3 | 写 Mapper / 落库 | `UserMapper` 完成、建 `users` 表、`GlobalExceptionHandler` | 执行 DDL |
| 4 | 测试 | 无新类 | 验证数据 |

---

# 第 1 步：写 Controller

## 1.1 先创建两个 DTO

Controller 需要知道“请求长什么样”和“响应长什么样”。

`dto/RegisterRequest.java`

```java
package com.sky.findjob.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(

        @NotBlank(message = "请输入姓名")
        @Size(max = 50, message = "姓名最多 50 个字符")
        String name,

        @NotBlank(message = "请输入邮箱")
        @Email(message = "邮箱格式不正确")
        String email,

        @NotBlank(message = "请输入密码")
        @Size(min = 6, max = 64, message = "密码至少 6 位")
        String password
) {
}
```

`dto/UserResponse.java`

```java
package com.sky.findjob.dto;

import com.sky.findjob.entity.User;

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

> 这里暂时引用了 `User` 实体，下一步会创建它；先放着，最后一起编译。

## 1.2 确认 Result

你现在的 `Result` 用的是 `message`，但接口文档用 `msg`。  
建议统一改成 `msg`，否则前端虽然兼容，但文档和代码会一直对不上。

`common/Result.java`

```java
package com.sky.findjob.common;

import lombok.Data;

@Data
public class Result<T> {

    private int code;
    private String msg;
    private T data;

    public static <T> Result<T> success() {
        Result<T> result = new Result<>();
        result.code = 1;
        result.msg = "success";
        return result;
    }

    public static <T> Result<T> success(T data) {
        Result<T> result = success();
        result.data = data;
        return result;
    }

    public static <T> Result<T> fail(String msg) {
        Result<T> result = new Result<>();
        result.code = 0;
        result.msg = msg;
        return result;
    }
}
```

如果你坚持用 `message`，把文档里的 `msg` 全部替换成 `message` 即可，前端两种都识别。

## 1.3 创建 AuthService 空壳

Controller 需要调用 Service。现在先放一个空壳，保证 Controller 能编译：

`service/AuthService.java`

```java
package com.sky.findjob.service;

import com.sky.findjob.dto.RegisterRequest;
import com.sky.findjob.dto.UserResponse;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    public UserResponse register(RegisterRequest request) {
        throw new UnsupportedOperationException("register 还未实现");
    }
}
```

## 1.4 写 Controller

`controller/AuthController.java`

```java
package com.sky.findjob.controller;

import com.sky.findjob.common.Result;
import com.sky.findjob.dto.RegisterRequest;
import com.sky.findjob.dto.UserResponse;
import com.sky.findjob.service.AuthService;
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
    public ResponseEntity<Result<UserResponse>> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        UserResponse user = authService.register(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(Result.success(user));
    }
}
```

### 这一步的检查

- [ ] `RegisterRequest` 创建完成
- [ ] `UserResponse` 创建完成
- [ ] `Result` 创建完成
- [ ] `AuthService` 空壳创建完成
- [ ] `AuthController` 创建完成

现在项目可能还编译不过，因为 `User` 实体还没建。  
**先不要急着启动**，继续第 2 步。

---

# 第 2 步：写 Service

## 2.1 创建 User 实体

`entity/User.java`

```java
package com.sky.findjob.entity;

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

## 2.2 创建 UserMapper 空接口

Service 需要 `UserMapper` 才能编译。现在只建接口，不写任何 SQL：

`mapper/UserMapper.java`

```java
package com.sky.findjob.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.sky.findjob.entity.User;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper extends BaseMapper<User> {
}
```

> 真正的 Mapper/数据库工作在第 3 步；现在有接口就能编译 Service。

## 2.3 创建 BusinessException

`common/BusinessException.java`

```java
package com.sky.findjob.common;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class BusinessException extends RuntimeException {

    private final HttpStatus status;

    public BusinessException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }
}
```

## 2.4 配置 PasswordEncoder

Service 需要密码加密工具。先建一个临时 Security 配置：

`config/SecurityConfig.java`

```java
package com.sky.findjob.config;

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

## 2.5 完成 AuthService

把之前的空壳替换成：

`service/AuthService.java`

```java
package com.sky.findjob.service;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.sky.findjob.common.BusinessException;
import com.sky.findjob.dto.RegisterRequest;
import com.sky.findjob.dto.UserResponse;
import com.sky.findjob.entity.User;
import com.sky.findjob.mapper.UserMapper;
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
                Wrappers.<User>lambdaQuery()
                        .eq(User::getEmail, email)
        );

        if (count != null && count > 0) {
            throw new BusinessException("邮箱已注册", HttpStatus.CONFLICT);
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

### 这一步的检查

- [ ] `User` 实体创建完成
- [ ] `UserMapper` 空接口创建完成
- [ ] `BusinessException` 创建完成
- [ ] `SecurityConfig` 创建完成
- [ ] `AuthService.register` 完成
- [ ] 项目能编译通过（先不运行数据库操作）

---

# 第 3 步：Mapper + 数据库建表

## 3.1 什么时候建表

**现在建。**  
Controller 和 Service 代码已经写完，接下来要真正执行 `selectCount` 和 `insert`，数据库表必须先存在。

建表不影响你“Controller → Service → Mapper”的代码顺序：前两步只是写代码，第三步才真正跑 SQL。

## 3.2 建表语句

```sql
CREATE DATABASE IF NOT EXISTS offerpilot
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE offerpilot;

CREATE TABLE IF NOT EXISTS users (
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

执行：

```bash
mysql -u root -p < users.sql
```

确认：

```sql
USE offerpilot;
DESC users;
```

## 3.3 配置数据库连接

`application.yml`

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:mysql://localhost:3306/offerpilot?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: root
    password: 你的密码
    driver-class-name: com.mysql.cj.jdbc.Driver
  jackson:
    time-zone: Asia/Shanghai

mybatis-plus:
  configuration:
    map-underscore-to-camel-case: true
```

`map-underscore-to-camel-case: true` 让：

```text
password_hash -> passwordHash
graduation_year -> graduationYear
```

## 3.4 Mapper 完成

`UserMapper` 现在已经是完整的：

```java
@Mapper
public interface UserMapper extends BaseMapper<User> {
}
```

你不需要写：

```java
@Select("SELECT * FROM users WHERE email = #{email}")
```

MyBatis-Plus 的 `BaseMapper` 已经提供了：

```text
selectCount
insert
selectById
updateById
deleteById
```

## 3.5 全局异常处理

`common/GlobalExceptionHandler.java`

```java
package com.sky.findjob.common;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Result<Void>> handleValidation(
            MethodArgumentNotValidException ex
    ) {
        return ResponseEntity
                .badRequest()
                .body(Result.fail("参数校验失败"));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<Result<Void>> handleBusiness(
            BusinessException ex
    ) {
        return ResponseEntity
                .status(ex.getStatus())
                .body(Result.fail(ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Result<Void>> handleUnexpected(Exception ex) {
        ex.printStackTrace();
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Result.fail("服务暂时不可用"));
    }
}
```

---

# 第 4 步：启动测试

```bash
mvn spring-boot:run
```

## 4.1 正常注册

```bash
curl -i -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "林知遥",
    "email": "lin@example.com",
    "password": "123456"
  }'
```

期望：

```http
HTTP/1.1 201 Created
```

```json
{
  "code": 1,
  "msg": "success",
  "data": {
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

## 4.2 查数据库

```bash
mysql -u root -p -e "
USE offerpilot;
SELECT id, name, email, LEFT(password_hash, 7) AS hash_prefix
FROM users;
"
```

应看到：

```text
id  name    email             hash_prefix
1   林知遥   lin@example.com   $2a$10$
```

## 4.3 重复邮箱

```bash
curl -i -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"林知遥","email":"lin@example.com","password":"123456"}'
```

期望：`HTTP 409`

```json
{"code":0,"msg":"邮箱已注册","data":null}
```

## 4.4 参数错误

```bash
curl -i -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"测试","email":"abc","password":"123"}'
```

期望：`HTTP 400`

```json
{"code":0,"msg":"参数校验失败","data":null}
```

---

## 四、完成标准

- [ ] Controller 只调用 Service，没有直接操作数据库
- [ ] Service 负责查重、加密、插库
- [ ] Mapper 只继承 `BaseMapper`，没有业务代码
- [ ] `users` 表已创建
- [ ] 注册返回 `HTTP 201`
- [ ] 数据库密码是 `$2a$...`
- [ ] 重复邮箱返回 `HTTP 409`
- [ ] 参数错误返回 `HTTP 400`
- [ ] 返回 JSON 不包含 `passwordHash`

---

## 五、下一步

注册接口完成后，下一步是：

```text
登录接口
→ JWT 生成
→ JWT 过滤器
→ GET /api/auth/me
→ 前端登录页联调
```

不要现在同时做投递、面试、Dashboard。  
注册这条链路跑通，说明你已经掌握了 Controller → Service → Mapper 的基本协作方式。
