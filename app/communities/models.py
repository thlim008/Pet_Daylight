from django.db import models
from django.conf import settings


class Community(models.Model):
    """커뮤니티 게시글 모델"""
    
    CATEGORY_CHOICES = [
        ('missing_story', '실종 후기'),
        ('found_story', '발견 후기'),
        ('rescue_story', '구조 경험담'),
        ('tips', '꿀팁 공유'),
        ('lifecycle', '생애주기 경험'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='community_posts',
        help_text="작성자"
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        help_text="카테고리"
    )
    title = models.CharField(
        max_length=100,
        help_text="제목"
    )
    content = models.TextField(
        help_text="내용"
    )
    
    # 사진 (JSON 배열로 최대 5장)
    images = models.JSONField(
        default=list,
        blank=True,
        help_text="사진 URL 배열 (최대 5장)"
    )
    
    # 통계
    views = models.IntegerField(
        default=0,
        help_text="조회수"
    )
    likes = models.IntegerField(
        default=0,
        help_text="좋아요 수"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'communities'
        verbose_name = '커뮤니티 게시글'
        verbose_name_plural = '커뮤니티 게시글 목록'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category', '-created_at']),
        ]
    
    def __str__(self):
        return f"[{self.get_category_display()}] {self.title}"
    
    def increment_views(self):
        """조회수 증가"""
        self.views += 1
        self.save(update_fields=['views'])
    
    def increment_likes(self):
        """좋아요 증가"""
        self.likes += 1
        self.save(update_fields=['likes'])


class CommunityComment(models.Model):
    """커뮤니티 댓글 모델"""
    
    community = models.ForeignKey(
        Community,
        on_delete=models.CASCADE,
        related_name='comments',
        help_text="게시글"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='community_comments',
        help_text="작성자"
    )
    content = models.TextField(
        help_text="댓글 내용"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'community_comments'
        verbose_name = '커뮤니티 댓글'
        verbose_name_plural = '커뮤니티 댓글 목록'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.user.username}: {self.content[:30]}"