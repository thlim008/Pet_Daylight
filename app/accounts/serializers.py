from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSimpleSerializer(serializers.ModelSerializer):
    """사용자 간단 정보 Serializer (다른 모델에서 참조용)"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'profile_image']


class UserSerializer(serializers.ModelSerializer):
    """사용자 Serializer"""
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'phone_number',
            'profile_image', 'latitude', 'longitude',
            'notification_enabled', 'notification_distance',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'email': {'required': True},
            'password': {'write_only': True}
        }


class UserRegistrationSerializer(serializers.ModelSerializer):
    """회원가입 Serializer"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirm',
            'phone_number', 'profile_image'
        ]
    
    def validate(self, data):
        """비밀번호 확인"""
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("비밀번호가 일치하지 않습니다.")
        return data
    
    def create(self, validated_data):
        """사용자 생성"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """사용자 정보 수정 Serializer"""
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'phone_number', 'profile_image',
            'latitude', 'longitude', 
            'notification_enabled', 'notification_distance'
        ]