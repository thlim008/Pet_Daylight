from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.db.models import Q
from .models import MissingPet, Comment
from .serializers import MissingPetListSerializer, MissingPetDetailSerializer, MissingPetCreateSerializer, MissingPetUpdateSerializer, CommentSerializer
from app.notifications.models import Notification


class MissingPetViewSet(viewsets.ModelViewSet):
    """실종 제보 ViewSet"""
    permission_classes = [IsAuthenticated]
    serializer_class = MissingPetListSerializer

    def get_serializer_class(self):
        """액션에 따라 다른 Serializer 사용"""
        if self.action == 'create':
            return MissingPetCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return MissingPetUpdateSerializer
        elif self.action == 'retrieve':
            return MissingPetDetailSerializer
        return MissingPetListSerializer

    def get_queryset(self):
        """필터링 + 검색"""
        queryset = MissingPet.objects.select_related('user').prefetch_related('comments').all()

        # 내가 작성한 제보만 보기
        my_reports = self.request.query_params.get('my_reports')
        print(f"🔍 my_reports 파라미터: {my_reports}")
        print(f"🔍 현재 유저: {self.request.user}")
        
        if my_reports:
            print(f"🔍 필터링 전 전체 제보: {queryset.count()}개")
            queryset = queryset.filter(user=self.request.user)
            print(f"🔍 필터링 후 내 제보: {queryset.count()}개")
            return queryset.order_by('-created_at')

        # 필터
        category = self.request.query_params.get('category')
        species = self.request.query_params.get('species')
        status_filter = self.request.query_params.get('status')

        if category:
            queryset = queryset.filter(category=category)
        if species:
            queryset = queryset.filter(species=species)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # 검색
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(pet_name__icontains=search) |
                Q(breed__icontains=search) |
                Q(location__icontains=search) |
                Q(description__icontains=search)
            )

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        """실종 제보 생성 시 사용자 자동 설정"""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def update_status(self, request, pk=None):
        """제보 상태 업데이트"""
        missing_pet = self.get_object()
        
        # 작성자만 수정 가능
        if missing_pet.user != request.user:
            return Response(
                {'error': '권한이 없습니다.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        new_status = request.data.get('status')
        
        if new_status not in ['active', 'resolved', 'closed']:
            return Response(
                {'error': '잘못된 상태값입니다.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        missing_pet.status = new_status
        missing_pet.save()
        
        serializer = self.get_serializer(missing_pet)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def generate_qr(self, request, pk=None):
        """QR 코드 생성"""
        from .utils import generate_qr_code
        
        missing_pet = self.get_object()
        
        # 작성자만 생성 가능
        if missing_pet.user != request.user:
            return Response(
                {'error': '권한이 없습니다.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            qr_url = generate_qr_code(missing_pet)
            missing_pet.qr_code = qr_url
            missing_pet.save()
            
            return Response({
                'qr_code': qr_url,
                'message': 'QR 코드가 생성되었습니다.'
            })
        except Exception as e:
            return Response(
                {'error': f'QR 코드 생성 실패: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def generate_poster(self, request, pk=None):
        """포스터 PDF 생성"""
        from .utils import generate_poster_pdf
        
        missing_pet = self.get_object()
        
        # 작성자만 생성 가능
        if missing_pet.user != request.user:
            return Response(
                {'error': '권한이 없습니다.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            pdf_url = generate_poster_pdf(missing_pet)
            missing_pet.poster_pdf = pdf_url
            missing_pet.save()
            
            return Response({
                'poster_pdf': pdf_url,
                'message': 'PDF 포스터가 생성되었습니다.'
            })
        except Exception as e:
            return Response(
                {'error': f'PDF 생성 실패: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CommentViewSet(viewsets.ModelViewSet):
    """댓글 ViewSet"""
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """필터링된 queryset 반환"""
        queryset = Comment.objects.select_related('user', 'missing_pet').all()
        
        # 내가 쓴 댓글만 보기
        my_comments = self.request.query_params.get('my_comments')
        if my_comments:
            queryset = queryset.filter(user=self.request.user)
            return queryset.order_by('-created_at')
        
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        """댓글 작성 시 사용자 자동 설정 + 알림 생성"""
        comment = serializer.save(user=self.request.user)

        # 알림 생성 (댓글 작성자와 게시글 작성자가 다를 때만)
        if comment.missing_pet.user != self.request.user:
            Notification.objects.create(
                user=comment.missing_pet.user,
                type='comment',
                title='새 댓글',
                message=f'{self.request.user.username}님이 회원님의 제보에 댓글을 남겼습니다.',
                link=f'/missing-pets/{comment.missing_pet.id}'
            )
    
    def create(self, request, *args, **kwargs):
        """댓글 생성 - 명시적으로 201 상태 반환"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)