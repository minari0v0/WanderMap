# WanderMap 향후 구현 로드맵 및 계획서

본 문서는 WanderMap 프로젝트 기획서(`WanderMap_문서.html`)를 기반으로 현재 진행 상황을 점검하고, 앞으로 구현해야 할 기능들의 상세 설계와 구체적인 개발 계획을 기술합니다.

---

## 📊 1. 현재 진행 상황 및 완료된 작업
* **인프라**: Docker Compose를 통한 로컬 PostgreSQL 16 & Redis 7.2 환경 구축 완료.
* **백엔드**: 
  - 기본 도메인 엔티티(`User`, `Trip`, `TripMember`) 구현 완료.
  - 여행 방 생성 및 초대코드 합류 API 개발 및 CORS/Security 허용 완료 (`SecurityConfig`).
  - 로컬 구동용 `schema.sql` 및 데모용 데이터(ID: 999) 적재 완료.
* **프론트엔드**:
  - Next.js 16 + Tailwind v4 + Axios 기반 API 연동 완료.
  - 토스식 랜딩 페이지, 로그인 데모 페이지, 대시보드(방 생성/참여) UI 및 연동 완료.
  - 비회원용 읽기 전용 관람 뷰어 페이지 구현 완료.
* **실행 유틸리티**: `Makefile`을 통해 백/프론트/인프라 원클릭 기동 체계 완료.

---

## 🛠️ 2. 향후 단계별 구현 기능 명세 (Phase 2 ~ 4)

### 📌 [Phase 2] 개인별 선호도 설문 제출 및 저장 (차기 구현 대상)
각 멤버가 독립적으로 여행 취향(선호 카테고리, 기피 키워드 등)을 기재하여 저장하는 단계입니다.
* **백엔드 작업 범위**:
  - `Preference` 엔티티 설계: PostgreSQL의 `JSONB` 매핑을 지원하는 `food_categories`, `activity_types` 필드 구성.
  - `PreferenceRepository`, `PreferenceService` 생성.
  - API 엔드포인트 구현:
    - `POST /api/trips/{id}/preferences` : 내 선호도 제출/수정 (1인 1회 제한)
    - `GET /api/trips/{id}/preferences` : 현재 방의 선호도 제출 현황 조회
* **프론트엔드 작업 범위**:
  - 설문 조사 페이지 구현 (`/trips/[tripId]/preferences` 경로).
  - UI 컴포넌트: 카테고리(라멘, 스시 등) 및 활동 유형(쇼핑, 인스타 스팟 등) 다중 선택 태그 칩.
  - 자유 메모 및 기피 키워드 입력 필드 추가.
  - 제출 완료 후 대시보드 또는 대기방으로의 리다이렉트 흐름 구현.

---

### 📌 [Phase 3] WebSocket 기반 실시간 그룹 투표 시스템
멤버들이 추천된 장소 후보에 대해 투표를 진행하고 실시간으로 의견을 조율하는 핵심 기능입니다.
* **백엔드 작업 범위**:
  - `WebSocketConfig` 및 STOMP 메시지 브로커 설정 (`/ws` 엔드포인트).
  - `PlaceVote` 엔티티, `PlaceVoteRepository` 구현.
  - WebSocket Controller 구현:
    - `/app/trip/{tripId}/vote` 구독 경로를 통해 실시간 투표 처리.
    - 투표 찬반 수치 집계 및 과반수(2/3) 찬성 여부 검증.
    - 과반수 도달 시 `itinerary_places`의 status를 `CONFIRMED`로 변경 후 `/topic/trip/{tripId}/votes` 및 `/topic/trip/{tripId}/itinerary`로 실시간 상태 브로드캐스트.
* **프론트엔드 작업 범위**:
  - `useWebSocket.ts` 커스텀 훅 및 STOMP.js 연동.
  - Zustand `wsStore` (연결/재연결 상태 관리) 및 `voteStore` (실시간 찬반 수치 동기화) 구현.
  - 일정 패널(`itinerary-panel.tsx`) 내의 투표 버튼과 투표율 진행바 UI 실시간 소켓 연동.

---

### 📌 [Phase 4] AI 기반 동선 자동 생성 (Gemini + Naver Maps)
제출된 취향 데이터를 AI가 정제하고, 네이버 API 실데이터를 조회하여 최적의 경로를 정렬/시각화하는 최종 단계입니다.
* **백엔드 작업 범위**:
  - **Gemini Client 연동**: 취향 JSONB 데이터를 프롬프트 템플릿과 결합해 전송, 분석된 취향 카테고리와 행정동 결과를 JSON 구조로 수신.
  - **Naver API 연동**:
    - `NaverLocalClient`: Gemini가 정제한 카테고리 및 행정동 기반 장소 실데이터 검색 및 좌표 획득.
    - `NaverDirectionsClient`: 탐색된 장소 간의 실제 이동 시간 및 거리 매트릭스 획득.
  - **이동 동선 알고리즘**: Greedy TSP(외판원 순회) 알고리즘을 사용해 최적 이동 경로로 순서(`visit_order`) 정렬 후 `itinerary_places`에 일괄 적재.
* **프론트엔드 작업 범위**:
  - **Naver Maps JS SDK 연동**: 동적으로 지도를 로드하고 초기 카메라 뷰포트를 여행지 중심으로 고정.
  - **마커 및 폴리라인 시각화**: `PlaceMarkers`(장소 핀 렌더링 및 클릭 이벤트)와 `RoutePolyline`(이동 경로 실선 드로잉) 구현.
  - 투표 확정 상태 변경에 따른 지도 마커의 색상/넘버링 상태 동적 업데이트.

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
