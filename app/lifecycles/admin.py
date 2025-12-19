from django.contrib import admin
from .models import LifecycleGuide, Pet


@admin.register(LifecycleGuide)
class LifecycleGuideAdmin(admin.ModelAdmin):
    """생애주기 가이드 Admin"""
    
    list_display = ['stage', 'title', 'order', 'created_at']
    list_filter = ['stage']
    search_fields = ['title', 'description', 'content']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['order']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('stage', 'title', 'description', 'order')
        }),
        ('콘텐츠', {
            'fields': ('content', 'checklist', 'image')
        }),
        ('메타', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    """반려동물 프로필 Admin"""
    
    list_display = [
        'name', 'species', 'breed', 'user', 
        'birth_date', 'is_active', 'created_at'
    ]
    list_filter = ['species', 'gender', 'is_active', 'created_at']
    search_fields = ['name', 'breed', 'user__username']
    readonly_fields = ['age_in_years', 'created_at', 'updated_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('user', 'name', 'species', 'breed', 'gender')
        }),
        ('상세 정보', {
            'fields': ('birth_date', 'adoption_date', 'weight', 'profile_image')
        }),
        ('메모', {
            'fields': ('notes',)
        }),
        ('상태', {
            'fields': ('is_active', 'age_in_years')
        }),
        ('메타', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def age_in_years(self, obj):
        return f"{obj.age_in_years}세" if obj.age_in_years is not None else '-'
    age_in_years.short_description = '나이'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')