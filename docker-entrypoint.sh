#!/bin/bash
set -e

echo "🚀 서버 시작 중..."

# 마이그레이션 실행
echo "📦 마이그레이션 실행..."
python manage.py migrate --noinput

# 정적 파일 수집
echo "📁 정적 파일 수집..."
python manage.py collectstatic --noinput

# 가이드 데이터 로드
echo "🐾 가이드 데이터 확인..."
python manage.py shell -c "
from app.lifecycles.models import LifecycleGuide
if LifecycleGuide.objects.count() == 0:
    print('📚 가이드 데이터 로딩 중...')
    exec(open('populate_lifecycle_guides.py').read())
    print('✅ 가이드 데이터 로딩 완료!')
else:
    print('✅ 가이드 데이터 이미 존재함:', LifecycleGuide.objects.count(), '개')
"

echo "✅ 서버 시작!"
# gunicorn 실행
exec gunicorn --bind 0.0.0.0:8000 --workers 3 --threads 2 config.wsgi:application
