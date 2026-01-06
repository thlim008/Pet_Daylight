# 🔍 Pet Daylight - Prometheus + Grafana 모니터링 시스템 구축 가이드

완전한 모니터링 시스템을 구축하여 서비스 상태를 실시간으로 모니터링하고 Discord로 알림을 받을 수 있습니다.

---

## 📋 목차

1. [시스템 구성](#시스템-구성)
2. [사전 준비](#사전-준비)
3. [Django 설정](#django-설정)
4. [모니터링 스택 설치](#모니터링-스택-설치)
5. [Discord 웹훅 설정](#discord-웹훅-설정)
6. [배포 및 실행](#배포-및-실행)
7. [Grafana 대시보드 설정](#grafana-대시보드-설정)
8. [알림 규칙 설정](#알림-규칙-설정)
9. [문제 해결](#문제-해결)

---

## 시스템 구성

### 모니터링 스택
```
┌─────────────────────────────────────────┐
│         Pet Daylight Services           │
├─────────────────────────────────────────┤
│  Django Backend → /metrics              │
│  Redis → redis-exporter                 │
│  PostgreSQL/RDS → postgres-exporter     │
│  System → node-exporter                 │
│  Containers → cAdvisor                  │
└────────────┬────────────────────────────┘
             │
             ↓ scrape (15s)
┌─────────────────────────────────────────┐
│         Prometheus                       │
│  - 메트릭 수집 및 저장                   │
│  - 알람 규칙 평가                        │
└────────────┬────────────────────────────┘
             │
             ├──→ Grafana (시각화)
             │
             └──→ Alertmanager → Discord
```

### 포트 구성
- **Django**: 8000
- **Prometheus**: 9090
- **Grafana**: 3001 (외부), 3000 (내부)
- **Alertmanager**: 9093
- **Node Exporter**: 9100
- **Redis Exporter**: 9121
- **PostgreSQL Exporter**: 9187
- **cAdvisor**: 8080
- **Discord Relay**: 8800

---

## 사전 준비

### 1. 필요한 것들
```bash
# EC2 Ubuntu 서버
sudo apt update && sudo apt upgrade -y

# Docker & Docker Compose (이미 설치되어 있음)
docker --version
docker-compose --version
```

### 2. 디렉토리 구조 생성
```bash
cd /home/ubuntu/petdaylight

# 모니터링 파일들을 위한 디렉토리 생성
mkdir -p monitoring/{prometheus,grafana/{provisioning/{datasources,dashboards},dashboards},alertmanager,discord-relay}
```

---

## Django 설정

### 1. requirements_prod.txt에 패키지 추가
```bash
nano requirements_prod.txt
```

다음 내용 추가:
```
# Prometheus 모니터링
django-prometheus==2.3.1
prometheus-client==0.19.0
```

### 2. settings_prod.py 수정
```bash
nano config/settings_prod.py
```

다음 내용 추가/수정:

```python
# INSTALLED_APPS에 추가
INSTALLED_APPS = [
    'django_prometheus',  # 맨 위에 추가
    'django.contrib.admin',
    # ... 기존 앱들 ...
]

# MIDDLEWARE 수정 (맨 위와 맨 아래에 추가)
MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',  # 맨 위
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'app.accounts.middleware.SocialLoginRedirectMiddleware',
    'django_prometheus.middleware.PrometheusAfterMiddleware',  # 맨 아래
]

# DATABASE 엔진 변경
DATABASES = {
    'default': {
        'ENGINE': 'django_prometheus.db.backends.postgresql',  # 변경
        'NAME': os.environ.get('RDS_DB_NAME', 'petdaylight_db'),
        'USER': os.environ.get('RDS_USERNAME', 'postgres'),
        'PASSWORD': os.environ.get('RDS_PASSWORD'),
        'HOST': os.environ.get('RDS_HOSTNAME', 'localhost'),
        'PORT': os.environ.get('RDS_PORT', '5432'),
        'OPTIONS': {
            'connect_timeout': 10,
        },
    }
}

# CACHES 설정 (Redis 사용 시)
CACHES = {
    'default': {
        'BACKEND': 'django_prometheus.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://redis:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

### 3. urls.py에 메트릭 엔드포인트 추가
```bash
nano config/urls.py
```

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Prometheus 메트릭 엔드포인트
    path('', include('django_prometheus.urls')),
    
    # ... 기존 URL 패턴들 ...
]
```

---

## 모니터링 스택 설치

### 1. 설정 파일들 복사
제공된 모니터링 파일들을 서버로 복사:

```bash
# 로컬에서 실행 (제공된 파일들을 EC2로 복사)
scp -i petdaylight-key.pem -r monitoring/ ubuntu@<EC2-IP>:/home/ubuntu/petdaylight/
scp -i petdaylight-key.pem docker-compose.monitoring.yml ubuntu@<EC2-IP>:/home/ubuntu/petdaylight/
```

### 2. 파일 구조 확인
```bash
cd /home/ubuntu/petdaylight
tree monitoring/

# 다음과 같은 구조여야 함:
# monitoring/
# ├── prometheus/
# │   ├── prometheus.yml
# │   └── rules.yml
# ├── grafana/
# │   ├── provisioning/
# │   │   ├── datasources/
# │   │   │   └── prometheus.yml
# │   │   └── dashboards/
# │   │       └── default.yml
# │   └── dashboards/
# ├── alertmanager/
# │   └── alertmanager.yml
# └── discord-relay/
#     ├── Dockerfile
#     ├── relay.py
#     ├── requirements.txt
#     └── .env.example
```

---

## Discord 웹훅 설정

### 1. Discord 웹훅 생성
1. Discord 서버 → **서버 설정**
2. **연동** → **웹후크**
3. **새 웹후크 만들기**
4. 웹후크 이름: `Pet Daylight 모니터링`
5. 채널 선택 (알림을 받을 채널)
6. **웹후크 URL 복사**

### 2. .env 파일 생성
```bash
cd /home/ubuntu/petdaylight/monitoring/discord-relay
cp .env.example .env
nano .env
```

다음 내용 입력:
```bash
DISCORD_WEBHOOK=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
BOT_NAME=Pet Daylight 모니터링 봇
BOT_AVATAR=
```

---

## 배포 및 실행

### 1. 기존 컨테이너 중지
```bash
cd /home/ubuntu/petdaylight
docker-compose -f docker-compose.prod.yml down
```

### 2. 패키지 재설치 (Django Prometheus 추가)
```bash
# 백엔드 이미지 재빌드
docker-compose -f docker-compose.prod.yml build backend
```

### 3. 모니터링 스택 실행
```bash
# 모니터링 컨테이너들 실행
docker-compose -f docker-compose.monitoring.yml up -d

# 로그 확인
docker-compose -f docker-compose.monitoring.yml logs -f
```

### 4. 전체 시스템 실행
```bash
# 모든 서비스 실행
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.monitoring.yml up -d

# 상태 확인
docker ps
```

### 5. 헬스체크
```bash
# Prometheus
curl http://localhost:9090/-/ready

# Grafana
curl http://localhost:3001/api/health

# Django 메트릭
curl http://localhost:8000/metrics | head

# Discord Relay
curl http://localhost:8800/health
```

---

## Grafana 대시보드 설정

### 1. Grafana 접속
브라우저에서 접속:
```
https://petdaylight.mooo.com/grafana
```

**로그인:**
- Username: `admin`
- Password: `petdaylight2024!`

### 2. 데이터소스 확인
1. **Configuration** (⚙️) → **Data sources**
2. **Prometheus** 데이터소스가 자동으로 추가되어 있음
3. **Test** 버튼 클릭 → "Data source is working" 확인

### 3. 대시보드 생성

#### A. Django 애플리케이션 대시보드

**Dashboard 생성:**
1. **+** → **Dashboard**
2. **Add visualization**
3. Data source: **Prometheus** 선택

**필수 패널들:**

**1) 요청 속도 (RPS)**
```promql
# 전체 RPS
sum(rate(django_http_responses_total_by_status_view_method_total{
  job="django",
  view!="prometheus-django-metrics"
}[5m]))
```

**2) 5xx 에러율**
```promql
(
  sum(rate(django_http_responses_total_by_status_view_method_total{
    job="django",
    status=~"5..",
    view!="prometheus-django-metrics"
  }[5m]))
  /
  sum(rate(django_http_responses_total_by_status_view_method_total{
    job="django",
    view!="prometheus-django-metrics"
  }[5m]))
) * 100
```

**3) p95 응답 시간**
```promql
histogram_quantile(
  0.95,
  sum by (le) (
    rate(django_http_requests_latency_seconds_by_view_method_bucket{
      job="django",
      view!="prometheus-django-metrics"
    }[5m])
  )
) * 1000
```

**4) HTTP 상태 코드별 요청 수**
```promql
sum by (status) (
  rate(django_http_responses_total_by_status_view_method_total{
    job="django",
    view!="prometheus-django-metrics"
  }[5m])
)
```

#### B. 시스템 리소스 대시보드

**1) CPU 사용률**
```promql
(1 - avg by (instance) (
  rate(node_cpu_seconds_total{mode="idle",job="node_exporter"}[5m])
)) * 100
```

**2) 메모리 사용률**
```promql
(1 - (
  node_memory_MemAvailable_bytes{job="node_exporter"}
  /
  node_memory_MemTotal_bytes{job="node_exporter"}
)) * 100
```

**3) 디스크 사용률**
```promql
(1 - (
  node_filesystem_avail_bytes{
    job="node_exporter",
    fstype=~"ext4|xfs"
  }
  /
  node_filesystem_size_bytes{
    job="node_exporter",
    fstype=~"ext4|xfs"
  }
)) * 100
```

#### C. 데이터베이스 대시보드

**1) DB 연결 수**
```promql
pg_stat_database_numbackends{job="postgres"}
```

**2) DB 쿼리 p95**
```promql
histogram_quantile(
  0.95,
  sum by (le) (
    rate(django_db_query_duration_seconds_bucket{job="django"}[5m])
  )
) * 1000
```

