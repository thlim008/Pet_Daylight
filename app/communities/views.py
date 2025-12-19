from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from .models import Community, CommunityComment
from .serializers import (
    CommunitySerializer,
    CommunityListSerializer,
    CommunityCommentSerializer
)


class CommunityViewSet(viewsets.ModelViewSet):
    """커뮤니티 게시글 ViewSet"""
    queryset = Community.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'views', 'likes']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """액션별 Serializer 선택"""
        if self.action == 'list':
            return CommunityListSerializer
        return CommunitySerializer
    
    def get_queryset(self):
        """필터링된 queryset 반환"""
        queryset = Community.objects.select_related('user').prefetch_related('comments')
        
        # 카테고리 필터
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)
        
        return queryset
    
    def retrieve(self, request, *args, **kwargs):
        """상세 조회 시 조회수 증가"""
        instance = self.get_object()
        instance.increment_views()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def perform_create(self, serializer):
        """게시글 생성 시 user 자동 설정"""
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        """본인 게시글만 수정 가능"""
        if serializer.instance.user != self.request.user:
            return Response(
                {'error': '본인의 게시글만 수정할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer.save()
    
    def perform_destroy(self, instance):
        """본인 게시글만 삭제 가능"""
        if instance.user != self.request.user:
            return Response(
                {'error': '본인의 게시글만 삭제할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        instance.delete()
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        """
        좋아요
        POST /api/communities/{id}/like/
        """
        community = self.get_object()
        community.increment_likes()
        
        return Response({
            'message': '좋아요를 눌렀습니다.',
            'likes': community.likes
        })
    
    @action(detail=False, methods=['get'])
    def my_posts(self, request):
        """
        내 게시글 목록
        GET /api/communities/my_posts/
        """
        queryset = self.get_queryset().filter(user=request.user)
        
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """
        인기 게시글 (좋아요 많은 순)
        GET /api/communities/popular/
        """
        queryset = self.get_queryset().order_by('-likes', '-views')[:10]
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class CommunityCommentViewSet(viewsets.ModelViewSet):
    """커뮤니티 댓글 ViewSet"""
    queryset = CommunityComment.objects.all()
    serializer_class = CommunityCommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """필터링된 queryset 반환"""
        queryset = CommunityComment.objects.select_related('user', 'community')
        
        # 특정 게시글의 댓글만 조회
        community_id = self.request.query_params.get('community', None)
        if community_id:
            queryset = queryset.filter(community_id=community_id)
        
        return queryset.order_by('-created_at')
    
    def perform_create(self, serializer):
        """댓글 생성 시 user 자동 설정"""
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        """본인 댓글만 수정 가능"""
        if serializer.instance.user != self.request.user:
            return Response(
                {'error': '본인의 댓글만 수정할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer.save()
    
    def perform_destroy(self, instance):
        """본인 댓글만 삭제 가능"""
        if instance.user != self.request.user:
            return Response(
                {'error': '본인의 댓글만 삭제할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        instance.delete()