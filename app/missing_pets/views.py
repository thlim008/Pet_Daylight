from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import MissingPet, Comment
from .serializers import (
    MissingPetListSerializer,
    MissingPetDetailSerializer,
    MissingPetCreateSerializer,
    CommentSerializer,
)
from app.notifications.models import Notification
from .utils import generate_qr_code, generate_poster_pdf  # 🔥 추가!


class MissingPetViewSet(viewsets.ModelViewSet):
    """실종 제보 ViewSet"""
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """필터링 + 검색"""
        queryset = MissingPet.objects.select_related('user').prefetch_related('comments').all()
        
        # 필터
        category = self.request.query_params.get('category')
        species = self.request.query_params.get('species')
        status_filter = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        
        if category:
            queryset = queryset.filter(category=category)
        if species:
            queryset = queryset.filter(species=species)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(breed__icontains=search) |
                Q(address__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        """액션별 Serializer 선택"""
        if self.action == 'list':
            return MissingPetListSerializer
        elif self.action == 'create':
            return MissingPetCreateSerializer
        return MissingPetDetailSerializer
    
    def perform_create(self, serializer):
        """제보 생성 시 사용자 자동 설정"""
        serializer.save(user=self.request.user)
    
    def retrieve(self, request, *args, **kwargs):
        """조회수 증가"""
        instance = self.get_object()
        instance.views += 1
        instance.save(update_fields=['views'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """제보 수정"""
        instance = self.get_object()
        
        # 권한 확인
        if instance.user != request.user:
            return Response(
                {'error': '권한이 없습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """제보 삭제"""
        instance = self.get_object()
        
        # 권한 확인
        if instance.user != request.user:
            return Response(
                {'error': '권한이 없습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """상태 변경"""
        instance = self.get_object()
        
        # 권한 확인
        if instance.user != request.user:
            return Response(
                {'error': '권한이 없습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        new_status = request.data.get('status')
        
        if new_status not in ['active', 'resolved', 'closed']:
            return Response(
                {'error': '유효하지 않은 상태입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        old_status = instance.status
        instance.status = new_status
        instance.save()
        
        # 상태가 해결됨으로 변경되면 댓글 작성자들에게 알림
        if new_status == 'resolved' and old_status != 'resolved':
            # 댓글 작성자 목록 (중복 제거, 본인 제외)
            commenters = instance.comments.exclude(user=request.user).values_list('user', flat=True).distinct()
            
            for user_id in commenters:
                Notification.objects.create(
                    user_id=user_id,
                    type='resolved',
                    title='제보가 해결되었습니다',
                    message=f'"{instance.name}" 제보가 해결되었습니다!',
                    missing_pet=instance
                )
            
            print(f"🔔 해결 알림 생성: {len(commenters)}명에게")
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    # 🔥 QR코드 생성
    @action(detail=True, methods=['post'])
    def generate_qr(self, request, pk=None):
        """
        QR코드 생성
        POST /api/missing-pets/{id}/generate_qr/
        
        Response:
        {
            "qr_url": "/media/qr_codes/missing_pet_123.png",
            "full_url": "http://localhost:8000/media/qr_codes/missing_pet_123.png"
        }
        """
        instance = self.get_object()
        
        try:
            qr_url = generate_qr_code(instance)
            full_url = request.build_absolute_uri(qr_url)
            
            return Response({
                'qr_url': qr_url,
                'full_url': full_url,
                'message': 'QR코드가 생성되었습니다.'
            })
        except Exception as e:
            return Response(
                {'error': f'QR코드 생성 실패: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # 🔥 포스터 PDF 생성
    @action(detail=True, methods=['post'])
    def generate_poster(self, request, pk=None):
        """
        포스터 PDF 생성
        POST /api/missing-pets/{id}/generate_poster/
        
        Response:
        {
            "pdf_url": "/media/posters/missing_pet_123.pdf",
            "full_url": "http://localhost:8000/media/posters/missing_pet_123.pdf"
        }
        """
        instance = self.get_object()
        
        try:
            pdf_url = generate_poster_pdf(instance)
            full_url = request.build_absolute_uri(pdf_url)
            
            return Response({
                'pdf_url': pdf_url,
                'full_url': full_url,
                'message': '포스터가 생성되었습니다.'
            })
        except Exception as e:
            return Response(
                {'error': f'포스터 생성 실패: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CommentViewSet(viewsets.ModelViewSet):
    """댓글 ViewSet"""
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        """댓글 작성 시 사용자 자동 설정 + 알림 생성"""
        comment = serializer.save(user=self.request.user)
        
        # 알림 생성 (댓글 작성자와 게시글 작성자가 다를 때만)
        if comment.user != comment.missing_pet.user:
            Notification.objects.create(
                user=comment.missing_pet.user,
                type='comment',
                title='새 댓글이 달렸습니다',
                message=f'{comment.user.display_name}님이 "{comment.missing_pet.name}" 제보에 댓글을 남겼습니다.',
                missing_pet=comment.missing_pet
            )
            print(f"🔔 댓글 알림 생성: {comment.missing_pet.user.username}에게")
    
    def destroy(self, request, *args, **kwargs):
        """댓글 삭제 권한 확인"""
        instance = self.get_object()
        
        if instance.user != request.user:
            return Response(
                {'error': '권한이 없습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().destroy(request, *args, **kwargs)