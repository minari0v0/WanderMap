# WanderMap Upstash Redis 아키텍처 및 활용 명세서

> **작성일**: 2026-11-11  
> **상태**: 아키텍처 수립 완료 (도메인별 순차 적용 예정)  
> **인프라**: Upstash Redis (`spring-boot-starter-data-redis` 연동 완료)

본 문서는 WanderMap의 백엔드와 프론트엔드 환경에서 Upstash Redis를 최적으로 활용하여 PostgreSQL(Neon) DB 부하를 경감하고, 분산 환경 및 자동 만료(TTL) 특성을 극대화하기 위한 핵심 4대 활용 영역과 키 설계 규격을 정의합니다.

---

## 📌 1. 개요 및 인프라 현황

- **연동 상태**: `backend/build.gradle`에 `spring-boot-starter-data-redis` 의존성이 추가되어 있으며, `backend/src/main/resources/application.yml`에 Upstash Redis 엔드포인트 및 인증 정보가 구성되어 있습니다.
- **도입 목적**:
  1. 무상태(Stateless) 백엔드 인스턴스 환경에서 휘발성 데이터(인증 코드, 재전송 쿨다운)의 안전하고 빠른 자동 소멸(TTL).
  2. 무료 티어 LLM 및 외부 API(Google Maps/Places)의 일일 쿼터 초과 방지 및 호출 제한(Rate Limiting).
  3. 실시간 여행 일정 협업 시 로그인 유저 및 비로그인 `GUEST` 동시 접속 상태(Presence) 집계.

---

## 🚀 2. Upstash Redis 핵심 4대 활용 영역

### ① AI 일정 추천 일일 사용량 제한 (Rate Limiting / Quota) — [최우선 추천]
- **배경**:
  - 상용 서버(Render / Vercel 배포 환경)에서는 무료 티어 Gemini LLM 크레딧 소진을 방지하기 위해 사용자당 하루 1~2회로 AI 호출을 제한해야 합니다.
  - 반면, 로컬 개발 환경(`SPRING_PROFILES_ACTIVE=local`)에서는 프롬프트 테스트 및 개발 편의를 위해 호출 제한을 두지 않아야 합니다.
- **키 설계**:
  - Key: `ai:quota:{userId}:{yyyy-MM-dd}`
  - TTL: `86400초 (24시간)` 또는 자정(KST 24:00)까지의 잔여 시간
- **동작 메커니즘**:
  1. 요청 진입 시 Redis `INCR` 실행 (반환값이 1이면 `EXPIRE 86400` 설정).
  2. 현재 값이 상용 환경 임계치(예: 2회)를 초과하면 AI API를 호출하지 않고 `429 Too Many Requests (일일 추천 한도 초과)` 즉시 반환.
  3. 네트워크 오류 등으로 3회 재시도(Retry)까지 모두 실패한 경우에는 `DECR`로 롤백하여 유저의 쿼터가 억울하게 차감되지 않도록 보장.
  4. 날짜가 바뀌면 키가 자동 소멸하므로 스케줄러 배치 작업이나 별도 DB 테이블 관리가 불필요합니다.

---

### ② 이메일 인증번호(OTP 6자리) 및 30초 재발송 쿨다운 (TTL)
- **배경**:
  - 현재 `AuthService`에서는 회원가입/비밀번호 변경용 6자리 인증번호와 30초 재발송 방지 쿨다운을 PostgreSQL의 `email_verifications` 테이블에 INSERT/UPDATE/SELECT로 관리하고 있습니다.
  - 인증코드는 5분만 유효한 극단적인 휘발성 데이터이므로 RDB 테이블에 불필요한 레코드가 누적됩니다.
- **키 설계**:
  - 인증코드 저장: `auth:otp:{email}` ➔ `value: "123456"`, `TTL: 300초 (5분)`
  - 재발송 쿨다운 플래그: `auth:otp:cooldown:{email}` ➔ `value: "1"`, `TTL: 30초`