**3) 트랜잭션 수**
```promql
rate(pg_stat_database_xact_commit{job="postgres"}[5m])
```

#### D. Redis 대시보드

**1) Redis 메모리 사용률**
```promql
(
  redis_memory_used_bytes{job="redis"}
  /
  redis_memory_max_bytes{job="redis"}
) * 100
```

**2) Redis 명령 처리율**
```promql
rate(redis_commands_processed_total{job="redis"}[5m])
```

**3) 캐시 히트율**
```promql
rate(redis_keyspace_hits_total{job="redis"}[5m])
/
(
  rate(redis_keyspace_hits_total{job="redis"}[5m])
  +
  rate(redis_keyspace_misses_total{job="redis"}[5m])
) * 100
```

---

## 알림 규칙 설정

### 1. Grafana Alerting 설정

**Contact Point 추가:**
1. **Alerting** (🔔) → **Contact points**
2. **New contact point**
3. 설정:
   - Name: `discord-alert`
   - Integration: `Webhook`
   - URL: `http://discord-relay:8800/grafana`
   - HTTP Method: `POST`
4. **Test** 클릭 → Discord에서 테스트 메시지 확인
5. **Save contact point**

**Notification Policy 설정:**
1. **Alerting** → **Notification policies**
2. **Default policy** 편집
3. Default contact point: `discord-alert` 선택
4. **Update**

