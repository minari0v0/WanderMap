# WanderMap 향후 구현 로드맵 및 계획서

> **최근 수정일**: 2026-11-09  
> **버전**: v1.3 (인증/프로필/설정 고도화 및 Google Maps · 여행 다이어리 스키마 반영)

본 문서는 WanderMap 프로젝트 기획서([product_vision_and_spec.md](/docs/product_vision_and_spec.md))를 기반으로 현재 진행 상황을 점검하고, 앞으로 구현해야 할 핵심 도메인들의 상세 설계와 개발 계획을 기술합니다.

---

## 📊 1. 현재 진행 상황 및 완료된 작업
* **인프라 & DB**: Docker Compose 로컬 환경(PostgreSQL 16 & Redis 7.2) 및 Neon Serverless PostgreSQL 스키마(`schema.sql`) 구축 완료.
* **백엔드**:
  - 회원 및 인증 도메인(`User`, `UserSocialAccount`, `EmailVerification`, `AuthService`) 구현 완료 (일반 이메일 회원가입/로그인, 6자리 이메일 인증, 프로필/비밀번호 변경, 소셜 계정 연동, 회원 탈퇴 및 연관 데이터 일괄 정리).
  - 여행 방(`Trip`, `TripMember`) 생성/초대코드 조회/참여 및 선호도 설문(`Preference`) 등록/조회 REST API 구현 완료.
  - PostgreSQL `JSONB` 매핑 및 환경변수 기반(`CORS_ALLOWED_ORIGINS`) Spring Security CORS 설정 완료.
* **프론트엔드**:
  - Next.js 16 + Tailwind v4 + Axios 기반 API 연동 완료.
  - SPA 영구 고정 사이드바(`WorkspaceAppShell`) + 플래너 홈(`/`) + 설정 및 내 여정 통합 워크스페이스(`/settings`) 구축 완료.
  - 이메일 회원가입/로그인 스플릿 뷰(`/login`), 이모지 아바타 & 사진 크롭 프로필 설정 모달, 개인별 선호도 설문 페이지(`/trips/[tripId]/preferences`), 여행 상세 뷰어(`/trips/[tripId]`) 구현 완료.

---

## 🛠️ 2. 향후 단계별 구현 기능 명세

### 📌 [Next 1: 일정 및 여행 다이어리 핵심 도메인 백엔드 구현 (`Itinerary` & `Place`)]
프론트엔드에 구현된 일정 타임라인 및 여행 다이어리 뷰를 실제 DB와 연동합니다.
* **백엔드**:
  - `Place`, `ItineraryDay`, `ItineraryPlace`, `PlaceVote` JPA 엔티티 및 Repository/Service/Controller 구현.
  - 일자별/장소별 마크다운 메모(`memo`), 별점(`rating`), 한줄평(`review`), 사진(`photos` JSONB) CRUD API 구현.
* **프론트엔드**: `trip-service.ts`에 일정/다이어리 API 연동 및 실시간 저장 연결.

---

### 📌 [Next 2: 공유 링크 게스트 뷰어 및 메신저 동적 OG 미리보기]
유저가 생성한 여행 일정 공유 링크(`/trips/[inviteCode]` 또는 `/share/[inviteCode]`)를 전달받았을 때의 열람·상호작용 경험 및 메신저 썸네일 사양입니다.
* **비로그인 열람 및 지연 인증(Lazy Auth) 플로우**:
  - 공유 링크 접속 시 비로그인 상태에서도 여행 일정과 다이어리 본문을 즉시 열람 가능.
  - 좋아요/투표, 댓글, 장소 추가 등 쓰기 액션 클릭 시 로그인 안내 후 `/login?redirect=/trips/[inviteCode]`로 이동하며, 로그인 완료 즉시 보던 공유 일정 페이지로 복귀.
* **게스트 전용 몰입형 레이아웃 (사이드바 숨김)**:
  - 공유 링크로 진입한 비로그인 게스트(또는 외부 공유 뷰어)에게는 좌측 개인 워크스페이스 사이드바(`WorkspaceAppShell`)를 노출하지 않고, 상단 심플 헤더(`WanderMap` 로고 + `로그인하여 일정에 참여하기` CTA)와 메인 일정/지도 영역만 풀폭으로 깔끔하게 노출.
* **카카오톡 등 메신저 공유 시 동적 OpenGraph(`og:image`) 미리보기**:
  - Next.js `generateMetadata` 및 `ImageResponse`(`next/og`)를 활용하여 공유 링크별로 동적 썸네일 카드 생성.
  - 좌상단 또는 상단에 WanderMap 브랜드 로고 배지, 정중앙에 **여행 일정 제목**(길어질 경우 말줄임표 `...` 처리)과 여행지·일정 기간이 감성적인 카드로 렌더링되도록 구현.

---

### 📌 [Next 3: WebSocket 기반 실시간 그룹 투표 시스템]
멤버들이 추천된 장소 후보에 대해 투표를 진행하고 실시간으로 의견을 조율하는 핵심 기능입니다.
* **백엔드**: `WebSocketConfig` (STOMP `/ws`), `PlaceVote` 집계 로직, 과반수(2/3) 찬성 시 `itinerary_places`의 status를 `CONFIRMED`로 변경 후 실시간 브로드캐스트.
* **프론트엔드**: `useWebSocket.ts` 훅, STOMP.js 연동, `itinerary-panel.tsx` 실시간 찬반 소켓 동기화.

---

### 📌 [Next 4: AI 기반 동선 자동 생성 및 Google Maps 연동 (Gemini + Google Maps Platform)]
상세 설계는 [main_service_and_ai_architecture.md](/docs/main_service_and_ai_architecture.md) 참조.
* **백엔드**: Gemini API 취향 정제, Google Places API 장소 탐색(`google_place_id` 캐싱), Google Routes API 이동시간 계산 및 최적 동선 정렬.
* **프론트엔드**: Google Maps JavaScript SDK 연동, 카테고리별 커스텀 마커 핀 렌더링, 이동 경로 폴리라인(Polyline) 시각화.

---

### 📌 [Next 5: OAuth 2.0 공식 연동 및 배포 파이프라인 구축]
상세 설계는 [oauth_and_auth_architecture.md](/docs/oauth_and_auth_architecture.md) 및 [deployment_and_cicd_guide.md](/docs/deployment_and_cicd_guide.md) 참조.
* **OAuth 3사 연동**: 카카오/네이버/구글 OAuth 2.0 공식 클라이언트 연동 및 JWT 발급 체계 고도화.
* **CI/CD 파이프라인**: Vercel(프론트엔드) + Render(백엔드 Docker) 배포 환경 구성 및 `.github/workflows` 자동화 워크플로우 생성.
