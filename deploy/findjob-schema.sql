-- =============================================================================
-- FindJob（findjob 库）完整建表脚本
-- 与后端实体类一一对应：User / Application / Interview / Resume
-- 适用：宝塔 → 数据库 → 导入，或用 phpMyAdmin / Navicat 执行
--
-- 说明：后端 src/main/resources/schema.sql 只建了 interviews 和 resumes 两张表，
-- users 和 applications 需要手工建。服务器上是全新库时，登录/注册会因为没有
-- users 表而直接抛 SQL 异常 → 前端看到 {"code":0,"message":"服务端异常"}。
-- 本脚本可重复执行（全部 IF NOT EXISTS）。
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `findjob`
    DEFAULT CHARACTER SET utf8mb4
    COLLATE utf8mb4_general_ci;

USE `findjob`;

-- ---------------------------------------------------------------------------
-- 用户表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id`              bigint       NOT NULL AUTO_INCREMENT,
    `name`            varchar(50)  NOT NULL,
    `email`           varchar(120) NOT NULL,
    `password_hash`   varchar(255) NOT NULL,
    `school`          varchar(80)  NOT NULL DEFAULT '',
    `major`           varchar(80)  NOT NULL DEFAULT '',
    `graduation_year` smallint     NOT NULL DEFAULT 2027,
    `target_role`     varchar(80)  NOT NULL DEFAULT '',
    `location`        varchar(80)  NOT NULL DEFAULT '',
    `bio`             varchar(300) NOT NULL DEFAULT '',
    `weekly_goal`     tinyint      NOT NULL DEFAULT 8,
    `created_at`      datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------------
-- 简历表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `resumes` (
    `id`          bigint       NOT NULL AUTO_INCREMENT,
    `user_id`     bigint       NOT NULL,
    `name`        varchar(100) NOT NULL,
    `target_role` varchar(100) NOT NULL,
    `version`     int          NOT NULL DEFAULT 1,
    `file_name`   varchar(255) NOT NULL,
    `file_size`   bigint       NOT NULL DEFAULT 0,
    `file_type`   varchar(100) NOT NULL DEFAULT '',
    `file_path`   varchar(500) NOT NULL,
    `is_default`  tinyint(1)   NOT NULL DEFAULT 0,
    `created_at`  datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_resume_user_updated` (`user_id`, `updated_at` DESC),
    KEY `idx_resume_user_role` (`user_id`, `target_role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------------
-- 投递记录表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `applications` (
    `id`             bigint        NOT NULL AUTO_INCREMENT,
    `user_id`        bigint        NOT NULL,
    `resume_id`      bigint        DEFAULT NULL,
    `company`        varchar(40)   NOT NULL,
    `position`       varchar(60)   NOT NULL,
    `location`       varchar(80)   NOT NULL DEFAULT '',
    `salary`         varchar(40)   NOT NULL DEFAULT '',
    `channel`        varchar(20)   NOT NULL DEFAULT 'OTHER',
    `status`         varchar(20)   NOT NULL DEFAULT 'WISHLIST',
    `priority`       varchar(10)   NOT NULL DEFAULT 'MEDIUM',
    `applied_at`     date          DEFAULT NULL,
    `next_action_at` date          DEFAULT NULL,
    `tags`           json          DEFAULT NULL,
    `notes`          varchar(1000) NOT NULL DEFAULT '',
    `created_at`     datetime      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`     datetime      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_applications_user_status` (`user_id`, `status`),
    KEY `idx_applications_user_updated` (`user_id`, `updated_at`),
    KEY `idx_applications_user_applied` (`user_id`, `applied_at`),
    KEY `idx_applications_next_action` (`user_id`, `next_action_at`),
    KEY `idx_applications_resume` (`resume_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------------
-- 面试表
-- 注意：字段名是 `round`（对应实体 Interview.round），不是 round_name
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `interviews` (
    `id`               bigint        NOT NULL AUTO_INCREMENT,
    `user_id`          bigint        NOT NULL,
    `application_id`   bigint        DEFAULT NULL,
    `company`          varchar(40)   NOT NULL,
    `position`         varchar(60)   NOT NULL DEFAULT '',
    `round`            varchar(50)   NOT NULL,
    `type`             varchar(20)   NOT NULL,
    `scheduled_at`     datetime      NOT NULL,
    `duration_minutes` int           NOT NULL DEFAULT 45,
    `location`         varchar(100)  NOT NULL DEFAULT '',
    `link`             varchar(500)  NOT NULL DEFAULT '',
    `interviewer`      varchar(100)  NOT NULL DEFAULT '',
    `status`           varchar(20)   NOT NULL,
    `notes`            text,
    `created_at`       datetime      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       datetime      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_interview_user_time` (`user_id`, `scheduled_at`),
    KEY `idx_interview_user_status` (`user_id`, `status`),
    KEY `idx_interview_application` (`application_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------------
-- 自检：四张表都应是 1
-- ---------------------------------------------------------------------------
SELECT 'users' AS t, COUNT(*) AS ok FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'users'
UNION ALL SELECT 'applications', COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'applications'
UNION ALL SELECT 'interviews',   COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'interviews'
UNION ALL SELECT 'resumes',      COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'resumes';
