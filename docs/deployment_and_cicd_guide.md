# 🚀 WanderMap 클라우드 이관 및 CI/CD 자동화 로드맵

본 문서는 WanderMap의 **로컬 인프라(Docker) ➔ 완전 무료 클라우드 환경으로의 이관**과 **GitHub Actions 기반의 PR 자동 검증(CI) 및 원클릭 버튼 배포(CD)** 파이프라인 구축 로드맵을 정리한 가이드입니다.

---

## 📌 1. 전체 목표 아키텍처 (100% 무료 티어)

```mermaid
graph TD
    subgraph "개발 및 협업 흐름"
        Dev[개발자 로컬] -->|Feature 브랜치 푸시| PR[GitHub Pull Request]
        PR -->|변경 감지| CI_FE[Frontend CI: TypeScript, Lint, Build]
        PR -->|변경 감지| CI_BE[Backend CI: Java 25, Gradle Test]
        CI_FE & CI_BE -->|검증 성공| Merge[main 브랜치 병합]
    end

    subgraph "배포 흐름 (One-Click CD)"
        Merge -->|버튼 딸깍 or 자동| CD[GitHub Actions / Deploy Hook]
        CD --> Vercel[Frontend: Vercel]
        CD --> Render[Backend: Render / Koyeb]
    end

    subgraph "데이터 인프라"
        Render --> Neon[(DB: Neon Serverless PostgreSQL)]
        Render -.-> Upstash[(Cache: Upstash Redis)]
    end
```

