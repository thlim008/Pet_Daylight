"""
Django settings for Pet_Daylight project.
"""

from pathlib import Path
from datetime import timedelta
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-CHANGE-THIS-KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'True').lower() == 'true'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

if DEBUG:
    ALLOWED_HOSTS += ['0.0.0.0', '*']

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Django Sites Framework (필수!)
    'django.contrib.sites',
    
    # REST Framework
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',

    # API 문서화
    'drf_spectacular',
    
    # Django Allauth
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    
    # Social Providers
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.kakao',
    'allauth.socialaccount.providers.naver',
    
    # dj-rest-auth
    'dj_rest_auth',
    'dj_rest_auth.registration',
    
    # Your apps
    'app.accounts',
    'app.missing_pets',
    'app.communities',
    'app.lifecycles',
    'app.hospitals',
    'app.notifications',
]

MIDDLEWARE = [
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
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'petdaylight_db'),
        'USER': os.environ.get('DB_USER', 'postgres'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'postgres'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/

LANGUAGE_CODE = 'ko-kr'

TIME_ZONE = 'Asia/Seoul'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/

STATIC_URL = '/django-static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Default primary key field type
# https://docs.djangoproject.com/en/5.0/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'


# ==========================================
# REST Framework 설정
# ==========================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,

     # Swagger 스키마 설정
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',

    # 남용 방지 (무차별 대입 공격 / 이메일 스팸 방지)
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'login': '10/min',
        'password_reset': '3/hour',
        'register': '10/hour',
    },
}


# ==========================================
# JWT 설정
# ==========================================

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}


# ==========================================
# CORS 설정 (React 연동)
# ==========================================

CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000'
).split(',')

CORS_ALLOW_CREDENTIALS = True


# ==========================================
# CSRF 설정 (소셜 로그인용)
# ==========================================

CSRF_TRUSTED_ORIGINS = os.environ.get(
    'CSRF_TRUSTED_ORIGINS',
    'http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000'
).split(',')


# ==========================================
# Django Sites Framework
# ==========================================

SITE_ID = 1


# ==========================================
# Django Allauth 설정
# ==========================================

AUTHENTICATION_BACKENDS = [
    # Django 기본 인증
    'django.contrib.auth.backends.ModelBackend',
    
    # Allauth 인증
    'allauth.account.auth_backends.AuthenticationBackend',
]

# 기본 계정 설정
ACCOUNT_AUTHENTICATION_METHOD = 'username'
ACCOUNT_EMAIL_REQUIRED = False
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_EMAIL_VERIFICATION = 'none'

# 회원가입 설정
ACCOUNT_SIGNUP_EMAIL_ENTER_TWICE = False
ACCOUNT_UNIQUE_EMAIL = False

# 소셜 로그인 설정
SOCIALACCOUNT_AUTO_SIGNUP = True
SOCIALACCOUNT_EMAIL_VERIFICATION = 'none'
SOCIALACCOUNT_LOGIN_ON_GET = True
SOCIALACCOUNT_EMAIL_REQUIRED = False
SOCIALACCOUNT_QUERY_EMAIL = False
SOCIALACCOUNT_STORE_TOKENS = True

# 커스텀 어댑터 설정
SOCIALACCOUNT_ADAPTER = 'app.accounts.adapters.CustomSocialAccountAdapter'

# 리다이렉트 URL
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
LOGIN_REDIRECT_URL = FRONTEND_URL
ACCOUNT_LOGOUT_REDIRECT_URL = f'{FRONTEND_URL}/login'


# ==========================================
# dj-rest-auth 설정
# ==========================================

REST_AUTH = {
    'USE_JWT': True,
    'JWT_AUTH_COOKIE': 'jwt-auth',
    'JWT_AUTH_REFRESH_COOKIE': 'jwt-refresh-token',
    'JWT_AUTH_HTTPONLY': False,
}


# ==========================================
# 소셜 로그인 Provider 설정
# ==========================================

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': [
            'profile',
            'email',
        ],
        'AUTH_PARAMS': {
            'access_type': 'online',
        },
    },
    'kakao': {
        'SCOPE': [],
        'AUTH_PARAMS': {
            'auth_type': 'reauthenticate',
        },
    },
    'naver': {
        'SCOPE': ['name', 'email', 'profile_image'],
    }
}

# 참고: Client ID와 Secret은 Django Admin의 Social applications에서 설정
# Admin에서 각 provider마다 다음을 입력:
# 1. Provider: google/kakao/naver
# 2. Name: 앱 이름 (예: Google OAuth)
# 3. Client id: API 콘솔에서 발급받은 Client ID
# 4. Secret key: API 콘솔에서 발급받은 Secret
# 5. Sites: 반드시 현재 사이트 선택! (중요)


# ==========================================
# 로깅 설정 (개발용)
# ==========================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'allauth': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
        },
        'app.accounts': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}


# ==========================================
# 이메일 설정
# ==========================================

# 우선순위: SendGrid API(HTTPS, 포트 차단 무관) > SMTP > 콘솔(터미널) 출력
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY', '')

if SENDGRID_API_KEY:
    EMAIL_BACKEND = 'config.email_backend.SendGridAPIBackend'
elif os.environ.get('EMAIL_HOST'):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.environ.get('EMAIL_HOST')
    EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
    EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() == 'true'
    EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
    EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'Pet Daylight <noreply@petdaylight.com>')

# 비밀번호 재설정 링크 유효 시간 (초 단위, 기본 24시간)
PASSWORD_RESET_TIMEOUT = 86400  # 24시간


# ==========================================
# API 문서화 설정 (drf-spectacular)
# ==========================================

SPECTACULAR_SETTINGS = {
    'TITLE': 'Pet Daylight API',
    'DESCRIPTION': '''
    반려동물 종합 관리 플랫폼 Pet Daylight의 RESTful API 문서입니다.
    
    ## 주요 기능
    - 🔐 소셜 로그인 (Naver, Kakao, Google)
    - 🐾 반려동물 생애주기 관리
    - 🏥 동물병원 검색 및 리뷰
    - 🔍 실종동물 신고 및 검색
    - 💬 커뮤니티 게시판
    - 🔔 알림 시스템
    ''',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'APPEND_COMPONENTS': {
        'securitySchemes': {
            'BearerAuth': {
                'type': 'http',
                'scheme': 'bearer',
                'bearerFormat': 'JWT',
                'description': 'JWT 토큰 인증. 형식: Bearer {token}'
            }
        }
    },
    'TAGS': [
        {'name': 'accounts', 'description': '사용자 계정 관리 및 인증'},
        {'name': 'social-auth', 'description': '소셜 로그인 (Naver, Kakao, Google)'},
        {'name': 'lifecycles', 'description': '반려동물 생애주기 관리'},
        {'name': 'hospitals', 'description': '동물병원 검색 및 리뷰'},
        {'name': 'missing-pets', 'description': '실종동물 신고 및 검색'},
        {'name': 'communities', 'description': '커뮤니티 게시판'},
        {'name': 'notifications', 'description': '알림 시스템'},
    ],
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': False,
        'displayRequestDuration': True,
        'docExpansion': 'none',
        'filter': True,
    },
    'SCHEMA_PATH_PREFIX': r'/api/',
    'SCHEMA_PATH_PREFIX_TRIM': True,
}

OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')