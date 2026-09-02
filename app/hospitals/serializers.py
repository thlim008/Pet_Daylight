from rest_framework import serializers
from .models import Hospital, HospitalVisit, HospitalReview


class HospitalListSerializer(serializers.ModelSerializer):
    """병원/미용실 목록용 Serializer (간단한 정보)"""
    is_open_now = serializers.SerializerMethodField()

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
            'opening_hours',
            'is_open_now',
            'price_range',
            'kakao_place_id',
        ]
        read_only_fields = ['rating', 'review_count']

    def get_is_open_now(self, obj):
        return obj.is_open_now()


class HospitalSerializer(serializers.ModelSerializer):
    """병원/미용실 상세 Serializer"""
    is_open_now = serializers.SerializerMethodField()

    class Meta:
        model = Hospital
        fields = '__all__'
        read_only_fields = ['rating', 'review_count', 'created_at', 'updated_at']

    def get_is_open_now(self, obj):
        return obj.is_open_now()


class HospitalVisitSerializer(serializers.ModelSerializer):
    """방문 기록 Serializer"""
    
    class Meta:
        model = HospitalVisit
        fields = [
            'id',
            'user',
            'pet',
            'hospital',
            'hospital_name',
            'hospital_address',
            'hospital_phone',
            'visit_date',
            'purpose',
            'notes',
            'cost',
            'next_visit_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']

    def to_representation(self, instance):
        """응답 시 병원 정보를 적절히 표시"""
        data = super().to_representation(instance)
        
        # hospital 또는 hospital_name 중 하나를 우선 표시
        if instance.hospital:
            data['hospital_name'] = instance.hospital.name
            data['hospital_address'] = instance.hospital.address
            data['hospital_phone'] = instance.hospital.phone
        # else: 직접 입력한 값이 그대로 사용됨
        
        return data


class HospitalReviewSerializer(serializers.ModelSerializer):
    """리뷰 Serializer"""
    user_name = serializers.CharField(source='user.display_name', read_only=True)
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    
    class Meta:
        model = HospitalReview
        fields = '__all__'
        read_only_fields = ['user', 'hospital', 'created_at', 'updated_at']