| 영역 | 서비스 | 스펙 및 특징 |
| :--- | :--- | :--- |
| **Database** | **[Neon.tech](https://neon.tech)** | Serverless PostgreSQL (0.5GB 무료, 자동 브랜칭, 무제한 쿼리) |
| **Frontend** | **[Vercel](https://vercel.com)** | Next.js 공식 최적화 엣지 호스팅, 글로벌 CDN, 무중단 배포 |
| **Backend** | **[Render](https://render.com)** 또는 **[Koyeb](https://koyeb.com)** | Spring Boot (Java 25 / Docker) 컨테이너 무료 호스팅 |
| **CI/CD** | **GitHub Actions** | PR 자동 테스트(CI) + `workflow_dispatch` 기반 원클릭 배포(CD) |

---

## 📌 2. Database ➔ Neon 이관 가이드

### Step 1. Neon 프로젝트 생성
1. [Neon.tech](https://neon.tech) 회원가입 (GitHub 계정 연동).
2. **Create Project**:
   - **Name**: `wandermap`
   - **Postgres Version**: `18` (또는 최신)
   - **Region**: `ap-southeast-1 (Singapore)` (한국 기준 가장 빠른 레이턴시)
3. 대시보드의 **Connection Details**에서 접속 문자열 복사:
   ```text
   postgresql://neondb_owner:npg_xxxxxx@ep-cool-fog-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```

> [!NOTE]
> **PostgreSQL 16 vs 18 버전 호환성 안내**
> 로컬 Docker 환경은 `PostgreSQL 16`이고 Neon은 `PostgreSQL 18`이지만, WanderMap의 DB 스키마(`BIGSERIAL`, `JSONB`, `TIMESTAMP`, `ON CONFLICT` 등)는 표준 PostgreSQL 스펙을 준수하므로 **16 ➔ 18 상위 버전으로 100% 완벽 호환**됩니다. Spring Boot의 PostgreSQL JDBC 드라이버 역시 Postgres 18을 원활하게 지원합니다.

### Step 2. 스키마 및 데이터 세팅 (2가지 옵션)

#### 옵션 A: `schema.sql`로 즉시 구축 (⭐ 가장 추천 & 10초 완료)
프로젝트에 준비된 `backend/src/main/resources/schema.sql` (10개 테이블 + 인덱스 + 초기 데이터)을 그대로 적용합니다:
1. Neon 대시보드 좌측 메뉴 ➜ **SQL Editor** 클릭.
2. `schema.sql` 전체 내용을 복사하여 붙여넣고 **Run** 실행.

#### 옵션 B: 기존 로컬 Docker DB 덤프 후 복원
로컬에서 직접 회원가입/테스트한 데이터를 그대로 보존하고 싶을 때:
```bash
# 1. 로컬 Docker 컨테이너에서 덤프 추출
docker exec -t wandermap-postgres pg_dump -U postgres -d wandermap > wandermap_dump.sql

# 2. Neon DB로 덤프 밀어넣기
psql "postgresql://[Neon계정]:[비밀번호]@[Neon호스트]/neondb?sslmode=require" < wandermap_dump.sql
```

### Step 3. 스프링부트 연결 (`application.yml`)
```yaml
spring:
  datasource:
    url: jdbc:postgresql://ep-cool-fog-xxxx.ap-southeast-1.aws.neon.tech:5432/neondb?sslmode=require
    username: neondb_owner
    password: ${NEON_DB_PASSWORD}
    driver-class-name: org.postgresql.Driver
```

---

## 📌 3. PR 자동 검증 CI 파이프라인 (GitHub Actions)

`main` 브랜치에 코드를 합치기 전, Frontend와 Backend가 각각 독립적으로 빌드와 테스트를 검증하여 오류가 있는 코드가 머지되는 것을 원천 차단합니다.

### A. Frontend CI (`.github/workflows/ci-frontend.yml`)
- **트리거**: `frontend/**` 경로의 파일이 변경된 PR 생성 시
- **검증 항목**:
  1. 의존성 설치 (`pnpm install`)
  2. TypeScript 타입 체크 (`npx tsc --noEmit`)
  3. Next.js 프로덕션 빌드 (`pnpm build`)

```yaml
name: Frontend CI

on:
  pull_request:
    paths:
      - 'frontend/**'
      - '.github/workflows/ci-frontend.yml'

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js & pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
          cache-dependency-path: frontend/pnpm-lock.yaml

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Type Check (TypeScript)
        run: npx tsc --noEmit

      - name: Production Build
        run: pnpm build
        env:
          NEXT_PUBLIC_API_URL: http://localhost:8080
```

### B. Backend CI (`.github/workflows/ci-backend.yml`)
- **트리거**: `backend/**` 경로의 파일이 변경된 PR 생성 시
- **검증 항목**:
  1. Java 25 환경 세팅
  2. Gradle Wrapper 권한 부여 및 캐싱
  3. 전체 자바 컴파일 및 단위 테스트 실행 (`./gradlew test`)

```yaml
name: Backend CI

on:
  pull_request:
    paths:
      - 'backend/**'
      - '.github/workflows/ci-backend.yml'

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Java 25
        uses: actions/setup-java@v4
        with:
          java-version: '25'
          distribution: 'temurin'
          cache: 'gradle'

      - name: Grant Execute Permission for Gradlew
        run: chmod +x gradlew

      - name: Compile and Test with Gradle
        run: ./gradlew test
```

### C. GitHub 브랜치 보호 규칙 (Branch Protection)
GitHub 저장소 ➜ **Settings** ➜ **Branches** ➜ **Add branch ruleset**:
- **Target Branch**: `main`
- **Require status checks to pass before merging**: 체크
  - 필수 체크 항목으로 `Frontend CI`와 `Backend CI`를 등록
- **효과**: 두 검증을 통과하지 못하면 머지 버튼이 비활성화됨.

---

## 📌 4. 원클릭 버튼 딸깍 배포 (CD 파이프라인)

GitHub Actions의 `workflow_dispatch` 기능을 활용하여, 언제든 GitHub 웹 콘솔에서 **[Run workflow] 버튼 클릭 한 번으로 최신 main 커밋 사항을 실시간 배포**합니다.

### A. 원클릭 통합 배포 워크플로우 (`.github/workflows/cd-deploy.yml`)

```yaml
name: 🚀 One-Click CD (Deploy to Production)

on:
  # 1. GitHub Actions 탭에서 버튼 딸깍 수동 트리거 지원
  workflow_dispatch:
    inputs:
      target:
        description: '배포할 대상을 선택하세요'
        required: true
        default: 'all'
        type: choice
        options:
          - all (FE + BE)
          - frontend-only
          - backend-only

  # 2. (선택사항) main 브랜치 머지 시 자동 배포 트리거
  push:
    branches:
      - main

jobs:
  deploy-frontend:
    name: 🌐 Deploy Frontend (Vercel)
    if: github.event.inputs.target == 'all' || github.event.inputs.target == 'frontend-only' || github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel Deploy Hook
        run: |
          curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK_URL }}"

  deploy-backend:
    name: ☕ Deploy Backend (Render / Koyeb)
    if: github.event.inputs.target == 'all' || github.event.inputs.target == 'backend-only' || github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Backend Deploy Hook
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"
```

### B. Deploy Hook 설정 방법 (초간단 1회 설정)
1. **Vercel**: 프로젝트 Settings ➜ **Git** ➜ **Deploy Hooks** 생성 ➜ 발급된 URL을 GitHub Repository Secrets(`VERCEL_DEPLOY_HOOK_URL`)에 등록.
2. **Render / Koyeb**: 서비스 Settings ➜ **Deploy Hook** 생성 ➜ 발급된 URL을 GitHub Repository Secrets(`RENDER_DEPLOY_HOOK_URL`)에 등록.
3. 이제 GitHub **Actions** 탭 ➜ **🚀 One-Click CD** ➜ **Run workflow** 버튼만 누르면 최신 main 코드가 자동으로 즉시 배포됩니다!

---

## 📌 5. 향후 작업 순서 요약

1. [ ] **Neon DB 프로젝트 개설**: `schema.sql` 실행하여 클라우드 DB 준비
2. [ ] **Backend 연결**: `application.yml`의 DB URL을 Neon 주소로 교체
3. [ ] **GitHub CI 워크플로우 파일 생성**: `.github/workflows/ci-*.yml`
4. [ ] **Vercel & Render 프로젝트 연결**: 무료 계정 생성 및 레포지토리 연결
5. [ ] **One-Click CD 완성**: Deploy Hook 연동으로 버튼 딸깍 배포 활성화
