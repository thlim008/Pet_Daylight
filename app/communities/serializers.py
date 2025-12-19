from rest_framework import serializers
from .models import Community, CommunityComment
from app.accounts.serializers import UserSimpleSerializer


class CommunityCommentSerializer(serializers.ModelSerializer):
    """커뮤니티 댓글 Serializer"""
    user = UserSimpleSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = CommunityComment
        fields = [
            'id', 'community', 'user', 'user_id',
            'content', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        validated_data.pop('user_id', None)
        return super().create(validated_data)


class CommunitySerializer(serializers.ModelSerializer):
    """커뮤니티 게시글 Serializer"""
    user = UserSimpleSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)
    comments = CommunityCommentSerializer(many=True, read_only=True)
    comment_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Community
        fields = [
            'id', 'user', 'user_id', 'category',
            'title', 'content', 'images',
            'views', 'likes', 'comments', 'comment_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'views', 'likes', 'created_at', 'updated_at']
    
    def get_comment_count(self, obj):
        return obj.comments.count()
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        validated_data.pop('user_id', None)
        return super().create(validated_data)


class CommunityListSerializer(serializers.ModelSerializer):
    """커뮤니티 리스트용 Serializer (간단 버전)"""
    user = UserSimpleSerializer(read_only=True)
    comment_count = serializers.SerializerMethodField()
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
    
    def get_thumbnail(self, obj):
        """첫 번째 이미지만 반환"""
        if obj.images and len(obj.images) > 0:
            return obj.images[0]
        return None