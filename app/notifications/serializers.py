from rest_framework import serializers
from .models import Notification
from app.accounts.serializers import UserSimpleSerializer


class NotificationSerializer(serializers.ModelSerializer):
    """알림 Serializer"""
    user = UserSimpleSerializer(read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'type', 'title', 'message',
            'missing_pet', 'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']