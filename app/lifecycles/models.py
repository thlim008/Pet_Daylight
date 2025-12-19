from django.db import models
from django.conf import settings


class LifecycleGuide(models.Model):
    """생애주기 가이드 콘텐츠 모델 (공통 데이터)"""
    
    STAGE_CHOICES = [
        ('adoption', '입양 준비'),
        ('puppy', '육아'),
        ('health', '건강관리'),
        ('senior', '노령 케어'),
        ('farewell', '이별/장례'),
    ]
    
    stage = models.CharField(
        max_length=20,
        choices=STAGE_CHOICES,
        unique=True,
        help_text="생애주기 단계"
    )
    title = models.CharField(
        max_length=100,
        help_text="제목"
    )
    description = models.TextField(
        help_text="설명"
    )
    content = models.TextField(
        help_text="상세 내용"
    )
    
    # 체크리스트 (JSON 배열)
    checklist = models.JSONField(
        default=list,
        help_text="체크리스트 항목들"
    )
    
    # 이미지
    image = models.ImageField(
        upload_to='lifecycles/',
        null=True,
        blank=True,
        help_text="대표 이미지"
    )
    
    # 정렬 순서
    order = models.IntegerField(
        default=0,
        help_text="표시 순서"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'lifecycle_guides'
        verbose_name = '생애주기 가이드'
        verbose_name_plural = '생애주기 가이드 목록'
        ordering = ['order']
    
    def __str__(self):
        return f"{self.get_stage_display()}: {self.title}"


class Pet(models.Model):
    """내 반려동물 프로필 모델"""
    
    SPECIES_CHOICES = [
        ('dog', '강아지'),
        ('cat', '고양이'),
        ('other', '기타'),
    ]
    
    GENDER_CHOICES = [
        ('male', '수컷'),
        ('female', '암컷'),
        ('unknown', '모름'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pets',
        help_text="보호자"
    )
    name = models.CharField(
        max_length=50,
        help_text="이름"
    )
    species = models.CharField(
        max_length=10,
        choices=SPECIES_CHOICES,
        help_text="종류"
    )
    breed = models.CharField(
        max_length=50,
        blank=True,
        help_text="품종"
    )
    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        default='unknown',
        help_text="성별"
    )
    birth_date = models.DateField(
        null=True,
        blank=True,
        help_text="생년월일"
    )
    adoption_date = models.DateField(
        null=True,
        blank=True,
        help_text="입양일"
    )
    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="몸무게 (kg)"
    )
    profile_image = models.ImageField(
        upload_to='pets/',
        null=True,
        blank=True,
        help_text="프로필 사진"
    )
    notes = models.TextField(
        blank=True,
        help_text="특이사항 및 메모"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="활성 상태 (무지개다리 건넜을 경우 False)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'pets'
        verbose_name = '반려동물'
        verbose_name_plural = '반려동물 목록'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.get_species_display()})"
    
    @property
    def age_in_years(self):
        """나이 계산 (년)"""
        if not self.birth_date:
            return None
        from datetime import date
        today = date.today()
        age = today.year - self.birth_date.year
        if today.month < self.birth_date.month or (
            today.month == self.birth_date.month and today.day < self.birth_date.day
        ):
            age -= 1
        return age