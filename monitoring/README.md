# 📊 Pet Daylight - Monitoring

Prometheus, Grafana, Alertmanager를 활용한 Pet Daylight 모니터링 시스템입니다.

## 📋 목차

- [개요](#개요)
- [기술 스택](#기술-스택)
- [아키텍처](#아키텍처)
- [설치 및 설정](#설치-및-설정)
- [Prometheus 설정](#prometheus-설정)
- [Grafana 대시보드](#grafana-대시보드)
- [알림 시스템](#알림-시스템)
- [메트릭 가이드](#메트릭-가이드)
- [문제 해결](#문제-해결)
- [성능 최적화](#성능-최적화)

## 🎯 개요

Pet Daylight 모니터링 시스템은 다음과 같은 기능을 제공합니다:

### 핵심 기능
- 📈 **실시간 메트릭 수집**: Django 애플리케이션, PostgreSQL, Nginx, 시스템 리소스
- 📊 **시각화**: Grafana 대시보드로 직관적인 모니터링
- 🚨 **알림**: 임계값 초과 시 Discord로 실시간 알림
- 🔍 **로그 분석**: 에러 및 성능 이슈 추적
- 📉 **성능 추적**: 응답 시간, 처리량, 에러율 모니터링

### 모니터링 대상
- Django 애플리케이션 메트릭 (django-prometheus)
- PostgreSQL 데이터베이스 메트릭 (postgres-exporter)
- Nginx 웹 서버 메트릭 (nginx-prometheus-exporter)
- 시스템 리소스 메트릭 (node-exporter)

## 🛠 기술 스택

### Metrics & Monitoring
- **Prometheus**: 2.x - 시계열 데이터베이스 및 메트릭 수집
- **Grafana**: 10.x - 데이터 시각화 및 대시보드
- **Alertmanager**: 0.26.x - 알림 관리 및 라우팅

### Exporters
- **django-prometheus**: 2.3.1 - Django 메트릭 수집
- **postgres-exporter**: 0.15.0 - PostgreSQL 메트릭
- **nginx-prometheus-exporter**: 1.1.0 - Nginx 메트릭
- **node-exporter**: 1.7.0 - 시스템 메트릭

### Notification
- **Discord Webhook** - Discord 채널로 알림 전송
- **Python Flask** - Discord 릴레이 서버

## 🏗 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Pet Daylight                          │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │ Django   │  │PostgreSQL│  │  Nginx   │  │  Node   ││
│  │  App     │  │    DB    │  │  Server  │  │ Exporter││
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘│
│       │             │             │             │      │
│       │ :9090       │ :9187       │ :9113       │ :9100│
│       └─────────────┴─────────────┴─────────────┘      │
│                         │                               │
└─────────────────────────┼───────────────────────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │  Prometheus   │
                  │   (Metrics    │
                  │  Collection)  │
                  └───────┬───────┘
                          │
                ┌─────────┼─────────┐
                │         │         │
                ▼         ▼         ▼
        ┌───────────┐ ┌──────────┐ ┌─────────────┐
        │  Grafana  │ │ Alert-   │ │   Discord   │
        │ Dashboard │ │ manager  │ │   Relay     │
        └───────────┘ └────┬─────┘ └──────┬──────┘
                           │               │
                           └───────────────┘
                                   │
                                   ▼
                           ┌──────────────┐
                           │   Discord    │
                           │   Channel    │
                           └──────────────┘
```

## 🚀 설치 및 설정

### 1. 사전 요구사항

```bash
# Docker 및 Docker Compose 설치 확인
docker --version
docker-compose --version

# Pet Daylight 프로젝트가 실행 중이어야 함
docker ps
```

### 2. Django에 Prometheus 연동

**requirements_prod.txt에 추가:**
```
django-prometheus==2.3.1
prometheus-client==0.19.0
```

**settings_prod.py 수정:**
```python
INSTALLED_APPS = [
    'django_prometheus',  # 맨 위에 추가
    # ... 기존 앱들
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',  # 맨 위
    # ... 기존 미들웨어들
    'django_prometheus.middleware.PrometheusAfterMiddleware',  # 맨 아래
]

# PostgreSQL 엔진을 Prometheus용으로 변경
DATABASES = {
    'default': {
        'ENGINE': 'django_prometheus.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}
```

**config/urls.py에 메트릭 엔드포인트 추가:**
```python
from django.urls import path, include

urlpatterns = [
    path('', include('django_prometheus.urls')),  # /metrics 엔드포인트 추가
    # ... 기존 패턴들
]
```

### 3. Discord 웹훅 설정

```bash
# Discord Relay 환경 변수 설정
cd monitoring/discord-relay
cp .env.example .env
nano .env
```

**.env 파일 내용:**
```bash
DISCORD_WEBHOOK=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN
BOT_NAME=Pet Daylight 모니터링 봇
BOT_AVATAR_URL=https://your-avatar-url.com/avatar.png
```

**Discord 웹훅 생성 방법:**
1. Discord 서버 → 서버 설정 → 연동
2. 웹훅 → 새 웹훅 만들기
3. 웹훅 이름 설정 (예: Pet Daylight 모니터링)
4. 채널 선택
5. 웹훅 URL 복사

### 4. 모니터링 스택 실행

```bash
# 프로젝트 루트 디렉토리에서
cd /path/to/Pet_Daylight

# 백엔드 이미지 재빌드 (Django Prometheus 설정 반영)
docker-compose -f docker-compose.prod.yml build backend

# 백엔드 재시작
docker-compose -f docker-compose.prod.yml up -d backend

# 모니터링 스택 실행
docker-compose -f docker-compose.monitoring.yml up -d

# 컨테이너 상태 확인
docker ps | grep petdaylight
```

### 5. 접속 확인

**Prometheus:**
```
http://your-domain:9090
또는 내부: http://localhost:9090
```

**Grafana:**
```
https://your-domain/grafana
기본 계정: admin / petdaylight2024!
```

**Alertmanager:**
```
http://your-domain:9093
```

## 📊 Prometheus 설정

### prometheus.yml

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'petdaylight'
    environment: 'production'

# 알림 규칙 파일
rule_files:
  - 'rules.yml'

# Alertmanager 설정
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

# 메트릭 수집 타겟
scrape_configs:
  # Django 애플리케이션
  - job_name: 'django'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
    
  # PostgreSQL
  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres-exporter:9187']
    
  # Nginx
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx-exporter:9113']
    
  # 시스템 메트릭
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
    
  # Prometheus 자체 메트릭
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

### 알림 규칙 (rules.yml)

```yaml
groups:
  - name: django_alerts
    interval: 30s
    rules:
      # 5xx 에러율이 5% 초과
      - alert: HighErrorRate
        expr: |
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
          ) * 100 > 5
        for: 2m
        labels:
          severity: critical
          component: django
        annotations:
          summary: "Django 5xx 에러율 증가"
          description: "5xx 에러율이 {{ $value | humanize }}%입니다."
      
      # 응답 시간 p95가 1초 초과
      - alert: HighResponseTime
        expr: |
          histogram_quantile(
            0.95,
            sum by (le) (
              rate(django_http_requests_latency_seconds_by_view_method_bucket{
                job="django",
                view!="prometheus-django-metrics"
              }[5m])
            )
          ) * 1000 > 1000
        for: 5m
        labels:
          severity: warning
          component: django
        annotations:
          summary: "Django 응답 시간 증가"
          description: "p95 응답 시간이 {{ $value | humanize }}ms입니다."

  - name: system_alerts
    interval: 30s
    rules:
      # CPU 사용률이 80% 초과
      - alert: HighCPUUsage
        expr: (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100 > 80
        for: 5m
        labels:
          severity: warning
          component: system
        annotations:
          summary: "높은 CPU 사용률"
          description: "CPU 사용률이 {{ $value | humanize }}%입니다."
      
      # 메모리 사용률이 85% 초과
      - alert: HighMemoryUsage
        expr: |
          (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 85
        for: 5m
        labels:
          severity: warning
          component: system
        annotations:
          summary: "높은 메모리 사용률"
          description: "메모리 사용률이 {{ $value | humanize }}%입니다."
      
      # 디스크 사용률이 85% 초과
      - alert: HighDiskUsage
        expr: |
          (1 - (node_filesystem_avail_bytes{fstype=~"ext4|xfs"} / 
                node_filesystem_size_bytes{fstype=~"ext4|xfs"})) * 100 > 85
        for: 5m
        labels:
          severity: warning
          component: system
        annotations:
          summary: "높은 디스크 사용률"
          description: "디스크 사용률이 {{ $value | humanize }}%입니다."

  - name: database_alerts
    interval: 30s
    rules:
      # 데이터베이스 연결 실패
      - alert: DatabaseDown
        expr: up{job="postgresql"} == 0
        for: 1m
        labels:
          severity: critical
          component: database
        annotations:
          summary: "PostgreSQL 다운"
          description: "PostgreSQL에 연결할 수 없습니다."
      
      # 활성 연결 수가 90개 초과
      - alert: HighDatabaseConnections
        expr: pg_stat_database_numbackends > 90
        for: 5m
        labels:
          severity: warning
          component: database
        annotations:
          summary: "높은 데이터베이스 연결 수"
          description: "활성 연결 수가 {{ $value }}개입니다."
```

## 📈 Grafana 대시보드

### 기본 대시보드 구성

Grafana는 자동으로 Prometheus 데이터소스와 연결되며, 다음 대시보드를 제공합니다:

1. **Django Application Overview**
   - 요청 처리량 (RPS)
   - 응답 시간 (p50, p95, p99)
   - 에러율 (4xx, 5xx)
   - 활성 요청 수

2. **System Resources**
   - CPU 사용률
   - 메모리 사용률
   - 디스크 I/O
   - 네트워크 트래픽

3. **Database Metrics**
   - 활성 연결 수
   - 트랜잭션 처리량
   - 쿼리 응답 시간
   - 데드락 및 충돌

4. **Nginx Metrics**
   - 요청 수
   - 연결 상태
   - 응답 코드 분포

### 커스텀 대시보드 생성

1. Grafana 접속 (`https://your-domain/grafana`)
2. 좌측 메뉴 → Dashboards → New Dashboard
3. Add Visualization
4. 데이터소스: Prometheus 선택
5. PromQL 쿼리 입력

**예시 패널:**

**Django RPS:**
```promql
sum(rate(django_http_responses_total_by_status_view_method_total{
  job="django",
  view!="prometheus-django-metrics"
}[5m]))
```

**5xx 에러율:**
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

**p95 응답 시간:**
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

## 🚨 알림 시스템

### Alertmanager 설정

**alertmanager.yml:**
```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'severity', 'component']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'discord'
  
  routes:
    - match:
        severity: critical
      receiver: 'discord'
      continue: true
    
    - match:
        severity: warning
      receiver: 'discord'
      continue: true

receivers:
  - name: 'discord'
    webhook_configs:
      - url: 'http://discord-relay:8800/grafana'
        send_resolved: true

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'component']
```

### Discord Relay 서버

**relay.py:**
```python
from flask import Flask, request, jsonify
import requests
import os
from datetime import datetime

app = Flask(__name__)

DISCORD_WEBHOOK = os.getenv('DISCORD_WEBHOOK')
BOT_NAME = os.getenv('BOT_NAME', 'Pet Daylight Monitor')

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'}), 200

@app.route('/grafana', methods=['POST'])
def grafana_webhook():
    data = request.json
    
    if data.get('status') == 'firing':
        color = 0xFF0000  # 빨간색
        title = "🚨 알림 발생"
    elif data.get('status') == 'resolved':
        color = 0x00FF00  # 초록색
        title = "✅ 알림 해결"
    else:
        color = 0xFFFF00  # 노란색
        title = "⚠️ 알림"
    
    embeds = []
    for alert in data.get('alerts', []):
        embed = {
            'title': f"{title}: {alert['labels'].get('alertname', 'Unknown')}",
            'color': color,
            'fields': [
                {
                    'name': 'Severity',
                    'value': alert['labels'].get('severity', 'unknown'),
                    'inline': True
                },
                {
                    'name': 'Component',
                    'value': alert['labels'].get('component', 'unknown'),
                    'inline': True
                },
                {
                    'name': 'Description',
                    'value': alert['annotations'].get('description', 'No description'),
                    'inline': False
                }
            ],
            'timestamp': datetime.utcnow().isoformat()
        }
        embeds.append(embed)
    
    discord_data = {
        'username': BOT_NAME,
        'embeds': embeds
    }
    
    response = requests.post(DISCORD_WEBHOOK, json=discord_data)
    
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8800)
```

### 알림 테스트

```bash
# Discord Relay 헬스체크
curl http://localhost:8800/health

# 테스트 알림 전송
curl -X POST http://localhost:8800/grafana \
  -H "Content-Type: application/json" \
  -d '{
    "status": "firing",
    "alerts": [{
      "labels": {
        "alertname": "TestAlert",
        "severity": "warning",
        "component": "test"
      },
      "annotations": {
        "description": "This is a test alert"
      }
    }]
  }'
```

## 📊 메트릭 가이드

### Django 메트릭

**요청 메트릭:**
- `django_http_requests_total_by_method_total`: HTTP 메소드별 요청 수
- `django_http_responses_total_by_status_view_method_total`: 상태 코드별 응답 수
- `django_http_requests_latency_seconds_by_view_method`: 뷰별 응답 시간

**데이터베이스 메트릭:**
- `django_db_query_duration_seconds`: 데이터베이스 쿼리 실행 시간
- `django_db_execute_total`: 실행된 쿼리 수
- `django_db_errors_total`: 데이터베이스 에러 수

**모델 메트릭:**
- `django_model_inserts_total`: 모델 삽입 수
- `django_model_updates_total`: 모델 업데이트 수
- `django_model_deletes_total`: 모델 삭제 수

### PostgreSQL 메트릭

**연결 메트릭:**
- `pg_stat_database_numbackends`: 활성 연결 수
- `pg_settings_max_connections`: 최대 연결 수

**성능 메트릭:**
- `pg_stat_database_xact_commit`: 커밋된 트랜잭션 수
- `pg_stat_database_xact_rollback`: 롤백된 트랜잭션 수
- `pg_stat_database_blks_read`: 디스크에서 읽은 블록 수
- `pg_stat_database_blks_hit`: 캐시에서 읽은 블록 수

### Nginx 메트릭

**요청 메트릭:**
- `nginx_http_requests_total`: 총 HTTP 요청 수
- `nginx_http_request_duration_seconds`: 요청 처리 시간

**연결 메트릭:**
- `nginx_connections_active`: 활성 연결 수
- `nginx_connections_reading`: 읽기 중인 연결
- `nginx_connections_writing`: 쓰기 중인 연결
- `nginx_connections_waiting`: 대기 중인 연결

### 시스템 메트릭

**CPU:**
- `node_cpu_seconds_total`: CPU 사용 시간
- `node_load1`, `node_load5`, `node_load15`: 로드 평균

**메모리:**
- `node_memory_MemTotal_bytes`: 총 메모리
- `node_memory_MemAvailable_bytes`: 사용 가능한 메모리
- `node_memory_Buffers_bytes`, `node_memory_Cached_bytes`: 버퍼/캐시

**디스크:**
- `node_filesystem_size_bytes`: 파일시스템 크기
- `node_filesystem_avail_bytes`: 사용 가능한 공간
- `node_disk_io_time_seconds_total`: 디스크 I/O 시간

**네트워크:**
- `node_network_receive_bytes_total`: 수신 바이트
- `node_network_transmit_bytes_total`: 송신 바이트

## 🔧 문제 해결

### Prometheus 타겟이 DOWN 상태

**확인 사항:**
```bash
# 1. Django 메트릭 엔드포인트 확인
curl http://localhost:8000/metrics

# 2. 백엔드 로그 확인
docker logs petdaylight-backend

# 3. 네트워크 연결 확인
docker exec petdaylight-prometheus curl http://backend:8000/metrics

# 4. 백엔드 재시작
docker-compose -f docker-compose.prod.yml restart backend
```

### Discord 알림이 오지 않음

**확인 사항:**
```bash
# 1. Discord Relay 상태 확인
curl http://localhost:8800/health

# 2. 웹훅 URL 확인
docker exec petdaylight-discord-relay env | grep DISCORD_WEBHOOK

# 3. 로그 확인
docker logs petdaylight-discord-relay

# 4. 수동 테스트
curl -X POST http://localhost:8800/grafana \
  -H "Content-Type: application/json" \
  -d '{"status":"firing","alerts":[{"labels":{"alertname":"Test"},"annotations":{"description":"Test"}}]}'

# 5. Discord Relay 재시작
docker-compose -f docker-compose.monitoring.yml restart discord-relay
```

### Grafana 접속 불가

**확인 사항:**
```bash
# 1. Nginx 설정 확인
docker exec petdaylight-nginx nginx -t

# 2. Nginx 로그 확인
docker logs petdaylight-nginx

# 3. Grafana 컨테이너 상태 확인
docker logs petdaylight-grafana

# 4. Nginx 재시작
docker-compose -f docker-compose.prod.yml restart nginx
```

### 메트릭 데이터가 표시되지 않음

**확인 사항:**
```bash
# 1. Prometheus에서 쿼리 테스트
# http://localhost:9090 접속 → Graph → 쿼리 입력

# 2. Prometheus 타겟 상태 확인
# http://localhost:9090/targets

# 3. Grafana 데이터소스 연결 확인
# Grafana → Configuration → Data Sources → Prometheus → Test

# 4. 시간 범위 확인
# Grafana 대시보드 우측 상단 시간 범위 설정 확인
```

## ⚡ 성능 최적화

### Prometheus 스토리지 관리

**데이터 보존 기간 설정:**
```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'  # 30일 보관
      - '--storage.tsdb.retention.size=10GB'  # 최대 10GB
```

### 메트릭 수집 최적화

**수집 간격 조정:**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s  # 기본: 15초
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'django'
    scrape_interval: 10s  # Django는 더 자주 수집
    
  - job_name: 'node'
    scrape_interval: 30s  # 시스템 메트릭은 덜 자주
```

### Grafana 성능 개선

**쿼리 최적화:**
```promql
# 나쁜 예: 모든 레이블 포함
sum(django_http_responses_total_by_status_view_method_total)

# 좋은 예: 필요한 레이블만 선택
sum(django_http_responses_total_by_status_view_method_total{
  job="django",
  status=~"2..|3.."
}) by (status)
```

**패널 리프레시 간격 조정:**
- 실시간 대시보드: 5초~10초
- 일반 대시보드: 30초~1분
- 히스토리 대시보드: 5분

### 알림 최적화

**알림 그룹화:**
```yaml
# alertmanager.yml
route:
  group_by: ['alertname', 'component']
  group_wait: 30s      # 같은 그룹의 알림을 30초간 모음
  group_interval: 5m   # 그룹 업데이트 간격
  repeat_interval: 4h  # 같은 알림 재전송 간격
```

## 📚 유용한 PromQL 쿼리

### 트래픽 분석

**시간대별 트래픽:**
```promql
sum(rate(django_http_responses_total_by_status_view_method_total[1h])) by (hour(timestamp()))
```

**엔드포인트별 트래픽:**
```promql
topk(10, 
  sum(rate(django_http_responses_total_by_status_view_method_total[5m])) by (view)
)
```

### 에러 분석

**가장 많은 에러를 발생시키는 엔드포인트:**
```promql
topk(5,
  sum(rate(django_http_responses_total_by_status_view_method_total{status=~"5.."}[5m])) by (view)
)
```

**시간별 에러 추세:**
```promql
sum(increase(django_http_responses_total_by_status_view_method_total{status=~"5.."}[1h])) by (hour(timestamp()))
```

### 성능 분석

**느린 엔드포인트 TOP 10:**
```promql
topk(10,
  histogram_quantile(0.95,
    sum by (le, view) (
      rate(django_http_requests_latency_seconds_by_view_method_bucket[5m])
    )
  )
)
```

**데이터베이스 쿼리 성능:**
```promql
histogram_quantile(0.95,
  rate(django_db_query_duration_seconds_bucket[5m])
)
```

## 🔐 보안

### 인증 설정

**Prometheus 기본 인증:**
```yaml
# prometheus.yml (웹 UI 보호는 docker-compose에서 설정)
```

**Grafana 보안 설정:**
```bash
# 기본 비밀번호 변경
# Grafana UI → Profile → Change Password

# 또는 환경 변수로 설정
# docker-compose.monitoring.yml
environment:
  - GF_SECURITY_ADMIN_PASSWORD=your-secure-password
```

### 네트워크 보안

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    networks:
      - monitoring
    # 외부 노출 최소화

networks:
  monitoring:
    driver: bridge
    internal: true  # 외부 접근 차단
```

## 📊 대시보드 예시

### 1. Application Dashboard

**패널 구성:**
- RPS (Requests Per Second)
- 평균 응답 시간
- 5xx 에러율
- 활성 사용자 수
- 데이터베이스 쿼리 수
- 캐시 히트율

### 2. Infrastructure Dashboard

**패널 구성:**
- CPU 사용률 (전체, 코어별)
- 메모리 사용률 (총, 사용, 캐시)
- 디스크 사용률 및 I/O
- 네트워크 트래픽
- 컨테이너 상태

### 3. Business Dashboard

**패널 구성:**
- 신규 가입자 수
- 일일 활성 사용자 (DAU)
- 게시글 작성 수
- 실종 신고 수
- 병원 검색 수

## 📖 추가 자료

- [Prometheus 공식 문서](https://prometheus.io/docs/)
- [Grafana 공식 문서](https://grafana.com/docs/)
- [PromQL 치트 시트](https://promlabs.com/promql-cheat-sheet/)
- [django-prometheus 문서](https://github.com/korfuri/django-prometheus)
- [Node Exporter 가이드](https://github.com/prometheus/node_exporter)

## 🤝 기여 가이드

모니터링 시스템 개선을 위한 기여는 언제나 환영합니다:

1. 새로운 알림 규칙 제안
2. 대시보드 템플릿 공유
3. PromQL 쿼리 최적화
4. 문서 개선

---

문의사항이 있으시면 이슈를 등록해주세요.
