from rest_framework import serializers
from .models import MissingPet, Comment
from app.accounts.serializers import UserSimpleSerializer


class CommentSerializer(serializers.ModelSerializer):
    """댓글 Serializer"""
    user = UserSimpleSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = Comment
        fields = [
            'id', 'missing_pet', 'user', 'user_id',
            'content', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """댓글 생성 시 user_id를 user로 변환"""
        user = self.context['request'].user
        validated_data['user'] = user
        validated_data.pop('user_id', None)
        return super().create(validated_data)


class MissingPetSerializer(serializers.ModelSerializer):
    """실종/발견/구조 제보 Serializer"""
    user = UserSimpleSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)
    comments = CommentSerializer(many=True, read_only=True)
    comment_count = serializers.SerializerMethodField()
    distance = serializers.SerializerMethodField()
    
    class Meta:
        model = MissingPet
        fields = [
            'id', 'user', 'user_id', 'category', 'status',
            'species', 'breed', 'name', 'description',
            'images', 'latitude', 'longitude', 'address',
            'contact', 'occurred_at', 'views',
            'comments', 'comment_count', 'distance',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'views', 'created_at', 'updated_at']
    
    def get_comment_count(self, obj):
        """댓글 개수"""
        return obj.comments.count()
    
    def get_distance(self, obj):
        """현재 위치로부터의 거리 (km)"""
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            return None
        
        user = request.user
        if not user.is_authenticated or not user.latitude or not user.longitude:
            return None
        
        # Haversine 공식으로 거리 계산
        from math import radians, sin, cos, sqrt, atan2
        
        R = 6371  # 지구 반지름 (km)
        
        lat1 = radians(float(user.latitude))
        lon1 = radians(float(user.longitude))
        lat2 = radians(float(obj.latitude))
        lon2 = radians(float(obj.longitude))
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        distance = R * c
        
        return round(distance, 2)
    
    def create(self, validated_data):
        """제보 생성 시 user 자동 설정"""
        user = self.context['request'].user
        validated_data['user'] = user
        validated_data.pop('user_id', None)
        return super().create(validated_data)


class MissingPetListSerializer(serializers.ModelSerializer):
    """실종/발견/구조 제보 리스트용 Serializer (간단 버전)"""
    user = UserSimpleSerializer(read_only=True)
    comment_count = serializers.SerializerMethodField()
    distance = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    
    class Meta:
        model = MissingPet
        fields = [
            'id', 'user', 'category', 'status',
            'species', 'breed', 'name', 'thumbnail',
            'address', 'views', 'comment_count', 'distance',
            'occurred_at', 'created_at'
        ]
    
    def get_comment_count(self, obj):
        return obj.comments.count()
    
    def get_distance(self, obj):
        """거리 계산 (위와 동일)"""
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            return None
        
        user = request.user
        if not user.is_authenticated or not user.latitude or not user.longitude:
            return None
        
        from math import radians, sin, cos, sqrt, atan2
        
        R = 6371
        lat1 = radians(float(user.latitude))
        lon1 = radians(float(user.longitude))
        lat2 = radians(float(obj.latitude))
        lon2 = radians(float(obj.longitude))
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        distance = R * c
        
        return round(distance, 2)
    
    def get_thumbnail(self, obj):
        """첫 번째 이미지만 반환 (썸네일)"""
        if obj.images and len(obj.images) > 0:
            return obj.images[0]
        return None