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
유저가 생성한 여행 일정 공유 링크(`/trips/[inviteCode]`)를 전달받았을 때의 URI 구조, 비로그인 게스트 열람·상호작용 경험 및 메신저 썸네일 사양입니다.
* **URI 구조 분리 (`/` vs `/trips/[inviteCode]`)**:
  - **내 워크스페이스 (`/`)**: 로그인한 유저가 좌측 사이드바와 함께 본인 여정들을 전환하며 작업하는 메인 쉘.
  - **공유 링크 (`/trips/[inviteCode]`)**: 카카오톡 등으로 공유하는 고유 링크(UUID `inviteCode` 기반).
* **비로그인 게스트 뷰 (좌측 사이드바 숨김 & 지연 로그인)**:
  - `WorkspaceAppShell`에서 비로그인 상태로 `/trips/[inviteCode]`에 진입했을 때는 **좌측 개인 사이드바를 렌더링하지 않고**, 상단 얇은 게스트 바(`WanderMap` 로고 + `로그인하고 함께 편집하기` 버튼)와 메인 일정·다이어리·지도 영역만 풀폭으로 노출.
  - 장소 추가, 투표(좋아요), 댓글 등 쓰기 액션 클릭 시 토스트/모달로 안내 후 `/login?redirect=/trips/[inviteCode]`로 이동하며, 로그인 완료 즉시 보던 일정 페이지로 복귀.
* **카카오톡 등 메신저 공유 미리보기 (`next/og` 동적 썸네일)**:
  - Next.js의 `generateMetadata` + `opengraph-image.tsx`(`ImageResponse`)를 활용하여 카카오톡 등에 링크 첨부 시 해당 여행의 제목을 조회해 동적 카드 이미지 생성.
  - 상단 원더맵 로고 + 정중앙 **여행 일정 제목**(길어질 경우 `...` 말줄임 처리) + 여행지/날짜가 박힌 미리보기 카드를 실시간 렌더링.

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
