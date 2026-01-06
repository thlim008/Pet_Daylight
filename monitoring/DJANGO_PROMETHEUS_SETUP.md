# ===========================
# Django Prometheus 설정 추가
# ===========================
# 이 내용을 config/settings_prod.py에 추가하세요

# INSTALLED_APPS에 추가
INSTALLED_APPS = [
    # ... 기존 앱들 ...
    'django_prometheus',  # 추가
]

# MIDDLEWARE 맨 위와 맨 아래에 추가
MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',  # 맨 위에 추가
    'django.middleware.security.SecurityMiddleware',
    # ... 기존 미들웨어들 ...
    'django_prometheus.middleware.PrometheusAfterMiddleware',  # 맨 아래에 추가
]

# DATABASE 엔진을 Prometheus 래퍼로 변경
DATABASES = {
    'default': {
        'ENGINE': 'django_prometheus.db.backends.postgresql',  # 변경
        'NAME': os.environ.get('RDS_DB_NAME', 'petdaylight_db'),
        # ... 나머지 설정 동일 ...
    }
}

# CACHES도 Prometheus 래퍼로 변경 (Redis 사용 시)
CACHES = {
    'default': {
        'BACKEND': 'django_prometheus.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://redis:6379/1',
    }
}
