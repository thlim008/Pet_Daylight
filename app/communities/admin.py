from django.contrib import admin
from .models import Community, CommunityComment


@admin.register(Community)
class CommunityAdmin(admin.ModelAdmin):
    """커뮤니티 게시글 Admin"""
    
    list_display = [
        'id', 'category', 'title', 'user', 
        'views', 'likes', 'created_at'
    ]
    list_filter = ['category', 'created_at']
    search_fields = ['title', 'content', 'user__username']
    readonly_fields = ['views', 'likes', 'created_at', 'updated_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('user', 'category', 'title', 'content')
        }),
        ('사진', {
            'fields': ('images',)
        }),
        ('통계', {
            'fields': ('views', 'likes', 'created_at', 'updated_at')
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(CommunityComment)
class CommunityCommentAdmin(admin.ModelAdmin):
    """커뮤니티 댓글 Admin"""
    
    list_display = ['id', 'user', 'community', 'content_short', 'created_at']
    list_filter = ['created_at']
    search_fields = ['content', 'user__username']
    readonly_fields = ['created_at', 'updated_at']
    
    def content_short(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_short.short_description = '댓글 내용'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'community')