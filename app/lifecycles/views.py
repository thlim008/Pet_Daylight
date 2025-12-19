from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from .models import LifecycleGuide, Pet
from .serializers import (
    LifecycleGuideSerializer,
    PetSerializer,
    PetListSerializer
)


class LifecycleGuideViewSet(viewsets.ReadOnlyModelViewSet):
    """생애주기 가이드 ViewSet (읽기 전용)"""
    queryset = LifecycleGuide.objects.all()
    serializer_class = LifecycleGuideSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    ordering = ['order']
    
    def get_queryset(self):
        """필터링된 queryset 반환"""
        queryset = LifecycleGuide.objects.all()
        
        # 단계별 필터
        stage = self.request.query_params.get('stage', None)
        if stage:
            queryset = queryset.filter(stage=stage)
        
        return queryset.order_by('order')
    
    @action(detail=False, methods=['get'])
    def stages(self, request):
        """
        생애주기 단계 목록
        GET /api/lifecycles/stages/
        """
        stages = [
            {'value': 'adoption', 'label': '입양 준비'},
            {'value': 'puppy', 'label': '육아'},
            {'value': 'health', 'label': '건강관리'},
            {'value': 'senior', 'label': '노령 케어'},
            {'value': 'farewell', 'label': '이별/장례'},
        ]
        return Response(stages)


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