### 2. Alert Rule 생성

#### 예시 1: 5xx 에러율 알림

1. **Alerting** → **Alert rules** → **New alert rule**
2. 설정:

**Rule name:**
```
High 5xx Error Rate
```

**Query (A):**
```promql
(
  sum(rate(django_http_responses_total_by_status_view_method_total{
    job="django",
    status=~"5..",
    view!="prometheus-django-metrics"
  }[5m]))
  /
  sum(rate(django_http_responses_total_by_status_view_method_total{
    job="django",
    view!="prometheus-django-metrics"
  }[5m]))
) * 100
```

**Condition:**
- WHEN: `query A`
- IS ABOVE: `1`
- FOR: `5m`

**Annotations:**
- Summary: `🚨 5xx 에러율 상승: {{ $values.A.Value }}%`
- Description:
```
최근 5분간 5xx 에러율이 1%를 초과했습니다.
현재 에러율: {{ $values.A.Value }}%

확인 사항:
1. 최근 배포 여부
2. 데이터베이스 연결 상태
3. 외부 API 장애 여부
```

#### 예시 2: 응답 지연 알림

**Rule name:**
```
High Response Latency
```

**Query (A):**
```promql
histogram_quantile(
  0.95,
  sum by (le) (
    rate(django_http_requests_latency_seconds_by_view_method_bucket{
      job="django",
      view!="prometheus-django-metrics"
    }[5m])
  )
) * 1000
```

**Condition:**
- WHEN: `query A`
- IS ABOVE: `800`
- FOR: `5m`

**Annotations:**
- Summary: `⚠️ 응답 지연 상승: p95 {{ $values.A.Value }}ms`
- Description:
```
p95 응답시간이 800ms를 초과했습니다.
현재 p95: {{ $values.A.Value }}ms

확인 사항:
1. 느린 쿼리 확인
2. 외부 API 호출 지연
3. CPU/메모리 사용률
```

#### 예시 3: CPU 사용률 알림

**Rule name:**
```
High CPU Usage
```

