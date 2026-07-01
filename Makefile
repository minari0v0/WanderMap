.PHONY: front back db db-down all

# 프론트엔드 실행
front:
	cd frontend && pnpm dev

# 백엔드 실행
back:
	cd backend && gradlew bootRun

# 데이터베이스 및 레디스 기동
db:
	docker compose up -d

# 데이터베이스 및 레디스 중지
db-down:
	docker compose down

# 한 번에 실행 (병렬)
all:
	make -j 3 db back front
