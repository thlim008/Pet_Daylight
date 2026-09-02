#!/bin/bash
# PostgreSQL DB 자동 백업 스크립트
# crontab에 등록해서 매일 실행 (7일치 백업만 보관)

set -e

DB_NAME="${DB_NAME:-petdaylight_db}"
DB_USER="${DB_USER:-postgres}"
export PGPASSWORD="${DB_PASSWORD:-postgres}"

BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

pg_dump -U "$DB_USER" -h localhost "$DB_NAME" | gzip > "$BACKUP_FILE"

# 7일 지난 백업 파일 삭제
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -mtime +7 -delete

echo "백업 완료: $BACKUP_FILE"
