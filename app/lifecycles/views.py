from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.utils import timezone
from .models import LifecycleGuide, Pet, UserChecklistProgress
from .serializers import (
    LifecycleGuideSerializer,
    PetSerializer,
    PetListSerializer,
    UserChecklistProgressSerializer
)


class LifecycleGuideViewSet(viewsets.ReadOnlyModelViewSet):
    """생애주기 가이드 ViewSet (읽기 전용)"""
    queryset = LifecycleGuide.objects.all()
    serializer_class = LifecycleGuideSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    ordering = ['species', 'order']
    
    def get_queryset(self):
        """필터링된 queryset 반환"""
        queryset = LifecycleGuide.objects.all()
        
        # 종류별 필터 (dog, cat, other)
        species = self.request.query_params.get('species', None)
        if species:
            queryset = queryset.filter(species=species)
        
        # 단계별 필터
        stage = self.request.query_params.get('stage', None)
        if stage:
            queryset = queryset.filter(stage=stage)
        
        return queryset.order_by('species', 'order')
    
    @action(detail=False, methods=['get'])
    def stages(self, request):
        """
        생애주기 단계 목록
        GET /api/lifecycles/guides/stages/
        """
        stages = [
            {'value': 'adoption', 'label': '입양 준비'},
            {'value': 'puppy', 'label': '육아'},
            {'value': 'health', 'label': '건강관리'},
            {'value': 'senior', 'label': '노령 케어'},
            {'value': 'farewell', 'label': '이별/장례'},
        ]
        return Response(stages)
    
    @action(detail=False, methods=['get'])
    def species_list(self, request):
        """
        반려동물 종류 목록
        GET /api/lifecycles/guides/species_list/
        """
        species = [
            {'value': 'dog', 'label': '강아지', 'emoji': '🐕'},
            {'value': 'cat', 'label': '고양이', 'emoji': '🐱'},
            {'value': 'other', 'label': '기타', 'emoji': '🐾'},
        ]
        return Response(species)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def toggle_checklist(self, request, pk=None):
        """
        체크리스트 항목 토글 (완료/미완료)
        POST /api/lifecycles/guides/{id}/toggle_checklist/
        Body: { "checklist_item": "항목 내용" }
        """
        guide = self.get_object()
        checklist_item = request.data.get('checklist_item')
        
        if not checklist_item:
            return Response(
                {'error': 'checklist_item이 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 해당 항목이 가이드의 checklist에 있는지 확인
        if checklist_item not in guide.checklist:
            return Response(
                {'error': '유효하지 않은 체크리스트 항목입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 기존 진행상황 조회 또는 생성
        progress, created = UserChecklistProgress.objects.get_or_create(
            user=request.user,
            guide=guide,
            checklist_item=checklist_item,
            defaults={'is_completed': True, 'completed_at': timezone.now()}
        )
        
        # 이미 있으면 토글
        if not created:
            progress.is_completed = not progress.is_completed
            progress.completed_at = timezone.now() if progress.is_completed else None
            progress.save()
        
        return Response({
            'checklist_item': checklist_item,
            'is_completed': progress.is_completed,
            'completed_at': progress.completed_at
        })


class PetViewSet(viewsets.ModelViewSet):
    """반려동물 프로필 ViewSet"""
    queryset = Pet.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'breed']
    ordering_fields = ['created_at', 'birth_date']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """액션별 Serializer 선택"""
        if self.action == 'list':
            return PetListSerializer
        return PetSerializer
    
    def get_queryset(self):
        """본인의 반려동물만 조회"""
        queryset = Pet.objects.filter(user=self.request.user)
        
        # 활성 상태 필터
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # 종류 필터
        species = self.request.query_params.get('species', None)
        if species:
            queryset = queryset.filter(species=species)
        
        return queryset
    
    def perform_create(self, serializer):
        """반려동물 생성 시 user 자동 설정"""
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        """본인의 반려동물만 수정 가능"""
        if serializer.instance.user != self.request.user:
            return Response(
                {'error': '본인의 반려동물만 수정할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer.save()
    
    def perform_destroy(self, instance):
        """본인의 반려동물만 삭제 가능"""
        if instance.user != self.request.user:
            return Response(
                {'error': '본인의 반려동물만 삭제할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        instance.delete()
    
    @action(detail=True, methods=['patch'])
    def deactivate(self, request, pk=None):
        """
        반려동물 비활성화 (무지개다리)
        PATCH /api/pets/{id}/deactivate/
        """
        pet = self.get_object()
        
        if pet.user != request.user:
            return Response(
                {'error': '본인의 반려동물만 수정할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        pet.is_active = False
        pet.save()
        
        return Response({
            'message': f'{pet.name}의 프로필이 비활성화되었습니다.',
            'is_active': pet.is_active
        })