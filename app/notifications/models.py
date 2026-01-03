from django.db import models
from django.conf import settings


class Notification(models.Model):
    """알림 모델"""
    
    TYPE_CHOICES = [
        ('new_report', '새 제보'),
        ('comment', '댓글'),
        ('resolved', '해결'),
        ('community', '커뮤니티'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text="알림 받을 사용자"
    )
    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        help_text="알림 타입"
    )
    title = models.CharField(
        max_length=100,
        help_text="알림 제목"
    )
    message = models.TextField(
        help_text="알림 내용"
    )
    
    # 관련 제보 (선택적)
    missing_pet = models.ForeignKey(
        'missing_pets.MissingPet',
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True,
        help_text="관련 제보 (선택)"
    )
    
    # 관련 커뮤니티 글 (선택적)
    community = models.ForeignKey(
        'communities.Community',
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True,
        help_text="관련 커뮤니티 글 (선택)"
    )
    
    is_read = models.BooleanField(
        default=False,
        help_text="읽음 여부"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications'
        verbose_name = '알림'
        verbose_name_plural = '알림 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username}: {self.title}"
    
    def mark_as_read(self):
        """읽음 처리"""
        self.is_read = True
        self.save(update_fields=['is_read'])