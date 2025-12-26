from rest_framework import serializers
from .models import MissingPet, Comment
from app.accounts.serializers import UserSimpleSerializer
from django.utils import timezone
from datetime import datetime
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os


class CommentSerializer(serializers.ModelSerializer):
    """댓글 Serializer"""
    user = UserSimpleSerializer(read_only=True)
    
    class Meta:
        model = Comment
        fields = ['id', 'missing_pet', 'user', 'content', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class MissingPetListSerializer(serializers.ModelSerializer):
    """제보 목록 Serializer"""
    user = UserSimpleSerializer(read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    species_display = serializers.CharField(source='get_species_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    thumbnail = serializers.SerializerMethodField()
    
    class Meta:
        model = MissingPet
        fields = [
            'id', 'user', 'category', 'category_display',
            'species', 'species_display', 'name', 'breed',
            'address', 'latitude', 'longitude',  # ← 추가!
            'occurred_at', 'status', 'status_display',
            'thumbnail', 'views', 'created_at'
        ]
    
    def get_thumbnail(self, obj):
        """첫 번째 이미지를 썸네일로 반환"""
        if obj.images and len(obj.images) > 0:
            # 상대 경로면 절대 URL로 변환
            image_url = obj.images[0]
            if image_url.startswith('/media/'):
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(image_url)
            return image_url
        return None


class MissingPetDetailSerializer(serializers.ModelSerializer):
    """제보 상세 Serializer"""
    user = UserSimpleSerializer(read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    species_display = serializers.CharField(source='get_species_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    images_full_url = serializers.SerializerMethodField()
    
    class Meta:
        model = MissingPet
        fields = '__all__'
        read_only_fields = ['id', 'user', 'views', 'created_at', 'updated_at']
    
    def get_images_full_url(self, obj):
        """이미지 URL을 절대 경로로 변환"""
        if not obj.images:
            return []
        
        request = self.context.get('request')
        full_urls = []
        
        for image_url in obj.images:
            if image_url.startswith('/media/'):
                if request:
                    full_urls.append(request.build_absolute_uri(image_url))
                else:
                    full_urls.append(image_url)
            else:
                full_urls.append(image_url)
        
        return full_urls


class MissingPetCreateSerializer(serializers.ModelSerializer):
    """제보 생성 Serializer"""
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = MissingPet
        fields = [
            'category', 'species', 'breed', 'name', 'description',
            'latitude', 'longitude', 'address', 'occurred_at',
            'contact', 'uploaded_images'
        ]
    
    def validate_occurred_at(self, value):
        """날짜 문자열을 datetime으로 변환"""
        if isinstance(value, str):
            try:
                dt = datetime.strptime(value, '%Y-%m-%d')
                now = timezone.now()
                dt = dt.replace(hour=now.hour, minute=now.minute, second=now.second)
                return timezone.make_aware(dt) if timezone.is_naive(dt) else dt
            except ValueError:
                return timezone.now()
        return value
    
    def create(self, validated_data):
        """제보 생성 + 이미지 실제 저장"""
        uploaded_images = validated_data.pop('uploaded_images', [])
        
        # 기본값 설정
        if 'occurred_at' not in validated_data or validated_data['occurred_at'] is None:
            validated_data['occurred_at'] = timezone.now()
        
        # 이미지 저장
        image_urls = []
        for index, image_file in enumerate(uploaded_images[:5]):  # 최대 5장
            # 파일명 생성 (고유하게)
            ext = os.path.splitext(image_file.name)[1]
            timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
            filename = f'missing_pets/{timestamp}_{index}{ext}'
            
            # 파일 저장
            path = default_storage.save(filename, ContentFile(image_file.read()))
            
            # URL 저장 (상대 경로)
            image_url = f'/media/{path}'
            image_urls.append(image_url)
        
        validated_data['images'] = image_urls
        missing_pet = MissingPet.objects.create(**validated_data)
        
        return missing_pet
    
    def to_representation(self, instance):
        """응답 시 상세 정보 포함"""
        return MissingPetDetailSerializer(instance, context=self.context).data


class MissingPetUpdateSerializer(serializers.ModelSerializer):
    """제보 수정 Serializer"""
    
    class Meta:
        model = MissingPet
        fields = [
            'category', 'species', 'breed', 'name', 'description',
            'latitude', 'longitude', 'address', 'occurred_at',
            'contact', 'status'
        ]
    
    def validate_occurred_at(self, value):
        """날짜 문자열을 datetime으로 변환"""
        if isinstance(value, str):
            try:
                dt = datetime.strptime(value, '%Y-%m-%d')
                now = timezone.now()
                dt = dt.replace(hour=now.hour, minute=now.minute, second=now.second)
                return timezone.make_aware(dt) if timezone.is_naive(dt) else dt
            except ValueError:
                raise serializers.ValidationError("날짜 형식이 올바르지 않습니다.")
        return value