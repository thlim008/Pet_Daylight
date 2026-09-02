from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.db.models import Q, F
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
        Community.objects.filter(pk=instance.pk).update(views=F('views') + 1)
        instance.refresh_from_db(fields=['views'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        """게시글 생성 시 사용자 자동 설정"""
        serializer.save(user=self.request.user)

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

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticatedOrReadOnly])
    def popular(self, request):
        """인기 게시글 (좋아요 많은 순)"""
        from django.db.models import Count
        
        queryset = Community.objects.annotate(
            likes_count=Count('user_likes')
        ).order_by('-likes_count', '-created_at')[:10]
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        """좋아요 토글"""
        from .models import CommunityLike
        
        community = self.get_object()

        # 동시 요청에도 안전하도록 get_or_create 사용 (unique_together로 DB 레벨 중복 방지)
        like_obj, created = CommunityLike.objects.get_or_create(
            community=community,
            user=request.user
        )

        if not created:
            # 이미 있었으면 좋아요 취소
            like_obj.delete()
            return Response({
                'liked': False,
                'likes_count': community.user_likes.count()
            })

        # 알림 생성 (자기 글에는 알림 안 감)
        if community.user != request.user:
            Notification.objects.create(
                user=community.user,
                type='like',
                title='새 좋아요',
                message=f'{request.user.display_name}님이 회원님의 게시글을 좋아합니다.',
                link=f'/communities/{community.id}',
                community=community
            )
        
        return Response({
            'liked': True,
            'likes_count': community.user_likes.count()
        })


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
        comment = serializer.save(user=self.request.user)
        community = comment.community
        
        # 알림 생성 (자기 글에는 알림 안 감)
        if community.user != self.request.user:
            Notification.objects.create(
                user=community.user,
                type='comment',
                title='새 댓글',
                message=f'{self.request.user.display_name}님이 회원님의 게시글에 댓글을 남겼습니다.',
                link=f'/communities/{community.id}',
                community=community
            )