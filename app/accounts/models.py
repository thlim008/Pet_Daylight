from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db import models
from app.validators import validate_image_size


class User(AbstractUser):
    """사용자 모델"""
    
    # 닉네임 (한글 가능)
    nickname = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="표시용 닉네임 (한글 가능)"
    )
    
    # 위치 정보 (지도/거리 기반 필터링용)
    latitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6, 
        null=True, 
        blank=True,
        help_text="현재 위치 위도"
    )
    longitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6, 
        null=True, 
        blank=True,
        help_text="현재 위치 경도"
    )
    
    # 알림 설정
    notification_enabled = models.BooleanField(
        default=True,
        help_text="알림 수신 여부"
    )
    notification_distance = models.IntegerField(
        default=1000,  # 기본 1km (미터 단위)
        help_text="알림 받을 거리 (미터 단위)"
    )
    
    # 프로필 정보
    phone_number = models.CharField(
        max_length=20,
        null=True,
        blank=True,
        validators=[RegexValidator(
            regex=r'^01[016789]-\d{3,4}-\d{4}$',
            message='전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)'
        )],
        help_text="연락처"
    )
    profile_image = models.ImageField(
        upload_to='profiles/',
        null=True,
        blank=True,
        validators=[validate_image_size],
        help_text="프로필 사진 (업로드)"
    )
    
    # 소셜 로그인 프로필 이미지 URL
    profile_image_url = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text="소셜 로그인 프로필 이미지 URL"
    )
    
    # 병원 관리자 권한 (담당하는 병원/미용실만 관리 가능한 제한된 관리자)
    is_hospital_manager = models.BooleanField(
        default=False,
        help_text="병원 관리자 여부 (담당 병원/미용실만 관리 가능)"
    )

    HOSPITAL_MANAGER_SCOPE_CHOICES = [
        ('both', '병원+미용실'),
        ('hospital', '병원 전용'),
        ('grooming', '미용실 전용'),
    ]
    hospital_manager_scope = models.CharField(
        max_length=10,
        choices=HOSPITAL_MANAGER_SCOPE_CHOICES,
        default='both',
        help_text="병원 관리자가 접근 가능한 범위 (병원 전용/미용실 전용/전체)"
    )

    # 추가 정보
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        verbose_name = '사용자'
        verbose_name_plural = '사용자 목록'
    
    def __str__(self):
        return self.nickname or self.username
    
    @property
    def display_name(self):
        """화면에 표시할 이름"""
        return self.nickname or self.username
    
    @property
    def display_image(self):
        """화면에 표시할 이미지"""
        if self.profile_image:
            return self.profile_image.url
        return self.profile_image_url