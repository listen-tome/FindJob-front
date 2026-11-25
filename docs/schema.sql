-- OfferPilot 数据库结构（MySQL 8.0+）
-- 字符集统一 utf8mb4，时间统一使用东八区业务时间。
-- 该脚本与前端 docs/API.md 中的字段一一对应，可按需调整 ORM 命名策略。

CREATE DATABASE IF NOT EXISTS offerpilot
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE offerpilot;

-- ---------------------------------------------------------------------------
-- 用户
-- ---------------------------------------------------------------------------
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
  UNIQUE KEY uk_users_email (email),
  CONSTRAINT chk_users_weekly_goal CHECK (weekly_goal BETWEEN 1 AND 30)
) ENGINE = InnoDB COMMENT = '用户';

-- ---------------------------------------------------------------------------
-- 简历
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resumes (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(80)     NOT NULL,
  target_role VARCHAR(80)     NOT NULL,
  version     INT UNSIGNED    NOT NULL DEFAULT 1,
  file_name   VARCHAR(255)    NOT NULL,
  file_size   BIGINT UNSIGNED NOT NULL DEFAULT 0,
  file_type   VARCHAR(80)     NOT NULL DEFAULT 'application/pdf',
  file_url    VARCHAR(500)    NOT NULL DEFAULT '',
  is_default  TINYINT(1)      NOT NULL DEFAULT 0,
  created_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at  DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_resumes_user (user_id),
  KEY idx_resumes_user_default (user_id, is_default),
  CONSTRAINT fk_resumes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE = InnoDB COMMENT = '简历版本';

-- ---------------------------------------------------------------------------
-- 投递记录
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        BIGINT UNSIGNED NOT NULL,
  resume_id      BIGINT UNSIGNED NULL,
  company        VARCHAR(40)     NOT NULL,
  position       VARCHAR(60)     NOT NULL,
  location       VARCHAR(80)     NOT NULL DEFAULT '',
  salary         VARCHAR(40)     NOT NULL DEFAULT '',
  channel        VARCHAR(20)     NOT NULL DEFAULT 'OTHER',
  status         VARCHAR(20)     NOT NULL DEFAULT 'WISHLIST',
  priority       VARCHAR(10)     NOT NULL DEFAULT 'MEDIUM',
  applied_at     DATE            NULL,
  next_action_at DATE            NULL,
  tags           JSON            NULL,
  notes          VARCHAR(1000)   NOT NULL DEFAULT '',
  created_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at     DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_applications_user_status (user_id, status),
  KEY idx_applications_user_updated (user_id, updated_at),
  KEY idx_applications_user_applied (user_id, applied_at),
  KEY idx_applications_next_action (user_id, next_action_at),
  KEY idx_applications_resume (resume_id),
  CONSTRAINT fk_applications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_applications_resume FOREIGN KEY (resume_id) REFERENCES resumes (id) ON DELETE SET NULL,
  CONSTRAINT chk_applications_status CHECK (
    status IN ('WISHLIST', 'APPLIED', 'SCREENING', 'INTERVIEW', 'OFFER', 'REJECTED')
  ),
  CONSTRAINT chk_applications_channel CHECK (
    channel IN ('BOSS', 'REFERRAL', 'OFFICIAL', 'LINKEDIN', 'CAMPUS', 'OTHER')
  ),
  CONSTRAINT chk_applications_priority CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW'))
) ENGINE = InnoDB COMMENT = '投递记录';

-- ---------------------------------------------------------------------------
-- 面试日程
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interviews (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          BIGINT UNSIGNED NOT NULL,
  application_id   BIGINT UNSIGNED NULL,
  company          VARCHAR(40)     NOT NULL,
  position         VARCHAR(60)     NOT NULL DEFAULT '',
  round_name       VARCHAR(40)     NOT NULL,
  type             VARCHAR(10)     NOT NULL DEFAULT 'VIDEO',
  scheduled_at     DATETIME        NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 45,
  location         VARCHAR(120)    NOT NULL DEFAULT '',
  link             VARCHAR(500)    NOT NULL DEFAULT '',
  interviewer      VARCHAR(60)     NOT NULL DEFAULT '',
  status           VARCHAR(20)     NOT NULL DEFAULT 'UPCOMING',
  notes            VARCHAR(1000)   NOT NULL DEFAULT '',
  created_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_interviews_user_time (user_id, scheduled_at),
  KEY idx_interviews_application (application_id),
  CONSTRAINT fk_interviews_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_interviews_application FOREIGN KEY (application_id) REFERENCES applications (id) ON DELETE CASCADE,
  CONSTRAINT chk_interviews_type CHECK (type IN ('PHONE', 'VIDEO', 'ONSITE')),
  CONSTRAINT chk_interviews_status CHECK (status IN ('UPCOMING', 'COMPLETED', 'CANCELLED')),
  CONSTRAINT chk_interviews_duration CHECK (duration_minutes BETWEEN 15 AND 240)
) ENGINE = InnoDB COMMENT = '面试日程';

-- ---------------------------------------------------------------------------
-- 可选：为周目标/分析查询增加生成列或汇总表
-- 数据量不大时直接实时聚合即可；数据量大时再引入每日统计表。
-- ---------------------------------------------------------------------------
