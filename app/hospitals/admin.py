from django.contrib import admin
from .models import Hospital, HospitalVisit, HospitalReview


@admin.register(Hospital)
class HospitalAdmin(admin.ModelAdmin):
    """병원/미용실 Admin"""
    
    list_display = [
        'name', 'type', 'price_range', 'rating', 
        'review_count', 'phone', 'created_at'
    ]
    list_filter = ['type', 'price_range', 'created_at']
    search_fields = ['name', 'address', 'phone']
    readonly_fields = ['rating', 'review_count', 'created_at', 'updated_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('name', 'type', 'phone')
        }),
        ('위치', {
            'fields': ('latitude', 'longitude', 'address')
        }),
        ('운영 정보', {
            'fields': ('opening_hours', 'services', 'price_range')
        }),
        ('평가', {
            'fields': ('rating', 'review_count')
        }),
        ('추가 정보', {
            'fields': ('description', 'website')
        }),
        ('메타', {
            'fields': ('created_at', 'updated_at')
        }),
    )


@admin.register(HospitalVisit)
class HospitalVisitAdmin(admin.ModelAdmin):
    """병원 방문 기록 Admin"""
    
    list_display = [
        'pet', 'hospital', 'visit_date', 
        'purpose', 'cost', 'next_visit_date'
    ]
    list_filter = ['visit_date', 'hospital__type']
    search_fields = ['purpose', 'notes', 'pet__name', 'hospital__name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('user', 'pet', 'hospital', 'visit_date')
        }),
        ('방문 상세', {
            'fields': ('purpose', 'notes', 'cost')
        }),
        ('다음 방문', {
            'fields': ('next_visit_date',)
        }),
        ('메타', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'user', 'pet', 'hospital'
        )


@admin.register(HospitalReview)
class HospitalReviewAdmin(admin.ModelAdmin):
    """병원 후기 Admin"""
    
    list_display = ['hospital', 'user', 'rating', 'content_short', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['content', 'hospital__name', 'user__username']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('기본 정보', {
            'fields': ('user', 'hospital', 'rating')
        }),
        ('후기', {
            'fields': ('content', 'images')
        }),
        ('메타', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def content_short(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_short.short_description = '후기 내용'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'hospital')