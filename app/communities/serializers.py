from rest_framework import serializers
from .models import Community, CommunityComment, CommunityLike
from app.accounts.serializers import UserSimpleSerializer


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
    
    class Meta:
        model = Community
        fields = [
            'id', 'user', 'category',
            'title', 'content', 'images',
            'views', 'likes', 'is_liked',
            'comments', 'comment_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'views', 'created_at', 'updated_at']
    
    def get_comment_count(self, obj):
        return obj.comments.count()
    
    def get_likes(self, obj):
        return obj.user_likes.count()
    
    def get_is_liked(self, obj):
        """현재 사용자가 좋아요 눌렀는지"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.user_likes.filter(user=request.user).exists()
        return False


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