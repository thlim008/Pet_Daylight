from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """사용자 모델"""
    
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
        null=True,   # 이 부분이 추가되어야 소셜 로그인이 터지지 않습니다.
        blank=True,
        help_text="연락처"
    )
    profile_image = models.ImageField(
        upload_to='profiles/',
        null=True,
        blank=True,
        help_text="프로필 사진"
    )
    
    # 추가 정보
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users'
        verbose_name = '사용자'
        verbose_name_plural = '사용자 목록'
    
    def __str__(self):
        return self.username