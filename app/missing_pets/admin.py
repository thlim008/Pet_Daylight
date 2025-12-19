from django.contrib import admin
from .models import MissingPet, Comment


@admin.register(MissingPet)
class MissingPetAdmin(admin.ModelAdmin):
    """실종/발견/구조 제보 Admin"""
    
    list_display = [
        'id', 'category', 'species', 'breed', 'status', 
        'user', 'address', 'views', 'created_at'
    ]
    list_filter = ['category', 'status', 'species', 'created_at']
    search_fields = ['description', 'address', 'breed', 'name']
    readonly_fields = ['views', 'created_at', 'updated_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('user', 'category', 'status')
        }),
        ('동물 정보', {
            'fields': ('species', 'breed', 'name', 'description', 'images')
        }),
        ('위치 정보', {
            'fields': ('latitude', 'longitude', 'address')
        }),
        ('연락처 & 시간', {
            'fields': ('contact', 'occurred_at')
        }),
        ('통계', {
            'fields': ('views', 'created_at', 'updated_at')
        }),
    )
    
    def get_queryset(self, request):
        """쿼리 최적화"""
        return super().get_queryset(request).select_related('user')


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    """제보 댓글 Admin"""
    
    list_display = ['id', 'user', 'missing_pet', 'content_short', 'created_at']
    list_filter = ['created_at']
    search_fields = ['content', 'user__username']
    readonly_fields = ['created_at', 'updated_at']
    
    def content_short(self, obj):
        """댓글 내용 미리보기"""
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_short.short_description = '댓글 내용'
    
    def get_queryset(self, request):
        """쿼리 최적화"""
        return super().get_queryset(request).select_related('user', 'missing_pet')