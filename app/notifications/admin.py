from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """알림 Admin"""
    
    list_display = [
        'id', 'user', 'type', 'title', 
        'is_read', 'created_at'
    ]
    list_filter = ['type', 'is_read', 'created_at']
    search_fields = ['title', 'message', 'user__username']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('user', 'type', 'title', 'message')
        }),
        ('링크', {
            'fields': ('missing_pet', 'data')
        }),
        ('상태', {
            'fields': ('is_read', 'created_at')
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user', 'missing_pet'
        )
    
    actions = ['mark_as_read', 'mark_as_unread']
    
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f'{updated}개의 알림을 읽음으로 표시했습니다.')
    mark_as_read.short_description = '선택한 알림을 읽음으로 표시'
    
    def mark_as_unread(self, request, queryset):
        updated = queryset.update(is_read=False)
        self.message_user(request, f'{updated}개의 알림을 읽지 않음으로 표시했습니다.')
    mark_as_unread.short_description = '선택한 알림을 읽지 않음으로 표시'