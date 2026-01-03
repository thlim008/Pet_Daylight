from django.contrib import admin
from .models import LifecycleGuide, Pet, UserChecklistProgress


@admin.register(LifecycleGuide)
class LifecycleGuideAdmin(admin.ModelAdmin):
    """생애주기 가이드 Admin"""
    
    list_display = ['species', 'stage', 'title', 'order', 'created_at']
    list_filter = ['species', 'stage']
    search_fields = ['title', 'description', 'content']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['species', 'order']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('species', 'stage', 'title', 'description', 'order')
        }),
        ('콘텐츠', {
            'fields': ('content', 'checklist', 'image')
        }),
        ('메타', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(UserChecklistProgress)
class UserChecklistProgressAdmin(admin.ModelAdmin):
    """사용자 체크리스트 진행상황 Admin"""
    
    list_display = [
        'user', 'guide', 'checklist_item_short', 
        'is_completed', 'completed_at', 'updated_at'
    ]
    list_filter = ['is_completed', 'guide__species', 'guide__stage', 'created_at']
    search_fields = ['user__username', 'guide__title', 'checklist_item']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('user', 'guide', 'checklist_item')
        }),
        ('완료 상태', {
            'fields': ('is_completed', 'completed_at')
        }),
        ('메타', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def checklist_item_short(self, obj):
        """체크리스트 항목 짧게 표시"""
        return obj.checklist_item[:50] + '...' if len(obj.checklist_item) > 50 else obj.checklist_item
    checklist_item_short.short_description = '체크리스트 항목'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'guide')


@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    """반려동물 프로필 Admin"""
    
    list_display = [
        'name', 'species', 'breed', 'user', 
        'birth_date', 'is_neutered', 'is_active', 'created_at'
    ]
    list_filter = ['species', 'gender', 'is_neutered', 'is_active', 'created_at']
    search_fields = ['name', 'breed', 'user__username']
    readonly_fields = ['age_in_years', 'created_at', 'updated_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('user', 'name', 'species', 'breed', 'gender')
        }),
        ('건강 정보', {
            'fields': ('is_neutered', 'neutered_date', 'weight')
        }),
        ('상세 정보', {
            'fields': ('birth_date', 'adoption_date', 'profile_image')
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