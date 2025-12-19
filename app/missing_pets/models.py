from django.db import models
from django.conf import settings


class MissingPet(models.Model):
    """실종/발견/구조 제보 모델"""
    
    CATEGORY_CHOICES = [
        ('missing', '실종'),
        ('found', '발견'),
        ('rescue', '구조'),
    ]
    
    STATUS_CHOICES = [
        ('active', '진행중'),
        ('resolved', '해결'),
        ('closed', '종료'),
    ]
    
    SPECIES_CHOICES = [
        ('dog', '강아지'),
        ('cat', '고양이'),
        ('other', '기타'),
    ]
    
    # 기본 정보
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='missing_pets',
        help_text="제보자"
    )
    category = models.CharField(
        max_length=10,
        choices=CATEGORY_CHOICES,
        help_text="카테고리 (실종/발견/구조)"
    )
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='active',
        help_text="상태 (진행중/해결/종료)"
    )
    
    # 동물 정보
    species = models.CharField(
        max_length=10,
        choices=SPECIES_CHOICES,
        help_text="종류 (강아지/고양이/기타)"
    )
    breed = models.CharField(
        max_length=50,
        blank=True,
        help_text="품종"
    )
    name = models.CharField(
        max_length=50,
        blank=True,
        help_text="이름 (선택)"
    )
    description = models.TextField(
        help_text="특징 및 상세 설명"
    )
    
    # 위치 정보
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        help_text="발생/발견 위치 위도"
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        help_text="발생/발견 위치 경도"
    )
    address = models.CharField(
        max_length=200,
        blank=True,
        help_text="주소"
    )
    
    # 시간 정보
    occurred_at = models.DateTimeField(
        help_text="발생/발견 시간"
    )
    
    # 연락처
    contact = models.CharField(
        max_length=100,
        help_text="연락처"
    )
    
    # 사진 (JSON 배열로 최대 5장 저장)
    images = models.JSONField(
        default=list,
        help_text="사진 URL 배열 (최대 5장)"
    )
    
    # 통계
    views = models.IntegerField(
        default=0,
        help_text="조회수"
    )
    
    # 메타 정보
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'missing_pets'
        verbose_name = '실종/발견/구조 제보'
        verbose_name_plural = '실종/발견/구조 제보 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category', 'status']),
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"[{self.get_category_display()}] {self.species} - {self.description[:20]}"
    
    def increment_views(self):
        """조회수 증가"""
        self.views += 1
        self.save(update_fields=['views'])


class Comment(models.Model):
    """제보 댓글 모델"""
    
    missing_pet = models.ForeignKey(
        MissingPet,
        on_delete=models.CASCADE,
        related_name='comments',
        help_text="제보"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='missing_pet_comments',
        help_text="작성자"
    )
    content = models.TextField(
        help_text="댓글 내용"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'missing_pet_comments'
        verbose_name = '제보 댓글'
        verbose_name_plural = '제보 댓글 목록'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.user.username}: {self.content[:30]}"