from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from django.db.models import Q, F
from .models import MissingPet, Comment
from .serializers import MissingPetListSerializer, MissingPetDetailSerializer, MissingPetCreateSerializer, MissingPetUpdateSerializer, CommentSerializer
from app.notifications.models import Notification
from app.accounts.models import User
import math


CATEGORY_LABELS = {'missing': '실종', 'found': '발견', 'rescue': '구조'}


def calculate_distance(lat1, lon1, lat2, lon2):
    """두 지점 간 거리 계산 (Haversine formula) - 미터 단위"""
    R = 6371000
    lat1_rad, lat2_rad = math.radians(lat1), math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def notify_nearby_users(missing_pet):
    """새 제보 발생 시 반경 내 알림 설정된 사용자들에게 알림 생성"""
    if missing_pet.latitude is None or missing_pet.longitude is None:
        return

    candidates = User.objects.filter(
        notification_enabled=True,
        latitude__isnull=False,
        longitude__isnull=False,
    ).exclude(id=missing_pet.user_id)

    label = CATEGORY_LABELS.get(missing_pet.category, '제보')
    notifications = []
    for user in candidates:
        distance = calculate_distance(
            float(user.latitude), float(user.longitude),
            float(missing_pet.latitude), float(missing_pet.longitude)
        )
        if distance <= user.notification_distance:
            notifications.append(Notification(
                user=user,
                type='new_report',
                title=f'주변 {label} 제보',
                message=f'내 주변에 {label} 반려동물 제보가 등록되었습니다: {missing_pet.name}',
                missing_pet=missing_pet,
                link=f'/missing-pets/{missing_pet.id}'
            ))

    if notifications:
        Notification.objects.bulk_create(notifications)


class MissingPetViewSet(viewsets.ModelViewSet):
    """실종 제보 ViewSet"""
    permission_classes = [IsAuthenticated]
    serializer_class = MissingPetListSerializer

    def get_permissions(self):
        """QR코드로 들어오는 상세 조회는 비로그인 사용자도 볼 수 있어야 함"""
        if self.action == 'retrieve':
            return [AllowAny()]
        return super().get_permissions()

    def get_serializer_class(self):
        """액션에 따라 다른 Serializer 사용"""
        if self.action == 'create':
            return MissingPetCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return MissingPetUpdateSerializer
        elif self.action == 'retrieve':
            return MissingPetDetailSerializer
        return MissingPetListSerializer

    def retrieve(self, request, *args, **kwargs):
        """제보 상세 조회 시 조회수 증가"""
        instance = self.get_object()
        MissingPet.objects.filter(pk=instance.pk).update(views=F('views') + 1)
        instance.refresh_from_db(fields=['views'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

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
                Q(name__icontains=search) |
                Q(breed__icontains=search) |
                Q(address__icontains=search) |
                Q(description__icontains=search)
            )

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        """실종 제보 생성 시 사용자 자동 설정 + 주변 사용자 알림"""
        missing_pet = serializer.save(user=self.request.user)
        notify_nearby_users(missing_pet)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if not (request.user.is_staff or obj.user == request.user):
            return Response({'error': '작성자만 수정할 수 있습니다.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if not (request.user.is_staff or obj.user == request.user):
            return Response({'error': '작성자만 수정할 수 있습니다.'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if not (request.user.is_staff or obj.user == request.user):
            return Response({'error': '작성자만 삭제할 수 있습니다.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated])
    def update_status(self, request, pk=None):
        """제보 상태 업데이트"""
        missing_pet = self.get_object()

        # 작성자 또는 관리자만 수정 가능
        if missing_pet.user != request.user and not request.user.is_staff:
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
        
        was_active = missing_pet.status == 'active'
        missing_pet.status = new_status
        missing_pet.save()

        # 진행중 -> 해결로 바뀌었을 때, 댓글 남긴 사람들에게 알림 (작성자 본인 제외)
        if was_active and new_status == 'resolved':
            notify_users = (
                Comment.objects.filter(missing_pet=missing_pet)
                .exclude(user=missing_pet.user)
                .values_list('user', flat=True)
                .distinct()
            )
            notifications = [
                Notification(
                    user_id=user_id,
                    type='resolved',
                    title='제보가 해결되었습니다',
                    message=f'댓글을 남기셨던 "{missing_pet.name}" 제보가 해결되었습니다.',
                    missing_pet=missing_pet,
                    link=f'/missing-pets/{missing_pet.id}'
                )
                for user_id in notify_users
            ]
            if notifications:
                Notification.objects.bulk_create(notifications)

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

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if not (request.user.is_staff or obj.user == request.user):
            return Response({'error': '작성자만 수정할 수 있습니다.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if not (request.user.is_staff or obj.user == request.user):
            return Response({'error': '작성자만 수정할 수 있습니다.'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if not (request.user.is_staff or obj.user == request.user):
            return Response({'error': '작성자만 삭제할 수 있습니다.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        """댓글 작성 시 사용자 자동 설정 + 알림 생성"""
        comment = serializer.save(user=self.request.user)

        # 알림 생성 (댓글 작성자와 게시글 작성자가 다를 때만)
        if comment.missing_pet.user != self.request.user:
            Notification.objects.create(
                user=comment.missing_pet.user,
                type='comment',
                title='새 댓글',
                message=f'{self.request.user.display_name}님이 회원님의 제보에 댓글을 남겼습니다.',
                missing_pet=comment.missing_pet,
                link=f'/missing-pets/{comment.missing_pet.id}'
            )
    
    def create(self, request, *args, **kwargs):
        """댓글 생성 - 명시적으로 201 상태 반환"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)