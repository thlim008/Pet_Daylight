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
    
    SPECIES_CHOICES = [
        ('dog', '강아지'),
        ('cat', '고양이'),
        ('other', '기타'),
    ]
    
    species = models.CharField(
        max_length=10,
        choices=SPECIES_CHOICES,
        default='dog',
        help_text="반려동물 종류"
    )
    stage = models.CharField(
        max_length=20,
        choices=STAGE_CHOICES,
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
        ordering = ['species', 'order']
        # species와 stage 조합을 unique로
        unique_together = [['species', 'stage']]
    
    def __str__(self):
        return f"[{self.get_species_display()}] {self.get_stage_display()}: {self.title}"


class UserChecklistProgress(models.Model):
    """사용자의 체크리스트 완료 상태"""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='checklist_progress',
        help_text="사용자"
    )
    guide = models.ForeignKey(
        LifecycleGuide,
        on_delete=models.CASCADE,
        related_name='user_progress',
        help_text="가이드"
    )
    checklist_item = models.CharField(
        max_length=500,
        help_text="체크리스트 항목 내용"
    )
    is_completed = models.BooleanField(
        default=False,
        help_text="완료 여부"
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="완료 시간"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'user_checklist_progress'
        verbose_name = '사용자 체크리스트 진행상황'
        verbose_name_plural = '사용자 체크리스트 진행상황 목록'
        # 사용자 + 가이드 + 항목 조합은 unique
        unique_together = [['user', 'guide', 'checklist_item']]
        ordering = ['-updated_at']
    
    def __str__(self):
        status = "✓" if self.is_completed else "○"
        return f"{status} {self.user.username} - {self.guide.title} - {self.checklist_item[:30]}"


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
    is_neutered = models.BooleanField(
        default=False,
        help_text="중성화 여부"
    )
    neutered_date = models.DateField(
        null=True,
        blank=True,
        help_text="중성화 수술일"
    )
    birth_date = models.DateField(
        null=True,
        blank=True,
        help_text="생년월일"
    )
    birth_date_unknown = models.BooleanField(
        default=False,
        help_text="생년월일 모름 여부"
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

class Vaccination(models.Model):
    """예방접종 기록 모델"""
    VACCINE_TYPES = [
        ('dhppl', 'DHPPL (종합백신)'),
        ('rabies', '광견병'),
        ('corona', '코로나장염'),
        ('kennel_cough', '켄넬코프'),
        ('fvrcp', 'FVRCP (고양이 종합)'),
        ('felv', '고양이 백혈병'),
        ('other', '기타'),
    ]
    
    pet = models.ForeignKey(
        Pet,
        on_delete=models.CASCADE,
        related_name='vaccinations',
        help_text="반려동물"
    )
    vaccine_type = models.CharField(
        max_length=20,
        choices=VACCINE_TYPES,
        help_text="백신 종류"
    )
    vaccine_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="백신명 (상세)"
    )
    vaccination_date = models.DateField(
        help_text="접종일"
    )
    next_due_date = models.DateField(
        null=True,
        blank=True,
        help_text="다음 접종 예정일"
    )
    hospital_name = models.CharField(
        max_length=100,
        blank=True,
        help_text="접종 병원"
    )
    notes = models.TextField(
        blank=True,
        help_text="메모"
    )
    reminder_sent = models.BooleanField(
        default=False,
        help_text="알림 발송 여부"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pet_vaccinations'
        verbose_name = '예방접종'
        verbose_name_plural = '예방접종 목록'
        ordering = ['-vaccination_date']

    def __str__(self):
        return f"{self.pet.name} - {self.get_vaccine_type_display()} ({self.vaccination_date})"


class HealthRecord(models.Model):
    """건강 기록 모델 (체중, 건강상태 등)"""
    pet = models.ForeignKey(
        Pet,
        on_delete=models.CASCADE,
        related_name='health_records',
        help_text="반려동물"
    )
    record_date = models.DateField(
        help_text="기록일"
    )
    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="체중 (kg)"
    )
    condition = models.CharField(
        max_length=20,
        choices=[
            ('excellent', '매우 좋음'),
            ('good', '좋음'),
            ('normal', '보통'),
            ('poor', '안좋음'),
            ('sick', '아픔'),
        ],
        default='normal',
        help_text="건강 상태"
    )
    notes = models.TextField(
        blank=True,
        help_text="특이사항"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'pet_health_records'
        verbose_name = '건강기록'
        verbose_name_plural = '건강기록 목록'
        ordering = ['-record_date']

    def __str__(self):
        return f"{self.pet.name} - {self.record_date}"


class PetPhoto(models.Model):
    """펫 앨범 사진 모델"""
    pet = models.ForeignKey(
        Pet,
        on_delete=models.CASCADE,
        related_name='photos',
        help_text="반려동물"
    )
    image = models.ImageField(
        upload_to='pet_photos/',
        help_text="사진"
    )
    caption = models.CharField(
        max_length=200,
        blank=True,
        help_text="사진 설명"
    )
    taken_date = models.DateField(
        null=True,
        blank=True,
        help_text="촬영일"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pet_photos'
        verbose_name = '펫 사진'
        verbose_name_plural = '펫 사진 목록'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.pet.name} - {self.created_at.strftime('%Y-%m-%d')}"
