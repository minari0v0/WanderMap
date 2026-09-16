-- 회원
CREATE TABLE IF NOT EXISTS users (
    id             BIGSERIAL PRIMARY KEY,
    email          VARCHAR(255) UNIQUE NOT NULL,
    password       VARCHAR(255),               -- 이메일 회원 비밀번호 (소셜 전용은 NULL 허용)
    nickname       VARCHAR(50)  NOT NULL,
    profile_image  VARCHAR(500),
    bio            VARCHAR(255) DEFAULT '나만의 특별한 무드를 담은 취향 저장소를 만들고 있습니다.',
    email_verified BOOLEAN      DEFAULT FALSE NOT NULL,
    provider       VARCHAR(20),                -- 최초 가입 제공자 (LOCAL | KAKAO | NAVER | GOOGLE)
    oauth_id       VARCHAR(255),
    created_at     TIMESTAMP    DEFAULT NOW()
);

-- 소셜 계정 연동 (1:N 매핑)
CREATE TABLE IF NOT EXISTS user_social_accounts (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT REFERENCES users(id) ON DELETE CASCADE,
    provider       VARCHAR(20) NOT NULL,       -- KAKAO | NAVER | GOOGLE
    oauth_id       VARCHAR(255) NOT NULL,
    linked_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE (provider, oauth_id)
);

-- 이메일 인증 기록 (5분 만료 / 30초 쿨다운 / 최대 5회)
CREATE TABLE IF NOT EXISTS email_verifications (
    id                  BIGSERIAL PRIMARY KEY,
    email               VARCHAR(255) UNIQUE NOT NULL,
    code                VARCHAR(6)   NOT NULL,
    resend_count        INT          DEFAULT 0 NOT NULL,
    expires_at          TIMESTAMP    NOT NULL,
    resend_available_at TIMESTAMP    NOT NULL,
    created_at          TIMESTAMP    DEFAULT NOW()
);

-- 여행 방
CREATE TABLE IF NOT EXISTS trips (
    id           BIGSERIAL PRIMARY KEY,
    invite_code  VARCHAR(36)  UNIQUE NOT NULL,   -- UUID
    title        VARCHAR(100) NOT NULL,
    destination  VARCHAR(50)  NOT NULL,
    start_date   DATE         NOT NULL,
    end_date     DATE         NOT NULL,
    status       VARCHAR(20)  DEFAULT 'PLANNING',
    created_by   BIGINT       REFERENCES users(id),
    created_at   TIMESTAMP    DEFAULT NOW()
);

-- 여행 멤버
CREATE TABLE IF NOT EXISTS trip_members (
    id        BIGSERIAL PRIMARY KEY,
    trip_id   BIGINT REFERENCES trips(id) ON DELETE CASCADE,
    user_id   BIGINT REFERENCES users(id),
    role      VARCHAR(10) DEFAULT 'MEMBER',
    joined_at TIMESTAMP   DEFAULT NOW(),
    UNIQUE (trip_id, user_id)
);

-- 개인별 선호도
CREATE TABLE IF NOT EXISTS preferences (
    id                BIGSERIAL PRIMARY KEY,
    trip_id           BIGINT REFERENCES trips(id) ON DELETE CASCADE,
    user_id           BIGINT REFERENCES users(id),
    food_categories   JSONB,
    activity_types    JSONB,
    excluded_keywords VARCHAR(200),
    free_memo         TEXT,
    submitted_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE (trip_id, user_id)
);

-- Naver API 장소 캐시
CREATE TABLE IF NOT EXISTS places (
    id             BIGSERIAL PRIMARY KEY,
    naver_place_id VARCHAR(100) UNIQUE,
    name           VARCHAR(200) NOT NULL,
    category       VARCHAR(100),
    address        VARCHAR(300),
    latitude       DECIMAL(10,7),
    longitude      DECIMAL(10,7),
    cached_at      TIMESTAMP DEFAULT NOW()
);

-- 일자별 일정
CREATE TABLE IF NOT EXISTS itinerary_days (
    id         BIGSERIAL PRIMARY KEY,
    trip_id    BIGINT REFERENCES trips(id) ON DELETE CASCADE,
    day_number INT  NOT NULL,
    date       DATE NOT NULL,
    UNIQUE (trip_id, day_number)
);

-- 일정 내 장소
CREATE TABLE IF NOT EXISTS itinerary_places (
    id                       BIGSERIAL PRIMARY KEY,
    day_id                   BIGINT REFERENCES itinerary_days(id) ON DELETE CASCADE,
    place_id                 BIGINT REFERENCES places(id),
    visit_order              INT  NOT NULL,
    expected_visit_time      TIME,
    duration_minutes         INT  DEFAULT 60,
    travel_minutes_from_prev INT  DEFAULT 0,
    status                   VARCHAR(20) DEFAULT 'VOTING',
    created_at               TIMESTAMP DEFAULT NOW()
);

-- 장소 투표
CREATE TABLE IF NOT EXISTS place_votes (
    id                 BIGSERIAL PRIMARY KEY,
    itinerary_place_id BIGINT REFERENCES itinerary_places(id) ON DELETE CASCADE,
    user_id            BIGINT REFERENCES users(id),
    vote_type          VARCHAR(10) NOT NULL,   -- UP | DOWN
    voted_at           TIMESTAMP DEFAULT NOW(),
    UNIQUE (itinerary_place_id, user_id)
);

-- 인덱스 전략
CREATE INDEX IF NOT EXISTS idx_users_email                    ON users(email);
CREATE INDEX IF NOT EXISTS idx_social_user_id                 ON user_social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_trip_id           ON trip_members(trip_id);
CREATE INDEX IF NOT EXISTS idx_preferences_trip_id            ON preferences(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_days_trip_id         ON itinerary_days(trip_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_places_day_id        ON itinerary_places(day_id);
CREATE INDEX IF NOT EXISTS idx_place_votes_itinerary_place_id ON place_votes(itinerary_place_id);
CREATE INDEX IF NOT EXISTS idx_trips_invite_code              ON trips(invite_code);

-- -----------------------------------------------------
-- 초기 데모용 데이터 적재 (초기 로딩 시 에러 방지)
-- -----------------------------------------------------
INSERT INTO users (id, email, password, nickname, profile_image, bio, email_verified, provider, oauth_id, created_at)
VALUES (1, 'test@wandermap.io', '$2a$10$Ew.YQ7q5y6cIqVlE.o4B9eM6rWp.XyY0C.t7G.zR8qN6x.N5aK5tO', '미때줌', 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?w=200&q=80', '나만의 특별한 무드를 담은 취향 저장소를 만들고 있습니다.', TRUE, 'NAVER', 'mock-oauth-id', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO trips (id, invite_code, title, destination, start_date, end_date, status, created_by, created_at)
VALUES (999, 'demo-invite-code-1', 'Jeju East Coast Tour 🌴', 'Jeju', '2026-08-15', '2026-08-18', 'PLANNING', 1, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO trip_members (id, trip_id, user_id, role, joined_at)
VALUES (999, 999, 1, 'OWNER', NOW())
ON CONFLICT (id) DO NOTHING;
