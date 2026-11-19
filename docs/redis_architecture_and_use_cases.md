# WanderMap Upstash Redis 아키텍처 및 활용 명세서

> **최종 갱신일**: 2026-11-19  
> **상태**: 핵심 도메인 적용 완료 (`Refresh Token`, `Presence`, `장소 찬반 투표`, `이메일 OTP`, `초대 코드 캐시`)  
> **인프라**: Upstash Redis (`spring-boot-starter-data-redis`, Rediss SSL, 장애 시 인메모리 폴백 지원)

본 문서는 WanderMap의 백엔드와 프론트엔드 환경에서 Upstash Redis를 활용하여 원거리 PostgreSQL(Neon) 왕복 지연을 줄이고, 분산 환경 및 자동 만료(TTL) 특성을 극대화하기 위한 Redis 키 설계 규격과 연동 확인 방법을 정의합니다.

---

## 📌 1. 개요 및 인프라 현황

- **연동 상태**:
  - `backend/build.gradle`: `spring-boot-starter-data-redis` 의존성 적용 완료
  - `backend/src/main/resources/application-local.yml`: Upstash Redis 엔드포인트 + SSL(`enabled: true`) 구성 완료
- **장애 대응 설계**:
  - 모든 Redis Store(`RefreshTokenStore`, `TripPresenceStore`, `PlaceVoteStore`, `EmailOtpStore`, `TripInviteCacheStore`)는 Upstash 연결이 일시적으로 불가할 때도 서비스가 중단되지 않도록 `ObjectProvider<StringRedisTemplate>` + 인메모리 `ConcurrentHashMap` 폴백을 내장합니다.
- **헬스체크 및 기동 검증**:
  - `RedisHealthController`: 서버 기동 시 `ApplicationRunner`가 `PING`을 전송해 `[Upstash Redis] Connected successfully (PING=PONG, latency=...ms)` 또는 폴백 경고 로그를 출력합니다.
  - 엔드포인트: `GET /api/health/redis` (인증 없이 조회 가능)

---

## 🚀 2. Redis 키 설계 및 적용 현황

### ✅ 적용 완료 (Active)

#### ① JWT Refresh Token 저장소 (`RefreshTokenStore`)
- **Key**: `auth:refresh:{userId}:{jti}`
- **Value**: `"1"`
- **TTL**: `jwt.refresh-token-expiration` (기본 7일)
- **역할**: 로그인/재발급 시 저장, 로그아웃/회원탈퇴 시 즉시 폐기(`DEL` / `SCAN` 정리)

#### ② 여행 방 실시간 접속자 (`TripPresenceStore`)
- **Key**: `trip:presence:{tripId}` (Redis Hash)
  - **Field**: `user:{userId}` 또는 `guest:{sessionId}`
  - **Value**: Pipe-delimited + Base64URL 문자열 (`{expiresAtEpochMs}|{guestFlag}|{userId}|{role}|{b64(nickname)}|{b64(profileImage)}`)
- **TTL**: Hash 전체 TTL `90초` (개별 뷰어 만료 45초, 프론트엔드 20초 주기 하트비트 + 이탈 시 `POST /api/trips/{tripId}/presence/leave` 호출)
- **역할**: 로그인 멤버와 비로그인 `손님(GUEST)` 동시 접속 현황을 실시간에 가깝게 집계하고, 로그아웃 상태의 호스트가 접속 중으로 오표시되지 않도록 분리합니다.

#### ③ 장소 찬반 투표 초고속 처리 + 비동기 DB 영속화 (`PlaceVoteStore` + `PlaceVoteAsyncPersister`)
- **배경**:
  - 기존에는 투표 클릭 1회당 Neon PostgreSQL(싱가포르 리전)과 약 10~15회의 순차 왕복 쿼리가 발생해 ~2초 지연이 있었습니다.
- **Key**:
  - 투표 해시: `trip:votes:{itineraryPlaceId}` (Hash)
    - Field `"_init"` -> `"1"` (캐시 초기화 마커, 미스와 0표를 구분)
    - Field `"{userId}"` -> `"UP"` 또는 `"DOWN"`
    - **TTL**: `7일` (`VOTES_TTL`)
  - 방 멤버 수 캐시: `trip:memberCount:{tripId}` (String 정수)
    - **TTL**: `10분` (`MEMBER_COUNT_TTL`)
- **동작 메커니즘**:
  1. `POST /api/trips/{tripId}/itinerary/places/{itineraryPlaceId}/vote`는 `@Transactional(propagation = Propagation.NOT_SUPPORTED)`로 불필요한 DB 커넥션 점유 없이 즉시 Upstash Redis Hash만 토글하고 경량 `PlaceVoteResponse`를 반환합니다.
  2. `PlaceVoteAsyncPersister`가 `@Async` + 장소 ID별 64-Stripe 락으로 최신 Redis 상태를 읽어 PostgreSQL `place_votes` 및 `itinerary_places.status`를 비동기 동기화합니다.
  3. 일정 조회(`getTripItinerary`) 시에는 `executePipelined`로 모든 장소의 투표를 Redis 1회 왕복에 일괄 로딩하며, 미스된 항목만 DB에서 읽어 파이프라인 워밍합니다.
  4. 프론트엔드(`wander-map.tsx`)는 클릭 즉시 0ms 낙관적 UI를 반영한 뒤 백엔드 응답으로 확정합니다.

