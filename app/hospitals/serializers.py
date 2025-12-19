from rest_framework import serializers
from .models import Hospital, HospitalVisit, HospitalReview
from app.accounts.serializers import UserSimpleSerializer
from app.lifecycles.serializers import PetListSerializer


class HospitalSerializer(serializers.ModelSerializer):
    """병원/미용실 Serializer"""
    
    class Meta:
        model = Hospital
        fields = [
            'id', 'name', 'type', 'phone', 'address',
            'latitude', 'longitude', 'opening_hours', 'services',
            'price_range', 'rating', 'review_count',
            'description', 'website',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'rating', 'review_count', 'created_at', 'updated_at']


class HospitalListSerializer(serializers.ModelSerializer):
    """병원/미용실 리스트용 Serializer"""
    
    class Meta:
        model = Hospital
        fields = [
            'id', 'name', 'type', 'address',
            'price_range', 'rating', 'review_count'
        ]


class HospitalVisitSerializer(serializers.ModelSerializer):
    """병원 방문 기록 Serializer"""
    user = UserSimpleSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)
    pet = PetListSerializer(read_only=True)
    pet_id = serializers.IntegerField(write_only=True)
    hospital = HospitalListSerializer(read_only=True)
    hospital_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = HospitalVisit
        fields = [
            'id', 'user', 'user_id', 'pet', 'pet_id',
            'hospital', 'hospital_id', 'visit_date',
            'purpose', 'notes', 'cost', 'next_visit_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        validated_data.pop('user_id', None)
        return super().create(validated_data)


class HospitalReviewSerializer(serializers.ModelSerializer):
    """병원 후기 Serializer"""
    user = UserSimpleSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)
    hospital = HospitalListSerializer(read_only=True)
    hospital_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = HospitalReview
        fields = [
            'id', 'user', 'user_id', 'hospital', 'hospital_id',
            'rating', 'content', 'images',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        validated_data.pop('user_id', None)
        
        # 후기 생성 후 병원 평점 업데이트
        review = super().create(validated_data)
        review.hospital.update_rating()
        
        return review
    
    def update(self, instance, validated_data):
        review = super().update(instance, validated_data)
        review.hospital.update_rating()
        return review