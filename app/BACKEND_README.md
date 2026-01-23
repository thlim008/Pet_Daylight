# 🔧 Pet Daylight - Backend

Django REST Framework 기반 Pet Daylight 백엔드 API 서버입니다.

## 📋 목차

- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [설치 및 실행](#설치-및-실행)
- [API 문서](#api-문서)
- [앱 모듈 설명](#앱-모듈-설명)
- [인증 시스템](#인증-시스템)
- [데이터베이스](#데이터베이스)
- [환경 변수](#환경-변수)
- [테스트](#테스트)

## 🛠 기술 스택

### Core
- **Python**: 3.11+
- **Django**: 5.0
- **Django REST Framework**: 3.16.1

### Authentication & Authorization
- **djangorestframework-simplejwt**: 5.5.1 - JWT 토큰 기반 인증
- **django-allauth**: 소셜 로그인 (Google, Kakao, Naver)
- **dj-rest-auth**: 2.7.1 - REST API 인증

### Database
- **PostgreSQL**: 16
- **psycopg2-binary**: 2.9.11 - PostgreSQL 어댑터

### Utilities
- **Pillow**: 12.0.0 - 이미지 처리
- **django-cors-headers**: 4.9.0 - CORS 설정
- **drf-spectacular**: 0.27.0 - OpenAPI 3.0 문서 자동 생성
- **python-decouple**: 3.8 - 환경 변수 관리

## 📁 프로젝트 구조

```
Pet_Daylight/
├── app/
│   ├── accounts/              # 사용자 인증 및 관리
│   │   ├── models.py         # 커스텀 User 모델
│   │   ├── serializers.py    # 사용자 관련 시리얼라이저
│   │   ├── views.py          # 회원가입, 로그인, 프로필 등
│   │   ├── adapters.py       # 소셜 로그인 어댑터
│   │   └── middleware.py     # 인증 미들웨어
│   │
│   ├── lifecycles/            # 반려동물 생애주기 관리
│   │   ├── models.py         # Pet, LifecycleGuide, Checklist 등
│   │   ├── serializers.py    # 생애주기 데이터 시리얼라이저
│   │   └── views.py          # 나이별 가이드, 건강 기록 등
│   │
│   ├── hospitals/             # 동물병원 정보 및 리뷰
│   │   ├── models.py         # Hospital, Review 모델
│   │   ├── serializers.py    # 병원 정보 시리얼라이저
│   │   └── views.py          # 병원 검색, 리뷰 관리
│   │
│   ├── missing_pets/          # 실종 반려동물 관리
│   │   ├── models.py         # MissingPet 모델
│   │   ├── serializers.py    # 실종 신고 시리얼라이저
│   │   ├── views.py          # 실종 신고, 제보 등
│   │   └── utils.py          # 이미지 처리 유틸리티
│   │
│   ├── communities/           # 커뮤니티 게시판
│   │   ├── models.py         # Community, Comment, Like 모델
│   │   ├── serializers.py    # 게시글 시리얼라이저
│   │   └── views.py          # CRUD, 좋아요, 댓글 등
│   │
│   └── notifications/         # 알림 시스템
│       ├── models.py         # Notification 모델
│       ├── serializers.py    # 알림 시리얼라이저
│       └── views.py          # 알림 조회, 읽음 처리
│
├── config/
│   ├── settings.py           # 개발 환경 설정
│   ├── settings_prod.py      # 프로덕션 환경 설정
│   ├── urls.py               # URL 라우팅
│   ├── wsgi.py              # WSGI 설정
│   └── storage_backends.py   # 파일 스토리지 설정
│
├── manage.py                 # Django 관리 명령어
├── requirements.txt          # 개발 환경 의존성
├── requirements_prod.txt     # 프로덕션 환경 의존성
├── Dockerfile               # Docker 이미지 빌드
└── docker-entrypoint.sh     # Docker 진입점 스크립트
```

## 🚀 설치 및 실행

### 1. 로컬 개발 환경 설정

```bash
# 1. 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. 의존성 설치
pip install -r requirements.txt

# 3. 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 필요한 값들을 설정

# 4. PostgreSQL 실행 (Docker)
docker-compose up -d postgres

# 5. 데이터베이스 마이그레이션
python manage.py makemigrations
python manage.py migrate

# 6. 슈퍼유저 생성
python manage.py createsuperuser

# 7. 개발 서버 실행
python manage.py runserver
```

### 2. Docker로 실행

```bash
# 개발 환경
docker-compose up -d

# 프로덕션 환경
docker-compose -f docker-compose.prod.yml up -d
```

## 📖 API 문서

### Swagger UI (개발 환경)
```
http://localhost:8000/api/schema/swagger-ui/
```

### ReDoc (개발 환경)
```
http://localhost:8000/api/schema/redoc/
```

### OpenAPI Schema
```
http://localhost:8000/api/schema/
```

## 🗂 앱 모듈 설명

### 1. accounts (사용자 관리)

**주요 기능:**
- 회원가입, 로그인, 로그아웃
- 소셜 로그인 (Google, Kakao, Naver)
- 프로필 관리
- 비밀번호 재설정

**주요 엔드포인트:**
```
POST   /api/accounts/register/          # 회원가입
POST   /api/accounts/login/             # 로그인
POST   /api/accounts/logout/            # 로그아웃
GET    /api/accounts/profile/           # 프로필 조회
PATCH  /api/accounts/profile/           # 프로필 수정
POST   /api/accounts/password/reset/    # 비밀번호 재설정 요청
POST   /api/accounts/password/reset/confirm/  # 비밀번호 재설정 확인
```

**커스텀 User 모델 필드:**
- email (이메일, 로그인 ID)
- username (사용자명)
- phone_number (전화번호)
- nickname (닉네임)
- profile_image_url (프로필 이미지)

### 2. lifecycles (생애주기 관리)

**주요 기능:**
- 반려동물 등록 및 관리
- 나이별 생애주기 가이드 제공
- 체크리스트 관리
- 건강 기록 (진료, 예방접종 등)
- 앨범 관리

**주요 엔드포인트:**
```
GET    /api/lifecycles/pets/                    # 반려동물 목록
POST   /api/lifecycles/pets/                    # 반려동물 등록
GET    /api/lifecycles/pets/{id}/               # 반려동물 상세
PATCH  /api/lifecycles/pets/{id}/               # 반려동물 수정
DELETE /api/lifecycles/pets/{id}/               # 반려동물 삭제
GET    /api/lifecycles/pets/{id}/guide/         # 생애주기 가이드
GET    /api/lifecycles/pets/{id}/checklist/     # 체크리스트
POST   /api/lifecycles/pets/{id}/health/        # 건강 기록 추가
GET    /api/lifecycles/pets/{id}/vaccinations/  # 예방접종 기록
```

**주요 모델:**
- **Pet**: 반려동물 정보
- **LifecycleGuide**: 생애주기별 가이드
- **UserChecklistProgress**: 사용자 체크리스트 진행상황
- **HealthRecord**: 건강 기록
- **Vaccination**: 예방접종 기록
- **Album**: 앨범 사진

### 3. hospitals (동물병원)

**주요 기능:**
- 위치 기반 동물병원 검색
- 병원 상세 정보 조회
- 병원 리뷰 작성 및 조회
- 즐겨찾기 관리

**주요 엔드포인트:**
```
GET    /api/hospitals/                    # 병원 목록 (위치 기반 검색)
GET    /api/hospitals/{id}/               # 병원 상세
GET    /api/hospitals/{id}/reviews/       # 병원 리뷰 목록
POST   /api/hospitals/{id}/reviews/       # 리뷰 작성
PATCH  /api/hospitals/reviews/{id}/       # 리뷰 수정
DELETE /api/hospitals/reviews/{id}/       # 리뷰 삭제
POST   /api/hospitals/{id}/favorite/      # 즐겨찾기 추가/제거
```

**주요 모델:**
- **Hospital**: 병원 정보 (이름, 주소, 진료시간, 연락처 등)
- **Review**: 병원 리뷰 (평점, 내용, 이미지)
- **Favorite**: 즐겨찾기

### 4. missing_pets (실종 반려동물)

**주요 기능:**
- 실종 신고 등록 및 관리
- 지도 기반 실종 위치 표시
- 실종 반려동물 제보
- 포스터 자동 생성
- 발견 위치 기록

**주요 엔드포인트:**
```
GET    /api/missing-pets/                    # 실종 신고 목록
POST   /api/missing-pets/                    # 실종 신고 등록
GET    /api/missing-pets/{id}/               # 실종 신고 상세
PATCH  /api/missing-pets/{id}/               # 실종 신고 수정
DELETE /api/missing-pets/{id}/               # 실종 신고 삭제
POST   /api/missing-pets/{id}/report/        # 제보하기
GET    /api/missing-pets/{id}/poster/        # 포스터 이미지 생성
POST   /api/missing-pets/{id}/mark-found/    # 발견 처리
```

**주요 모델:**
- **MissingPet**: 실종 신고 정보
  - 반려동물 정보 (이름, 종, 색상, 특징)
  - 실종 위치 (위도, 경도, 주소)
  - 실종 일시
  - 보호자 연락처
  - 상태 (실종중/발견)

**특별 기능:**
- 이미지 기반 포스터 자동 생성 (PIL 사용)
- 지도 마커를 통한 시각적 위치 표시
- 실시간 제보 시스템

### 5. communities (커뮤니티)

**주요 기능:**
- 게시글 작성, 조회, 수정, 삭제
- 댓글 시스템
- 좋아요 기능
- 이미지 업로드
- 검색 및 필터링

**주요 엔드포인트:**
```
GET    /api/communities/                    # 게시글 목록
POST   /api/communities/                    # 게시글 작성
GET    /api/communities/{id}/               # 게시글 상세
PATCH  /api/communities/{id}/               # 게시글 수정
DELETE /api/communities/{id}/               # 게시글 삭제
POST   /api/communities/{id}/like/          # 좋아요 추가/취소
GET    /api/communities/{id}/comments/      # 댓글 목록
POST   /api/communities/{id}/comments/      # 댓글 작성
```

**주요 모델:**
- **Community**: 게시글
- **Comment**: 댓글
- **CommunityLike**: 좋아요

### 6. notifications (알림)

**주요 기능:**
- 활동 알림 (댓글, 좋아요, 제보 등)
- 일정 알림 (예방접종, 진료 일정 등)
- 읽음/안읽음 상태 관리
- 알림 삭제

**주요 엔드포인트:**
```
GET    /api/notifications/              # 알림 목록
GET    /api/notifications/unread/       # 읽지 않은 알림 개수
PATCH  /api/notifications/{id}/read/    # 알림 읽음 처리
DELETE /api/notifications/{id}/         # 알림 삭제
```

**주요 모델:**
- **Notification**: 알림 정보
  - notification_type (알림 유형)
  - content (알림 내용)
  - is_read (읽음 여부)
  - related_id (관련 객체 ID)

## 🔐 인증 시스템

### JWT 토큰 인증

**토큰 발급:**
```python
POST /api/accounts/login/
{
    "email": "user@example.com",
    "password": "password123"
}

Response:
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
    "user": {
        "id": 1,
        "email": "user@example.com",
        "username": "username"
    }
}
```

**토큰 갱신:**
```python
POST /api/accounts/token/refresh/
{
    "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Response:
{
    "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**인증이 필요한 API 호출:**
```bash
curl -H "Authorization: Bearer {access_token}" \
     http://localhost:8000/api/lifecycles/pets/
```

### 소셜 로그인

**지원 플랫폼:**
- Google OAuth 2.0
- Kakao Login
- Naver Login

**소셜 로그인 플로우:**
1. 프론트엔드에서 소셜 로그인 페이지로 리디렉션
2. 사용자 인증 후 콜백 URL로 리디렉션
3. 백엔드에서 소셜 토큰으로 사용자 정보 조회
4. JWT 토큰 발급 및 반환

## 💾 데이터베이스

### PostgreSQL 설정

**개발 환경:**
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'petdaylight_db',
        'USER': 'postgres',
        'PASSWORD': 'postgres',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

**프로덕션 환경:**
```python
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

### 마이그레이션

```bash
# 마이그레이션 파일 생성
python manage.py makemigrations

# 마이그레이션 적용
python manage.py migrate

# 특정 앱만 마이그레이션
python manage.py migrate accounts

# 마이그레이션 상태 확인
python manage.py showmigrations

# 마이그레이션 롤백
python manage.py migrate accounts 0001
```

### 초기 데이터 로드

```bash
# 생애주기 가이드 데이터 로드
python populate_lifecycle_guides.py

# Fixture 로드
python manage.py loaddata initial_data.json
```

## ⚙️ 환경 변수

`.env` 파일에 다음 환경 변수를 설정하세요:

```bash
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=petdaylight_db
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# JWT
JWT_ACCESS_TOKEN_LIFETIME=60  # minutes
JWT_REFRESH_TOKEN_LIFETIME=7  # days

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Social Login
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
KAKAO_REST_API_KEY=your-kakao-rest-api-key
KAKAO_CLIENT_SECRET=your-kakao-client-secret
NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret

# AWS S3 (선택사항)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=ap-northeast-2

# Email (선택사항)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

## 🧪 테스트

### 단위 테스트 실행

```bash
# 모든 테스트 실행
python manage.py test

# 특정 앱 테스트
python manage.py test app.accounts

# 특정 테스트 케이스
python manage.py test app.accounts.tests.UserTestCase

# 커버리지와 함께 실행
coverage run --source='.' manage.py test
coverage report
coverage html  # HTML 리포트 생성
```

### API 테스트

```bash
# Postman Collection 사용
# 또는 curl로 직접 테스트

# 회원가입 테스트
curl -X POST http://localhost:8000/api/accounts/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "testpass123",
    "password2": "testpass123"
  }'

# 로그인 테스트
curl -X POST http://localhost:8000/api/accounts/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

## 🔍 디버깅

### Django Debug Toolbar 사용

```python
# settings.py에 추가 (개발 환경만)
INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
INTERNAL_IPS = ['127.0.0.1']
```

### 로그 확인

```python
# 로그 설정
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
        },
    },
}
```

### Docker 로그

```bash
# 백엔드 로그 확인
docker logs petdaylight-backend

# 실시간 로그 확인
docker logs -f petdaylight-backend

# PostgreSQL 로그
docker logs petdaylight-postgres
```

## 📊 성능 최적화

### 데이터베이스 쿼리 최적화

```python
# select_related 사용 (1:1, N:1)
Pet.objects.select_related('owner').all()

# prefetch_related 사용 (1:N, N:N)
Community.objects.prefetch_related('comments').all()

# only/defer 사용
Pet.objects.only('name', 'species')
```

### 캐싱

```python
# Redis 캐싱 설정
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}

# View에서 캐싱 사용
from django.views.decorators.cache import cache_page

@cache_page(60 * 15)  # 15분 캐싱
def my_view(request):
    pass
```

## 🚨 에러 처리

### 공통 에러 응답 형식

```json
{
    "error": {
        "code": "ERROR_CODE",
        "message": "에러 메시지",
        "detail": {
            "field": ["필드별 상세 에러"]
        }
    }
}
```

### 주요 HTTP 상태 코드

- `200 OK`: 성공
- `201 Created`: 생성 성공
- `204 No Content`: 삭제 성공
- `400 Bad Request`: 잘못된 요청
- `401 Unauthorized`: 인증 실패
- `403 Forbidden`: 권한 없음
- `404 Not Found`: 리소스 없음
- `500 Internal Server Error`: 서버 오류

## 🔒 보안

### 주요 보안 설정

```python
# settings_prod.py
DEBUG = False
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

### CORS 설정

```python
CORS_ALLOWED_ORIGINS = [
    "https://petdaylight.mooo.com",
]

CORS_ALLOW_METHODS = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
]
```

## 📚 추가 자료

- [Django 공식 문서](https://docs.djangoproject.com/)
- [Django REST Framework 문서](https://www.django-rest-framework.org/)
- [drf-spectacular 문서](https://drf-spectacular.readthedocs.io/)
- [Simple JWT 문서](https://django-rest-framework-simplejwt.readthedocs.io/)

## 🤝 기여 가이드

1. 코드 스타일은 PEP 8을 따릅니다
2. 새로운 기능은 테스트 코드와 함께 작성해주세요
3. API 변경 시 문서를 업데이트해주세요
4. 커밋 메시지는 명확하게 작성해주세요

---

문의사항이 있으시면 이슈를 등록해주세요.