**Query (A):**
```promql
(1 - avg by (instance) (
  rate(node_cpu_seconds_total{mode="idle",job="node_exporter"}[5m])
)) * 100
```

**Condition:**
- WHEN: `query A`
- IS ABOVE: `80`
- FOR: `10m`

**Annotations:**
- Summary: `⚠️ CPU 사용률 높음: {{ $values.A.Value }}%`
- Description:
```
CPU 사용률이 10분 이상 80%를 초과했습니다.
현재 사용률: {{ $values.A.Value }}%

조치:
1. 프로세스별 CPU 사용률 확인
2. 스케일 아웃 고려
```

---

## 문제 해결

### Prometheus 타겟이 DOWN 상태

**증상:**
```
http://localhost:9090/targets
```
에서 타겟이 DOWN으로 표시됨

**해결:**
```bash
# 1. 백엔드 메트릭 엔드포인트 확인
curl http://localhost:8000/metrics

# 2. 컨테이너 네트워크 확인
docker network inspect petdaylight-network

# 3. Django 로그 확인
docker logs petdaylight-backend

# 4. Prometheus 설정 재로드
curl -X POST http://localhost:9090/-/reload
```

### Grafana 데이터소스 연결 실패

**해결:**
```bash
# 1. Prometheus가 실행 중인지 확인
docker ps | grep prometheus

# 2. Grafana에서 URL 확인
# http://prometheus:9090 (컨테이너 네트워크 내부)

# 3. Grafana 로그 확인
docker logs petdaylight-grafana
```

### Discord 알림이 안 옴

**해결:**
```bash
# 1. Discord Relay 상태 확인
curl http://localhost:8800/health

# 2. .env 파일 확인
cat monitoring/discord-relay/.env

# 3. 수동 테스트
curl -X POST http://localhost:8800/grafana \
  -H "Content-Type: application/json" \
  -d '{"status":"testing","alerts":[]}'

# 4. Discord Relay 로그 확인
docker logs petdaylight-discord-relay
```

### 메트릭이 수집되지 않음

**해결:**
```bash
# 1. Django에서 메트릭 확인
curl http://localhost:8000/metrics | grep django_

# 2. django-prometheus 설치 확인
docker exec petdaylight-backend pip list | grep prometheus

# 3. 백엔드 재시작
docker-compose -f docker-compose.prod.yml restart backend

# 4. Migration 실행
docker-compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

---

## 유용한 명령어

### 컨테이너 관리
```bash
# 전체 상태 확인
docker ps

# 로그 확인
docker logs -f petdaylight-backend
docker logs -f petdaylight-prometheus
docker logs -f petdaylight-grafana

# 컨테이너 재시작
docker-compose -f docker-compose.monitoring.yml restart prometheus
docker-compose -f docker-compose.monitoring.yml restart grafana

# 컨테이너 내부 접속
docker exec -it petdaylight-backend bash
docker exec -it petdaylight-prometheus sh
```

### Prometheus 쿼리
```bash
# 메트릭 목록 확인
curl 'http://localhost:9090/api/v1/label/__name__/values' | jq .

# 특정 메트릭 쿼리
curl 'http://localhost:9090/api/v1/query?query=up' | jq .

# 알람 규칙 확인
curl 'http://localhost:9090/api/v1/rules' | jq .
```

### 설정 재로드
```bash
# Prometheus 설정 재로드 (재시작 없이)
curl -X POST http://localhost:9090/-/reload

# Alertmanager 설정 재로드
curl -X POST http://localhost:9093/-/reload
```

---

## 📊 대시보드 URL

배포 후 접속 가능한 URL:

- **Grafana**: https://petdaylight.mooo.com/grafana
- **Prometheus**: https://petdaylight.mooo.com/prometheus (인증 권장)
- **Django Metrics**: https://petdaylight.mooo.com/metrics (내부 전용)

---

## 🎯 모니터링 체크리스트

배포 후 확인:

- [ ] Prometheus에서 모든 타겟이 UP 상태
- [ ] Grafana에서 데이터소스 연결 성공
- [ ] Django 메트릭 엔드포인트 응답
- [ ] Discord 테스트 알림 수신
- [ ] 대시보드에서 실시간 데이터 표시
- [ ] Alert Rule 정상 동작
- [ ] 모든 Exporter 정상 작동

---

완성! 🎉

이제 Pet Daylight 서비스의 모든 상태를 실시간으로 모니터링하고 문제 발생 시 즉시 Discord로 알림을 받을 수 있습니다.
