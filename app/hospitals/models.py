from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from datetime import datetime, time


class Hospital(models.Model):
    """병원/미용실 정보 모델 (공통 데이터)"""
    
    TYPE_CHOICES = [
        ('hospital', '동물병원'),
        ('grooming', '미용실'),
    ]
    
    PRICE_RANGE_CHOICES = [
        ('free', '무료'),
        ('low', '저가'),
        ('medium', '일반'),
        ('high', '고가'),
    ]
    
    type = models.CharField(
        max_length=10,
        choices=TYPE_CHOICES,
        help_text="종류 (병원/미용실)"
    )
    name = models.CharField(
        max_length=100,
        help_text="이름"
    )
    
    # 위치 정보
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        help_text="위도"
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        help_text="경도"
    )
    address = models.CharField(
        max_length=200,
        help_text="주소"
    )
    
    # 연락처
    phone = models.CharField(
        max_length=20,
        help_text="전화번호"
    )
    
    # 카카오맵 연동
    kakao_place_id = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        help_text="카카오맵 장소 ID (중복 방지용)"
    )
    
    # 운영 정보
    is_24_hours = models.BooleanField(
        default=False,
        help_text="24시간 운영 여부"
    )
    opening_hours = models.JSONField(
        default=dict,
        blank=True,
        help_text="영업시간 (JSON) - 예: {'월': '09:00-18:00', '화': '09:00-18:00'}"
    )
    
    # 서비스 정보
    services = models.JSONField(
        default=list,
        blank=True,
        help_text="제공 서비스 목록"
    )
    price_range = models.CharField(
        max_length=10,
        choices=PRICE_RANGE_CHOICES,
        default='medium',
        help_text="가격대"
    )
    
    # 평가
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0.00), MaxValueValidator(5.00)],
        help_text="평점 (0.00~5.00)"
    )
    review_count = models.IntegerField(
        default=0,
        help_text="리뷰 개수"
    )
    
    # 추가 정보
    description = models.TextField(
        blank=True,
        help_text="설명"
    )
    website = models.URLField(
        blank=True,
        help_text="웹사이트"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'hospitals'
        verbose_name = '병원/미용실'
        verbose_name_plural = '병원/미용실 목록'
        ordering = ['-rating', 'name']
        indexes = [
            models.Index(fields=['type', '-rating']),
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['is_24_hours']),
            models.Index(fields=['kakao_place_id']),  # 카카오맵 ID 검색용
        ]
    
    def __str__(self):
        return f"[{self.get_type_display()}] {self.name}"
    
    def update_rating(self):
        """평균 평점 업데이트"""
        reviews = self.reviews.all()
        if reviews.exists():
            self.rating = reviews.aggregate(models.Avg('rating'))['rating__avg']
            self.review_count = reviews.count()
            self.save(update_fields=['rating', 'review_count'])
    
    def is_open_now(self):
        """현재 진료 중인지 확인"""
        if self.is_24_hours:
            return True
        
        if not self.opening_hours:
            return False
        
        now = datetime.now()
        weekday_names = ['월', '화', '수', '목', '금', '토', '일']
        current_day = weekday_names[now.weekday()]
        
        # 오늘의 영업시간 확인
        today_hours = self.opening_hours.get(current_day, '')
        
        if not today_hours or today_hours.lower() in ['휴무', 'closed', '-']:
            return False
        
        try:
            # "09:00-18:00" 형태의 시간을 파싱
            if '-' in today_hours:
                open_time_str, close_time_str = today_hours.split('-')
                open_time = datetime.strptime(open_time_str.strip(), '%H:%M').time()
                close_time = datetime.strptime(close_time_str.strip(), '%H:%M').time()
                current_time = now.time()
                
                # 자정을 넘기는 경우 처리 (예: 22:00-02:00)
                if close_time < open_time:
                    return current_time >= open_time or current_time <= close_time
                else:
                    return open_time <= current_time <= close_time
        except (ValueError, AttributeError):
            return False
        
        return False


class HospitalVisit(models.Model):
    """병원/미용 방문 기록 모델"""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hospital_visits',
        help_text="사용자"
    )
    pet = models.ForeignKey(
        'lifecycles.Pet',
        on_delete=models.CASCADE,
        related_name='hospital_visits',
        help_text="반려동물"
    )
    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.CASCADE,
        related_name='visits',
        help_text="병원/미용실"
    )
    
    visit_date = models.DateField(
        help_text="방문 날짜"
    )
    purpose = models.CharField(
        max_length=100,
        help_text="방문 목적 (예방접종, 검진, 미용 등)"
    )
    notes = models.TextField(
        blank=True,
        help_text="메모"
    )
    cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="비용"
    )
    
    # 다음 방문 예정일 (예방접종 스케줄 관리용)
    next_visit_date = models.DateField(
        null=True,
        blank=True,
        help_text="다음 방문 예정일"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'hospital_visits'
        verbose_name = '방문 기록'
        verbose_name_plural = '방문 기록 목록'
        ordering = ['-visit_date']
        indexes = [
            models.Index(fields=['user', '-visit_date']),
            models.Index(fields=['pet', '-visit_date']),
        ]
    
    def __str__(self):
        return f"{self.pet.name} - {self.hospital.name} ({self.visit_date})"


class HospitalReview(models.Model):
    """병원/미용실 후기 모델"""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hospital_reviews',
        help_text="작성자"
    )
    hospital = models.ForeignKey(
        Hospital,
        on_delete=models.CASCADE,
        related_name='reviews',
        help_text="병원/미용실"
    )
    
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="평점 (1~5점)"
    )
    content = models.TextField(
        help_text="후기 내용"
    )
    
    # 사진 (선택)
    images = models.JSONField(
        default=list,
        blank=True,
        help_text="사진 URL 배열"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'hospital_reviews'
        verbose_name = '병원/미용실 후기'
        verbose_name_plural = '병원/미용실 후기 목록'
        ordering = ['-created_at']
        unique_together = ['user', 'hospital']  # 한 사용자당 한 병원에 하나의 리뷰만
        indexes = [
            models.Index(fields=['hospital', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.hospital.name} ({self.rating}점)"
    
    def save(self, *args, **kwargs):
        """저장 후 병원 평점 업데이트"""
        super().save(*args, **kwargs)
        self.hospital.update_rating()