# ===========================
# Django URLs 메트릭 엔드포인트 추가
# ===========================
# config/urls.py에 추가하세요

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Prometheus 메트릭 엔드포인트 추가
    path('', include('django_prometheus.urls')),
    
    # ... 기존 URL 패턴들 ...
]
