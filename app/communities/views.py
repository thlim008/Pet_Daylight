from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.db.models import Q
from .models import Community, CommunityComment
from .serializers import CommunitySerializer, CommunityCommentSerializer
from app.notifications.models import Notification


class CommunityViewSet(viewsets.ModelViewSet):
    """커뮤니티 게시글 ViewSet"""
    serializer_class = CommunitySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'views', 'likes_count']
    ordering = ['-created_at']

    def get_queryset(self):
        """필터링 + 검색"""
        queryset = Community.objects.select_related('user').prefetch_related('comments', 'user_likes').all()
        
        # 내가 작성한 글만 보기
        my_posts = self.request.query_params.get('my_posts')
        if my_posts and self.request.user.is_authenticated:
            queryset = queryset.filter(user=self.request.user)
            return queryset.order_by('-created_at')

        # 카테고리 필터
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        # 검색
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(content__icontains=search)
            )

        return queryset

    def retrieve(self, request, *args, **kwargs):
        """게시글 조회 시 조회수 증가"""
        instance = self.get_object()
        instance.views += 1
        instance.save(update_fields=['views'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        """게시글 생성 시 사용자 자동 설정"""
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        """좋아요 토글"""
        community = self.get_object()
        
        if request.user in community.user_likes.all():
            community.user_likes.remove(request.user)
            return Response({'liked': False, 'likes_count': community.user_likes.count()})
        
        community.user_likes.add(request.user)
        
        # 알림 생성 (자기 글에는 알림 안 감)
        if community.user != request.user:
            Notification.objects.create(
                user=community.user,
                type='like',
                title='새 좋아요',
                message=f'{request.user.username}님이 회원님의 게시글을 좋아합니다.',
                link=f'/communities/{community.id}',
                community=community
            )
        return Response({'liked': True, 'likes_count': community.user_likes.count()})


class CommunityCommentViewSet(viewsets.ModelViewSet):
    queryset = CommunityComment.objects.all()
    serializer_class = CommunityCommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = CommunityComment.objects.select_related('user', 'community')
        
        # 내가 작성한 댓글만 보기
        my_comments = self.request.query_params.get('my_comments')
        if my_comments and self.request.user.is_authenticated:
            queryset = queryset.filter(user=self.request.user)
            return queryset.order_by('-created_at')
        
        # 게시글별 댓글 필터
        post_id = self.request.query_params.get('post', None)
        if post_id:
            queryset = queryset.filter(community_id=post_id)
        
        return queryset.order_by('created_at')

    def perform_create(self, serializer):
        comment = serializer.save(user=self.request.user)
        community = comment.community
        
        # 알림 생성 (자기 글에는 알림 안 감)
        if community.user != self.request.user:
            Notification.objects.create(
                user=community.user,
                type='comment',
                title='새 댓글',
                message=f'{self.request.user.username}님이 회원님의 게시글에 댓글을 남겼습니다.',
                link=f'/communities/{community.id}',
                community=community
            )
