from rest_framework import serializers
from .models import Community, CommunityComment, CommunityLike
from app.accounts.serializers import UserSimpleSerializer
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils import timezone
import os


class CommunityCommentSerializer(serializers.ModelSerializer):
    """커뮤니티 댓글 Serializer"""
    user = UserSimpleSerializer(read_only=True)
    
    class Meta:
        model = CommunityComment
        fields = [
            'id', 'community', 'user',
            'content', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class CommunitySerializer(serializers.ModelSerializer):
    """커뮤니티 게시글 Serializer"""
    user = UserSimpleSerializer(read_only=True)
    comments = CommunityCommentSerializer(many=True, read_only=True)
    comment_count = serializers.SerializerMethodField()
    likes = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Community
        fields = [
            'id', 'user', 'category',
            'title', 'content', 'images',
            'views', 'likes', 'is_liked',
            'comments', 'comment_count',
            'created_at', 'updated_at',
            'uploaded_images'
        ]
        read_only_fields = ['id', 'user', 'views', 'created_at', 'updated_at', 'images']
    
    def get_comment_count(self, obj):
        return obj.comments.count()
    
    def get_likes(self, obj):
        return obj.user_likes.count()
    
    def get_is_liked(self, obj):
        """현재 사용자가 좋아요 눌렀는지"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # 🔥 수정: user_likes는 CommunityLike 객체들이므로 user__id로 필터링
            return obj.user_likes.filter(user=request.user).exists()
        return False
    
    def create(self, validated_data):
        """게시글 생성 + 이미지 저장"""
        uploaded_images = validated_data.pop('uploaded_images', [])
        
        # 이미지 저장
        image_urls = []
        for index, image_file in enumerate(uploaded_images[:5]):  # 최대 5장
            ext = os.path.splitext(image_file.name)[1]
            timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
            filename = f'communities/{timestamp}_{index}{ext}'
            
            path = default_storage.save(filename, ContentFile(image_file.read()))
            image_url = default_storage.url(path)
            image_urls.append(image_url)
        
        validated_data['images'] = image_urls
        community = Community.objects.create(**validated_data)
        
        return community
    
    def update(self, instance, validated_data):
        """게시글 수정 + 이미지 처리"""
        uploaded_images = validated_data.pop('uploaded_images', [])
        
        # 기본 필드 업데이트
        for attr, value in validated_data.items():
            if attr != 'images':
                setattr(instance, attr, value)
        
        # 새 이미지가 있으면 기존 이미지에 추가
        if uploaded_images:
            existing_images = instance.images or []
            
            for index, image_file in enumerate(uploaded_images):
                if len(existing_images) >= 5:
                    break
                    
                ext = os.path.splitext(image_file.name)[1]
                timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
                filename = f'communities/{timestamp}_{len(existing_images)}{ext}'
                
                path = default_storage.save(filename, ContentFile(image_file.read()))
                image_url = default_storage.url(path)
                existing_images.append(image_url)
            
            instance.images = existing_images[:5]
        
        instance.save()
        return instance


class CommunityListSerializer(serializers.ModelSerializer):
    """커뮤니티 리스트용 Serializer (간단 버전)"""
    user = UserSimpleSerializer(read_only=True)
    comment_count = serializers.SerializerMethodField()
    likes = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    
    class Meta:
        model = Community
        fields = [
            'id', 'user', 'category', 'title',
            'thumbnail', 'views', 'likes', 'comment_count',
            'created_at'
        ]
    
    def get_comment_count(self, obj):
        return obj.comments.count()
    
    def get_likes(self, obj):
        return obj.user_likes.count()
    
    def get_thumbnail(self, obj):
        """첫 번째 이미지만 반환"""
        if obj.images and len(obj.images) > 0:
            return obj.images[0]
        return None