- **동작 메커니즘**:
  1. 인증 요청 시 `auth:otp:cooldown:{email}` 키 존재 여부 확인 (`SETNX` 또는 `hasKey`).
     - 존재하면 `429 Too Many Requests (30초 후 재요청 가능)` 즉시 반환.
  2. 쿨다운 키 생성(TTL 30초) 및 메일 발송 후 `auth:otp:{email}`에 6자리 코드 저장(TTL 300초).
  3. 검증 시 Redis에서 일치 여부 확인 후 즉시 삭제(`DEL`).
  4. 5분이 지나면 Redis가 메모리에서 자동 소멸(Expire)시키므로 RDB 청소 배치 작업이 영구적으로 불필요해집니다.

---

### ③ 여행 방 실시간 접속자 표시 (로그인 멤버 + 비로그인 GUEST Presence)
- **배경**:
  - 일정 상세 페이지 우측 상단의 멤버 박스(`MembersBox`)에 현재 같은 여행 방을 열람하고 있는 동행자 및 비로그인 `GUEST`를 표시할 때, 무거운 소켓 세션 클러스터링 없이 가벼운 하트비트로 동시 접속자를 감지할 수 있습니다.
- **키 설계**:
  - Key: `trip:presence:{tripId}:{userOrGuestSessionId}`
  - Value: JSON `{"userId": 1, "nickname": "나아뛰", "isGuest": false, "lastActive": 1794320000}`
  - TTL: `45초` (프론트엔드에서 15~20초 주기로 핑/조회 시 자동 갱신)
- **동작 메커니즘**:
  1. 클라이언트가 여행 상세 화면에 머무는 동안 주기적으로 가벼운 핑 요청을 전송.
  2. Redis 키가 갱신되며, 브라우저 탭을 닫거나 이탈하면 45초 후 키가 자동 증발.
  3. `trip:presence:{tripId}:*` 패턴 조회 또는 Redis Set 자료구조를 활용해 현재 방에 있는 동행자 및 게스트 수를 실시간에 가깝게 산출.

---

### ④ Google Maps / Places 장소 검색 결과 & 초대 링크 조회 캐싱
- **배경**:
  - Google Places API는 호출 건당 비용이 발생하거나 무료 크레딧 한도가 존재합니다.
  - 인기 여행지(예: `"오사카 도톤보리"`, `"교토 청수사"`, `"이치란 라멘"`)는 여러 유저가 반복적으로 검색합니다.
- **키 설계**:
  - 장소 검색 캐시: `places:search:{hash(query)}` ➔ `TTL: 86400초 (24시간)`
  - 초대 코드 단축 조회 캐시: `trip:invite:{inviteCode}` ➔ `value: tripId`, `TTL: 3600초 (1시간)`
- **동작 메커니즘**:
  1. 검색어 유입 시 Redis 캐시를 먼저 조회(Cache-Aside).
  2. 캐시 미스(Miss) 시에만 Google Places API를 호출하고 응답 JSON을 Redis에 저장.
  3. Google API 무료 쿼터 소모를 80% 이상 절감하고 응답 속도를 수십 ms 단위로 단축.

---

## 🛠️ 3. Spring Data Redis 적용 가이드 예시

```java
@Service
@RequiredArgsConstructor
public class AiQuotaService {

    private final StringRedisTemplate redisTemplate;

    @Value("${spring.profiles.active:local}")
    private String activeProfile;

    private static final int PROD_DAILY_LIMIT = 2;

    public void checkAndConsumeQuota(Long userId) {
        if ("local".equalsIgnoreCase(activeProfile)) {
            return; // 로컬 개발 환경은 무제한
        }

        String today = LocalDate.now(ZoneId.of("Asia/Seoul")).toString();
        String key = "ai:quota:" + userId + ":" + today;

        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            redisTemplate.expire(key, Duration.ofDays(1));
        }

        if (count != null && count > PROD_DAILY_LIMIT) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "오늘의 AI 추천 이용 횟수(최대 2회)를 모두 소진하셨습니다.");
        }
    }

    public void rollbackQuota(Long userId) {
        if ("local".equalsIgnoreCase(activeProfile)) return;
        String today = LocalDate.now(ZoneId.of("Asia/Seoul")).toString();
        String key = "ai:quota:" + userId + ":" + today;
        redisTemplate.opsForValue().decrement(key);
    }
}
```
