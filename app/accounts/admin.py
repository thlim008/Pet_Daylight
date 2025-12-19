from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """사용자 Admin"""
    
    list_display = ['username', 'email', 'phone_number', 'notification_enabled', 'created_at']
    list_filter = ['notification_enabled', 'is_staff', 'is_active', 'created_at']
    search_fields = ['username', 'email', 'phone_number']
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('추가 정보', {
            'fields': ('phone_number', 'profile_image', 'latitude', 'longitude')
        }),
        ('알림 설정', {
            'fields': ('notification_enabled', 'notification_distance')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('추가 정보', {
            'fields': ('phone_number', 'email')
        }),
    )