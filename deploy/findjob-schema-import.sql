-- =============================================================================
-- FindJob（findjob 库）建表脚本 · 精简版
--
-- 与 deploy/findjob-schema.sql 的区别：
--   1. 不含 CREATE DATABASE / USE，避免应用账号没有建库权限时报 #1044；
--   2. 结尾不含查询 information_schema 的自检，避免普通账号访问系统库被拒。
--
-- 使用前提（重要）：
--   在 phpMyAdmin 里必须先点左侧的 `findjob` 数据库，让它成为当前库；
--   再在顶部 SQL 标签粘贴执行。否则表会尝试建到 information_schema 里并报 #1044。
--
-- 全部语句可重复执行（IF NOT EXISTS），不会清数据。
-- =============================================================================

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
-- 面试表（字段名是 round，不是 round_name）
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
