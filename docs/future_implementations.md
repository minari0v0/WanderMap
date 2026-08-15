# WanderMap 향후 구현 로드맵 및 계획서

> **최근 수정일**: 2026-08-15  
> **버전**: v1.2 (Phase 2 완료 및 인증/OAuth 아키텍처 로드맵 반영)

본 문서는 WanderMap 프로젝트 기획서(`WanderMap_문서.html`)를 기반으로 현재 진행 상황을 점검하고, 앞으로 구현해야 할 기능들의 상세 설계와 구체적인 개발 계획을 기술합니다.

---

## 📊 1. 현재 진행 상황 및 완료된 작업
* **인프라**: Docker Compose를 통한 로컬 PostgreSQL 16 & Redis 7.2 환경 구축 완료.
* **백엔드**: 
  - 기본 도메인 엔티티(`User`, `Trip`, `TripMember`, `Preference`) 구현 완료.
  - 여행 방 생성/참여 및 선호도 설문 등록/조회 REST API 개발 완료.
  - PostgreSQL `JSONB` 매핑 및 Spring Security CORS 허용 완료.
* **프론트엔드**:
  - Next.js 16 + Tailwind v4 + Axios 기반 API 연동 완료.
  - SUIT 글로벌 폰트 및 Jade Sky 21st.dev 그라디언트 배경 적용.
  - 토스식 랜딩 페이지, 9개국 여행 사진 슬라이드 스플릿 로그인(약관 모달 포함), 대시보드 UI 완료.
  - **개인별 선호도 설문 페이지(`/trips/[tripId]/preferences`)** 개발 및 연동 완료.
  - 비회원용 읽기 전용 관람 뷰어 페이지 구현 완료.
* **실행 유틸리티**: `Makefile`을 통해 백/프론트/인프라 원클릭 기동 체계 완료.

---

## 🛠️ 2. 향후 단계별 구현 기능 명세

### 📌 [Next 1: 인증 시스템 구축 (이메일 ➜ 계정 연동 ➜ OAuth 3사)]
상세 설계는 [oauth_and_auth_architecture.md](file:///c:/Users/Silok/Downloads/myProject/WanderMap/docs/oauth_and_auth_architecture.md) 참조.
1. **이메일 회원가입/로그인 & JWT 발급**: BCrypt 암호화, Access/Refresh Token 인증 체계.
2. **계정 통합(Account Linking) DB 분리**: `user_social_accounts` 1:N 매핑을 통해 동일 이메일 자동 병합 지원.
3. **카카오/네이버/구글 OAuth 2.0 공식 연동**: Spring OAuth2 Client 및 GitHub Actions Secrets 기반 보안 파이프라인.

---

### 📌 [Next 2: WebSocket 기반 실시간 그룹 투표 시스템]
멤버들이 추천된 장소 후보에 대해 투표를 진행하고 실시간으로 의견을 조율하는 핵심 기능입니다.
* **백엔드**: `WebSocketConfig` (STOMP `/ws`), `PlaceVote` 엔티티/Repository, 과반수(2/3) 찬성 시 `itinerary_places`의 status를 `CONFIRMED`로 변경 후 실시간 브로드캐스트.
* **프론트엔드**: `useWebSocket.ts` 훅, STOMP.js 연동, `itinerary-panel.tsx` 실시간 찬반 소켓 동기화.

---

### 📌 [Next 3: AI 기반 동선 자동 생성 (Gemini + Naver Maps)]
* **백엔드**: Gemini 취향 정제, Naver Local API 장소 탐색, Naver Directions API 이동시간 계산 및 Greedy TSP 최적 동선 정렬.
* **프론트엔드**: Naver Maps SDK 연동, 마커 핀 렌더링, 이동 경로 폴리라인(Polyline) 시각화.

---

## 📅 3. 개발 추진 계획 (Next Steps)
우선순위가 가장 높고 도메인 핵심 뼈대를 완성해 주는 **[Phase 2] 개인별 선호도 설문** 단계를 먼저 진행할 예정입니다.

1. **Phase 2 개발 진행 (예정)**
   - 브랜치 생성: `feat/preference`
   - 백엔드 preference 테이블 데이터 모델 설계 및 API 연동
   - 프론트엔드 설문 작성 페이지 UI 컴포넌트 추가 및 Axios 연동
2. **단위 및 통합 검증**
   - API 통신 테스트 및 DB JSONB 컬럼 정상 매핑 확인
   - `main` 브랜치 병합 진행
