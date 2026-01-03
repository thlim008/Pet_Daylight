"""
accounts/serializers.py - 완성본
기존 파일을 이것으로 완전히 교체하세요!
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.conf import settings

User = get_user_model()


# ==========================================
# 기본 사용자 Serializers
# ==========================================

class UserSimpleSerializer(serializers.ModelSerializer):
    """사용자 간단 정보 Serializer (다른 모델에서 참조용)"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'nickname', 'profile_image', 'profile_image_url']


class UserSerializer(serializers.ModelSerializer):
    """사용자 Serializer"""
    display_name = serializers.ReadOnlyField()
    display_image = serializers.ReadOnlyField()
    
    # 🔥 소셜 로그인 정보 추가
    is_social_account = serializers.SerializerMethodField()
    social_providers = serializers.SerializerMethodField()
    can_change_password = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'nickname', 'display_name',
            'email', 'phone_number',
            'profile_image', 'profile_image_url', 'display_image',
            'latitude', 'longitude',
            'notification_enabled', 'notification_distance',
            'is_social_account', 'social_providers', 'can_change_password',  # 추가
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'username', 'created_at', 'updated_at', 
            'display_name', 'display_image',
            'is_social_account', 'social_providers', 'can_change_password'  # 추가
        ]
    
    def get_is_social_account(self, obj):
        """소셜 로그인 계정인지 확인"""
        return not obj.has_usable_password()
    
    def get_social_providers(self, obj):
        """연결된 소셜 로그인 제공자 목록"""
        social_accounts = obj.socialaccount_set.all()
        return [acc.provider for acc in social_accounts]
    
    def get_can_change_password(self, obj):
        """비밀번호 변경 가능 여부"""
        return obj.has_usable_password()


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
            'nickname', 'email', 'phone_number', 'profile_image',
            'latitude', 'longitude', 
            'notification_enabled', 'notification_distance'
        ]


# ==========================================
# 비밀번호 재설정 Serializers
# ==========================================

class PasswordResetRequestSerializer(serializers.Serializer):
    """비밀번호 재설정 요청 (이메일 입력)"""
    email = serializers.EmailField()
    
    def validate_email(self, value):
        """이메일이 존재하는지 확인"""
        user = User.objects.filter(email=value).first()
        if not user:
            raise serializers.ValidationError("해당 이메일로 가입된 계정이 없습니다.")
        
        
        # 🔥 소셜 로그인 계정 체크
        if not user.has_usable_password():
            # 소셜 로그인 제공자 확인
            social_accounts = user.socialaccount_set.all()
            if social_accounts.exists():
                providers = ', '.join([acc.provider.upper() for acc in social_accounts])
                raise serializers.ValidationError(
                    f"이 계정은 {providers} 소셜 로그인으로 가입되었습니다. "
                    f"비밀번호 재설정이 불가능합니다. {providers} 로그인을 이용해주세요."
                )
            else:
                raise serializers.ValidationError(
                    "이 계정은 소셜 로그인으로 가입되었습니다. "
                    "비밀번호 재설정이 불가능합니다."
                )
        
        return value
    
    def save(self):
        """비밀번호 재설정 이메일 발송"""
        email = self.validated_data['email']
        user = User.objects.filter(email=email).first()
        
        # 토큰 생성
        token_generator = PasswordResetTokenGenerator()
        token = token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # 재설정 링크 생성
        reset_url = f"https://petdaylight.mooo.com/password-reset/confirm/{uid}/{token}/"
        
        # 이메일 발송
        subject = '[Pet Daylight] 비밀번호 재설정 요청'
        message = f"""
안녕하세요, {user.display_name}님!

비밀번호 재설정을 요청하셨습니다.
아래 링크를 클릭하여 새로운 비밀번호를 설정해주세요.

{reset_url}

이 링크는 24시간 동안 유효합니다.
본인이 요청하지 않았다면 이 이메일을 무시하셔도 됩니다.

감사합니다.
Pet Daylight 팀
        """
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            return True
        except Exception as e:
            raise serializers.ValidationError(f"이메일 발송 실패: {str(e)}")


class PasswordResetConfirmSerializer(serializers.Serializer):
    """비밀번호 재설정 확인 (새 비밀번호 입력)"""
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8, write_only=True)
    new_password_confirm = serializers.CharField(min_length=8, write_only=True)
    
    def validate(self, data):
        """유효성 검사"""
        # 1. 비밀번호 확인
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': '비밀번호가 일치하지 않습니다.'
            })
        
        # 2. UID 디코딩
        try:
            uid = force_str(urlsafe_base64_decode(data['uid']))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({
                'uid': '유효하지 않은 링크입니다.'
            })
        
        # 🔥 소셜 로그인 계정 체크
        if not user.has_usable_password():
            social_accounts = user.socialaccount_set.all()
            if social_accounts.exists():
                providers = ', '.join([acc.provider.upper() for acc in social_accounts])
                raise serializers.ValidationError(
                    f"이 계정은 {providers} 소셜 로그인으로 가입되었습니다. "
                    f"비밀번호를 설정할 수 없습니다."
                )
        
        # 3. 토큰 검증
        token_generator = PasswordResetTokenGenerator()
        if not token_generator.check_token(user, data['token']):
            raise serializers.ValidationError({
                'token': '만료되었거나 유효하지 않은 링크입니다.'
            })
        
        data['user'] = user
        return data
    
    def save(self):
        """비밀번호 변경"""
        user = self.validated_data['user']
        new_password = self.validated_data['new_password']
        
        user.set_password(new_password)
        user.save()
        
        return user


class PasswordChangeSerializer(serializers.Serializer):
    """로그인 상태에서 비밀번호 변경"""
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)
    new_password_confirm = serializers.CharField(min_length=8, write_only=True)
    
    def validate(self, data):
        """유효성 검사"""
        user = self.context['request'].user
        
        # 🔥 소셜 로그인 계정 체크
        if not user.has_usable_password():
            social_accounts = user.socialaccount_set.all()
            if social_accounts.exists():
                providers = ', '.join([acc.provider.upper() for acc in social_accounts])
                raise serializers.ValidationError(
                    f"소셜 로그인({providers}) 계정은 비밀번호를 변경할 수 없습니다."
                )
            else:
                raise serializers.ValidationError(
                    "소셜 로그인 계정은 비밀번호를 변경할 수 없습니다."
                )
        
        # 현재 비밀번호 확인
        if not user.check_password(data['current_password']):
            raise serializers.ValidationError({
                'current_password': '현재 비밀번호가 일치하지 않습니다.'
            })
        
        # 새 비밀번호 확인
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': '비밀번호가 일치하지 않습니다.'
            })
        
        return data
    
    def save(self):
        """비밀번호 변경"""
        user = self.context['request'].user
        new_password = self.validated_data['new_password']
        
        user.set_password(new_password)
        user.save()
        
        return user
