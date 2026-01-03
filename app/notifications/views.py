from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """알림 ViewSet (읽기 전용 + 읽음 처리)"""
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-created_at']
    
    def get_queryset(self):
        """본인의 알림만 조회"""
        queryset = Notification.objects.filter(user=self.request.user)
        queryset = queryset.select_related('user', 'missing_pet')
        
        # 읽음 여부 필터
        is_read = self.request.query_params.get('is_read', None)
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        
        # 알림 타입 필터
        notification_type = self.request.query_params.get('type', None)
        if notification_type:
            queryset = queryset.filter(type=notification_type)
        
        return queryset
    
    @action(detail=True, methods=['patch'])
    def mark_as_read(self, request, pk=None):
        """
        알림 읽음 처리
        PATCH /api/notifications/{id}/mark_as_read/
        """
        notification = self.get_object()
        
        if notification.user != request.user:
            return Response(
                {'error': '본인의 알림만 수정할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        notification.mark_as_read()
        
        return Response({
            'message': '알림을 읽음 처리했습니다.',
            'is_read': notification.is_read
        })
    
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """
        모든 알림 읽음 처리
        POST /api/notifications/mark_all_as_read/
        """
        updated_count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True)
        
        return Response({
            'message': f'{updated_count}개의 알림을 읽음 처리했습니다.',
            'count': updated_count
        })
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """
        읽지 않은 알림 개수
        GET /api/notifications/unread_count/
        """
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        
        return Response({
            'unread_count': count
        })
    
    @action(detail=False, methods=['delete'])
    def clear_all(self, request):
        """
        모든 알림 삭제
        DELETE /api/notifications/clear_all/
        """
        deleted_count, _ = Notification.objects.filter(
            user=request.user
        ).delete()
        
        return Response({
            'message': f'{deleted_count}개의 알림을 삭제했습니다.',
            'count': deleted_count
        })