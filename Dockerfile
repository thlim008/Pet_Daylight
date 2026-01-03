# ============================================
# Pet Daylight - Production Dockerfile
# ============================================
FROM python:3.12-slim

# 환경변수 설정
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=config.settings_prod

# 작업 디렉토리
WORKDIR /app

# 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY requirements_prod.txt .
RUN pip install --no-cache-dir -r requirements_prod.txt

# 애플리케이션 코드 복사
COPY . .

# entrypoint 스크립트 권한 설정
RUN chmod +x /app/docker-entrypoint.sh

# 포트 노출
EXPOSE 8000

# entrypoint 실행
ENTRYPOINT ["/app/docker-entrypoint.sh"]
