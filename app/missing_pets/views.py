from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.db.models import Q
from math import radians, sin, cos, sqrt, atan2
from .models import MissingPet, Comment
from .serializers import (
    MissingPetSerializer,
    MissingPetListSerializer,
    CommentSerializer
)


class MissingPetViewSet(viewsets.ModelViewSet):
    """실종/발견/구조 제보 ViewSet"""
    queryset = MissingPet.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['description', 'address', 'breed', 'name']
    ordering_fields = ['created_at', 'views', 'occurred_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """액션별 Serializer 선택"""
        if self.action == 'list':
            return MissingPetListSerializer
        return MissingPetSerializer
    
    def get_queryset(self):
        """필터링된 queryset 반환"""
        queryset = MissingPet.objects.select_related('user').prefetch_related('comments')
        
        # 카테고리 필터 (실종/발견/구조)
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)
        
        # 상태 필터 (active/resolved/closed)
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # 종류 필터 (강아지/고양이/기타)
        species = self.request.query_params.get('species', None)
        if species:
            queryset = queryset.filter(species=species)
        
        # 거리 기반 필터링
        distance = self.request.query_params.get('distance', None)
        if distance and self.request.user.is_authenticated:
            user = self.request.user
            if user.latitude and user.longitude:
                # 거리 필터링 로직은 필터 메서드에서 처리
                queryset = self._filter_by_distance(queryset, user, float(distance))
        
        return queryset
    
    def _filter_by_distance(self, queryset, user, max_distance):
        """거리 기반 필터링 (Haversine 공식)"""
        filtered_ids = []
        
        for obj in queryset:
            if not obj.latitude or not obj.longitude:
                continue
            
            distance = self._calculate_distance(
                float(user.latitude), float(user.longitude),
                float(obj.latitude), float(obj.longitude)
            )
            
            if distance <= max_distance:
                filtered_ids.append(obj.id)
        
        return queryset.filter(id__in=filtered_ids)
    
    def _calculate_distance(self, lat1, lon1, lat2, lon2):
        """두 지점 간 거리 계산 (km)"""
        R = 6371  # 지구 반지름 (km)
        
        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
        
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    def retrieve(self, request, *args, **kwargs):
        """상세 조회 시 조회수 증가"""
        instance = self.get_object()
        instance.increment_views()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """
        제보 상태 변경
        PATCH /api/missing-pets/{id}/update_status/
        Body: {"status": "resolved"}
        """
        missing_pet = self.get_object()
        
        # 본인만 수정 가능
        if missing_pet.user != request.user:
            return Response(
                {'error': '본인의 제보만 수정할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        new_status = request.data.get('status')
        if new_status not in ['active', 'resolved', 'closed']:
            return Response(
                {'error': '유효하지 않은 상태입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        missing_pet.status = new_status
        missing_pet.save()
        
        serializer = self.get_serializer(missing_pet)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_reports(self, request):
        """
        내 제보 목록
        GET /api/missing-pets/my_reports/
        """
        queryset = self.get_queryset().filter(user=request.user)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def nearby(self, request):
        """
        내 주변 제보
        GET /api/missing-pets/nearby/?distance=3
        """
        if not request.user.is_authenticated:
            return Response(
                {'error': '로그인이 필요합니다.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        user = request.user
        if not user.latitude or not user.longitude:
            return Response(
                {'error': '위치 정보가 설정되지 않았습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        distance = request.query_params.get('distance', 3)  # 기본 3km
        queryset = self.get_queryset()
        queryset = self._filter_by_distance(queryset, user, float(distance))
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class CommentViewSet(viewsets.ModelViewSet):
    """제보 댓글 ViewSet"""
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """필터링된 queryset 반환"""
        queryset = Comment.objects.select_related('user', 'missing_pet')
        
        # 특정 제보의 댓글만 조회
        missing_pet_id = self.request.query_params.get('missing_pet', None)
        if missing_pet_id:
            queryset = queryset.filter(missing_pet_id=missing_pet_id)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        """댓글 생성 시 user 자동 설정"""
        serializer.save(user=self.request.user)
    
    def perform_destroy(self, instance):
        """본인 댓글만 삭제 가능"""
        if instance.user != self.request.user:
            return Response(
                {'error': '본인의 댓글만 삭제할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        instance.delete()