#### ④ 이메일 인증번호(OTP 6자리) & 30초 재발송 쿨다운 (`EmailOtpStore`)
- **Key**:
  - 인증 코드: `auth:otp:{email}` ➔ `"123456"`, **TTL**: `300초 (5분)`
  - 재발송 쿨다운: `auth:otp:cooldown:{email}` ➔ `"1"`, **TTL**: `30초`
  - 재전송 횟수: `auth:otp:count:{email}` ➔ 카운트 정수, **TTL**: `300초`
- **역할**: RDB 테이블(`email_verifications`)에 휘발성 인증 코드를 매번 INSERT/UPDATE하지 않고 TTL 만료로 자동 정리합니다.

#### ⑤ 초대 코드 ➔ 여행 방 ID 단축 캐시 (`TripInviteCacheStore`)
- **Key**: `trip:invite:{inviteCode}` ➔ `"{tripId}"`
- **TTL**: `3600초 (1시간)`
- **역할**: 공유 링크 진입 및 `MembersBox` 초대 링크 확인 시 반복되는 `findByInviteCode` 조회 부하를 줄입니다.

---

### 📋 추후 적용 예정 (Planned)

#### ⑥ AI 일정 추천 일일 사용량 제한 (`ai:quota:{userId}:{yyyy-MM-dd}`)
- **TTL**: `86400초 (24시간)`
- 상용 서버에서 일일 AI 추천 호출 횟수를 제한(로컬 `local` 프로파일 무제한)하고, API 오류 시 `DECR` 롤백.

#### ⑦ Google Places 장소 검색 결과 캐싱 (`places:search:{hash(query)}`)
- **TTL**: `86400초 (24시간)`
- Google Places API 도입 시 인기 검색어 응답 캐싱으로 무료 쿼터 절감.

---

## 🔍 3. Upstash Console & API로 Redis 동작 확인 방법

### A. 백엔드 헬스체크 & 기동 로그 확인
1. **서버 기동 로그 확인**:
   ```text
   [Upstash Redis] Connected successfully (PING=PONG, latency=18ms)
   ```
   (만약 `Unavailable — running with in-memory fallback`이 출력되면 `application-local.yml` 또는 SSL/네트워크 설정을 점검하세요.)
2. **HTTP 헬스체크 API 호출**:
   - 브라우저 또는 터미널에서 `GET http://localhost:8080/api/health/redis` 호출:
   ```json
   {
     "status": "UP",
     "provider": "REDIS",
     "ping": "PONG",
     "latencyMs": 14
   }
   ```
   - `"provider": "REDIS"`와 `"status": "UP"`이면 Upstash Redis와 실제 통신 중입니다.

### B. Upstash Console (Data Browser / CLI)에서 직접 확인
Upstash 웹 콘솔 ➔ 해당 Redis DB ➔ **CLI** 또는 **Data Browser** 탭에서 아래 명령어로 실제 키 생성 및 TTL 만료를 확인할 수 있습니다.

1. **연결 테스트**:
   ```redis
   PING
   ```
2. **저장된 키 목록 확인** (데이터가 적은 개발 환경에서):
   ```redis
   KEYS *
   ```
   - `trip:presence:{tripId}` : 여행 방 접속 중 표시 확인
   - `trip:votes:{itineraryPlaceId}` : 찬반 투표 캐시 확인
   - `trip:memberCount:{tripId}` : 방 인원 수 캐시 확인
   - `trip:invite:{inviteCode}` : 초대 코드 캐시 확인
   - `auth:refresh:{userId}:{jti}` : 로그인 리프레시 토큰 확인
   - `auth:otp:{email}` : 이메일 인증 코드 확인
3. **특정 도메인 데이터 및 TTL 상세 조회**:
   ```redis
   -- 실시간 접속자 Hash 조회 및 남은 만료 시간(초)
   HGETALL trip:presence:1
   TTL trip:presence:1

   -- 특정 일정 장소 찬반 투표 Hash 조회
   HGETALL trip:votes:10
   TTL trip:votes:10

   -- 초대 코드 캐시 확인
   GET trip:invite:<inviteCode>

   -- 이메일 인증번호 & 재발송 쿨다운 확인
   GET auth:otp:<email>
   TTL auth:otp:cooldown:<email>
   ```
4. **페이지 이탈 / 투표 동작 실험**:
   - 여행 방 탭을 닫거나 나가면 `trip:presence:{tripId}` 내 해당 유저/게스트 필드가 즉시 삭제되며, 모든 뷰어가 사라지면 Hash가 비게 됩니다(잔여 Hash도 90초 TTL 후 소멸).
   - 찬반 투표 버튼 클릭 시 `HGETALL trip:votes:{placeId}`에 유저 ID와 `"UP"`/`"DOWN"`이 즉시 반영되며, 네트워크 탭에서 `POST .../vote` 응답 시간이 기존 수 초대에서 수십 ms 수준으로 줄어든 것을 확인할 수 있습니다.
