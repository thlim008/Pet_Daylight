# 🚀 Pet Daylight 모니터링 빠른 시작 가이드

## 📦 포함된 파일들

```
petdaylight-monitoring/
├── monitoring/
│   ├── prometheus/
│   │   ├── prometheus.yml          # Prometheus 설정
│   │   └── rules.yml                # 알람 규칙
│   ├── grafana/
│   │   └── provisioning/            # Grafana 자동 설정
│   ├── alertmanager/
│   │   └── alertmanager.yml         # 알람 관리 설정
│   ├── discord-relay/               # Discord 알림 브릿지
│   ├── INSTALLATION_GUIDE.md        # 상세 설치 가이드
│   ├── DJANGO_PROMETHEUS_SETUP.md   # Django 설정 가이드
│   └── nginx.conf.new               # 업데이트된 Nginx 설정
└── docker-compose.monitoring.yml    # 모니터링 스택
```

---

## ⚡ 5분 빠른 설치

### 1. 파일 업로드
```bash
# 로컬에서 실행
scp -i petdaylight-key.pem petdaylight-monitoring.tar.gz ubuntu@YOUR-EC2-IP:/home/ubuntu/

# EC2에서 실행
cd /home/ubuntu/petdaylight
tar -xzf ../petdaylight-monitoring.tar.gz
```

### 2. Discord 웹훅 설정
```bash
cd monitoring/discord-relay
cp .env.example .env
nano .env

# 다음 내용 입력:
DISCORD_WEBHOOK=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN
BOT_NAME=Pet Daylight 모니터링 봇
```

### 3. Django 설정 업데이트

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

DATABASES = {
    'default': {
        'ENGINE': 'django_prometheus.db.backends.postgresql',  # 변경
        # ... 나머지 동일
    }
}
```

**config/urls.py에 추가:**
```python
urlpatterns = [
    path('', include('django_prometheus.urls')),  # 추가
    # ... 기존 패턴들
]
```

### 4. 실행
```bash
cd /home/ubuntu/petdaylight

# 백엔드 이미지 재빌드
docker-compose -f docker-compose.prod.yml build backend

# 모니터링 스택 실행
docker-compose -f docker-compose.monitoring.yml up -d

# 전체 서비스 재시작
docker-compose -f docker-compose.prod.yml up -d
```

### 5. 확인
```bash
# 모든 컨테이너 실행 확인
docker ps

# Prometheus 타겟 확인
curl http://localhost:9090/-/ready

# Grafana 접속
https://petdaylight.mooo.com/grafana
# ID: admin / PW: petdaylight2024!
```

---

## 🎯 핵심 메트릭 PromQL

### Django 애플리케이션

**전체 RPS:**
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

**p95 응답시간:**
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

### 시스템 리소스

**CPU 사용률:**
```promql
(1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100
```

**메모리 사용률:**
```promql
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100
```

**디스크 사용률:**
```promql
(1 - (node_filesystem_avail_bytes{fstype=~"ext4|xfs"} / 
      node_filesystem_size_bytes{fstype=~"ext4|xfs"})) * 100
```

---

## 🔧 문제 해결

### Prometheus 타겟이 DOWN

```bash
# Django 메트릭 확인
curl http://localhost:8000/metrics

# 백엔드 재시작
docker-compose -f docker-compose.prod.yml restart backend

# Prometheus 로그 확인
docker logs petdaylight-prometheus
```

### Discord 알림 안 옴

```bash
# Discord Relay 상태 확인
curl http://localhost:8800/health

# 웹훅 URL 확인
cat monitoring/discord-relay/.env

# 수동 테스트
curl -X POST http://localhost:8800/grafana \
  -H "Content-Type: application/json" \
  -d '{"status":"testing","alerts":[]}'
```

### Grafana 접속 안 됨

```bash
# Nginx 설정 업데이트
cp monitoring/nginx.conf.new nginx/nginx.conf

# Nginx 재시작
docker-compose -f docker-compose.prod.yml restart nginx

# Grafana 로그 확인
docker logs petdaylight-grafana
```

---

## 📚 더 자세한 내용은

상세 설치 가이드를 확인하세요:
```
monitoring/INSTALLATION_GUIDE.md
```

---

## 🆘 지원

문제가 발생하면:
1. `docker logs` 명령으로 로그 확인
2. Prometheus 타겟 상태 확인: http://localhost:9090/targets
3. Grafana 데이터소스 확인: https://petdaylight.mooo.com/grafana

---

Happy Monitoring! 🎉
