"""
Django Production Settings for AWS Deployment
"""

from pathlib import Path
from datetime import timedelta
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# ===========================================
# 🔐 보안 설정 (환경변수에서 로드)
# ===========================================

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')


# ===========================================
# 앱 설정
# ===========================================

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    
    # REST Framework
    'rest_framework',
    'rest_framework.authtoken',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    
    # Django Allauth
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.kakao',
    'allauth.socialaccount.providers.naver',
    
    # dj-rest-auth
    'dj_rest_auth',
    'dj_rest_auth.registration',
    
    # AWS S3 Storage
    'storages',
    
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


# ===========================================
# 🗄️ AWS RDS PostgreSQL 데이터베이스
# ===========================================

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
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


# ===========================================
# Password validation
# ===========================================

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# ===========================================
# 국제화 설정
# ===========================================

LANGUAGE_CODE = 'ko-kr'
TIME_ZONE = 'Asia/Seoul'
USE_I18N = True
USE_TZ = True


# ===========================================
# 📦 AWS S3 정적/미디어 파일 저장소
# ===========================================

# AWS 자격증명
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION_NAME', 'ap-northeast-2')

# S3 설정
AWS_S3_CUSTOM_DOMAIN = f'{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_S3_REGION_NAME}.amazonaws.com'
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',
}
AWS_DEFAULT_ACL = None
AWS_S3_FILE_OVERWRITE = False

# Static files (CSS, JavaScript)
STATICFILES_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'

# Media files (uploads)
DEFAULT_FILE_STORAGE = 'config.storage_backends.MediaStorage'
MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'

# collectstatic용 로컬 경로
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')


# ===========================================
# Default primary key field type
# ===========================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'accounts.User'


# ===========================================
# REST Framework 설정
# ===========================================

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}


# ===========================================
# JWT 설정
# ===========================================

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}


# ===========================================
# 🌐 CORS 설정 (프론트엔드 도메인)
# ===========================================

FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://petdaylight.com')

CORS_ALLOWED_ORIGINS = [
    FRONTEND_URL,
]

# CloudFront 사용시 추가
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.cloudfront\.net$",
]

CORS_ALLOW_CREDENTIALS = True


# ===========================================
# CSRF 설정
# ===========================================

CSRF_TRUSTED_ORIGINS = [
    FRONTEND_URL,
    os.environ.get('BACKEND_URL', 'https://api.petdaylight.com'),
]


# ===========================================
# Django Sites Framework
# ===========================================

SITE_ID = 1


# ===========================================
# Django Allauth 설정
# ===========================================

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

ACCOUNT_AUTHENTICATION_METHOD = 'username'
ACCOUNT_EMAIL_REQUIRED = False
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_EMAIL_VERIFICATION = 'none'
ACCOUNT_SIGNUP_EMAIL_ENTER_TWICE = False
ACCOUNT_UNIQUE_EMAIL = False

SOCIALACCOUNT_AUTO_SIGNUP = True
SOCIALACCOUNT_EMAIL_VERIFICATION = 'none'
SOCIALACCOUNT_LOGIN_ON_GET = True
SOCIALACCOUNT_EMAIL_REQUIRED = False
SOCIALACCOUNT_QUERY_EMAIL = False
SOCIALACCOUNT_STORE_TOKENS = True
SOCIALACCOUNT_ADAPTER = 'app.accounts.adapters.CustomSocialAccountAdapter'
ACCOUNT_ADAPTER = 'app.accounts.adapters.CustomAccountAdapter'
#ACCOUNT_ADAPTER = 'app.accounts.adapters.CustomSocialAccountAdapter'
LOGIN_REDIRECT_URL = 'https://petdaylight.mooo.com'
ACCOUNT_LOGOUT_REDIRECT_URL = f'{FRONTEND_URL}/login'


# ===========================================
# dj-rest-auth 설정
# ===========================================

REST_AUTH = {
    'USE_JWT': True,
    'JWT_AUTH_COOKIE': 'jwt-auth',
    'JWT_AUTH_REFRESH_COOKIE': 'jwt-refresh-token',
    'JWT_AUTH_HTTPONLY': False,
}


# ===========================================
# 소셜 로그인 Provider 설정
# ===========================================

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
    },
    'kakao': {
        'SCOPE': [],
        'AUTH_PARAMS': {'auth_type': 'reauthenticate'},
    },
    'naver': {
        'SCOPE': ['name', 'email', 'profile_image'],
    }
}


# ===========================================
# 📧 AWS SES 이메일 설정
# ===========================================

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'email-smtp.ap-northeast-2.amazonaws.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT') or 587)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'Pet Daylight <noreply@petdaylight.com>')

PASSWORD_RESET_TIMEOUT = 86400  # 24시간


# ===========================================
# 🔒 프로덕션 보안 설정
# ===========================================

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# HTTPS 강제 (Load Balancer 뒤에서는 설정 조정 필요)
if not DEBUG:
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')


# ===========================================
# 로깅 설정 (CloudWatch 연동 가능)
# ===========================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
