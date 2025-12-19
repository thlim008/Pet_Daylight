from rest_framework import serializers
from .models import LifecycleGuide, Pet
from app.accounts.serializers import UserSimpleSerializer


class LifecycleGuideSerializer(serializers.ModelSerializer):
    """생애주기 가이드 Serializer"""
    
    class Meta:
        model = LifecycleGuide
        fields = [
            'id', 'stage', 'title', 'description',
            'content', 'checklist', 'image', 'order',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PetSerializer(serializers.ModelSerializer):
    """반려동물 프로필 Serializer"""
    user = UserSimpleSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)
    age_in_years = serializers.ReadOnlyField()
    
    class Meta:
        model = Pet
        fields = [
            'id', 'user', 'user_id', 'name', 'species', 'breed',
            'gender', 'birth_date', 'adoption_date', 'weight',
            'profile_image', 'notes', 'is_active', 'age_in_years',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'age_in_years', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        validated_data.pop('user_id', None)
        return super().create(validated_data)


class PetListSerializer(serializers.ModelSerializer):
    """반려동물 리스트용 Serializer (간단 버전)"""
    age_in_years = serializers.ReadOnlyField()
    
    class Meta:
        model = Pet
        fields = [
            'id', 'name', 'species', 'breed',
            'profile_image', 'age_in_years', 'is_active'
        ]