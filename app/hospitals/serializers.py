from rest_framework import serializers
from .models import Hospital, HospitalVisit, HospitalReview


class HospitalListSerializer(serializers.ModelSerializer):
    """병원/미용실 목록용 Serializer (간단한 정보)"""
    
    class Meta:
        model = Hospital
        fields = [
            'id',
            'type',
            'name',
            'latitude',
            'longitude',
            'address',
            'phone',
            'rating',
            'review_count',
            'is_24_hours',
            'price_range',
            'kakao_place_id',
        ]
        read_only_fields = ['rating', 'review_count']


class HospitalSerializer(serializers.ModelSerializer):
    """병원/미용실 상세 Serializer"""
    
    class Meta:
        model = Hospital
        fields = '__all__'
        read_only_fields = ['rating', 'review_count', 'created_at', 'updated_at']


class HospitalVisitSerializer(serializers.ModelSerializer):
    """방문 기록 Serializer"""
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    
    class Meta:
        model = HospitalVisit
        fields = '__all__'
        read_only_fields = ['user', 'created_at']


class HospitalReviewSerializer(serializers.ModelSerializer):
    """리뷰 Serializer"""
    user_name = serializers.CharField(source='user.username', read_only=True)
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    
    class Meta:
        model = HospitalReview
        fields = '__all__'
        read_only_fields = ['user', 'hospital', 'created_at', 'updated_at']