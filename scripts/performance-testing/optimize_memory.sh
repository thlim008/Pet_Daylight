#!/bin/bash
echo "=== Pet Daylight 메모리 최적화 스크립트 ==="
echo ""

# 1. Docker 메모리 정리
echo "1. Docker 미사용 리소스 정리..."
docker system prune -f

# 2. Redis 메모리 정리
echo "2. Redis 캐시 정리..."
docker exec petdaylight-redis redis-cli FLUSHALL

# 3. Django 스태틱 파일 캐시 정리
echo "3. Django 캐시 정리..."
docker exec petdaylight-web python manage.py clearsessions

# 4. 시스템 캐시 정리
echo "4. 시스템 캐시 정리..."
sync && echo 3 > /proc/sys/vm/drop_caches

# 5. 메모리 상태 확인
echo ""
echo "=== 최적화 후 메모리 상태 ==="
free -h

echo ""
echo "✅ 최적화 완료!"
