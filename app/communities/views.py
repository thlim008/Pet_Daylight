import os
import uuid
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from app.notifications.models import Notification
from .models import Community, CommunityComment, CommunityLike
from .serializers import (
    CommunitySerializer,
    CommunityListSerializer,
    CommunityCommentSerializer
)

class CommunityViewSet(viewsets.ModelViewSet):
    queryset = Community.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'views']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return CommunityListSerializer
        return CommunitySerializer

    def get_queryset(self):
        queryset = Community.objects.select_related('user').prefetch_related(
            'comments', 'user_likes'
        )
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)
        return queryset

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.increment_views()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        print("📥 받은 데이터:", request.data)
        print("📷 받은 파일:", request.FILES)
        try:
            uploaded_images = request.FILES.getlist('uploaded_images')
            image_urls = []
            if uploaded_images:
                for image in uploaded_images[:5]:
                    ext = os.path.splitext(image.name)[1]
                    filename = f"{uuid.uuid4()}{ext}"
                    filepath = f"community/{filename}"
                    saved_path = default_storage.save(filepath, ContentFile(image.read()))
                    image_urls.append(default_storage.url(saved_path))
                    print(f"✅ 이미지 저장: {saved_path}")

            data = {
                'category': request.data.get('category'),
                'title': request.data.get('title'),
                'content': request.data.get('content'),
                'images': image_urls,
            }
            print("📤 Serializer에 전달할 데이터:", data)
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            serializer.save(user=request.user)
            print("✅ 게시글 생성 성공:", serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print(f"❌ 게시글 생성 실패: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user:
            return Response({'error': '수정 권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            uploaded_images = request.FILES.getlist('uploaded_images')
            existing_images = request.data.getlist('existing_images', [])
            if isinstance(existing_images, str):
                existing_images = [existing_images] if existing_images else []

            new_image_urls = []
            if uploaded_images:
                for image in uploaded_images[:5]:
                    ext = os.path.splitext(image.name)[1]
                    filename = f"{uuid.uuid4()}{ext}"
                    filepath = f"community/{filename}"
                    saved_path = default_storage.save(filepath, ContentFile(image.read()))
                    new_image_urls.append(default_storage.url(saved_path))

            all_images = existing_images + new_image_urls
            all_images = all_images[:5]

            data = {
                'category': request.data.get('category', instance.category),
                'title': request.data.get('title', instance.title),
                'content': request.data.get('content', instance.content),
                'images': all_images,
            }

            serializer = self.get_serializer(instance, data=data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except Exception as e:
            print(f"❌ 게시글 수정 실패: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_posts(self, request):
        queryset = self.get_queryset().filter(user=request.user)
        serializer = CommunityListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def popular(self, request):
        queryset = self.get_queryset().order_by('-views')[:10]
        serializer = CommunityListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        community = self.get_object()
        user = request.user
        like, created = CommunityLike.objects.get_or_create(user=user, community=community)
        if not created:
            like.delete()
            return Response({'liked': False, 'likes_count': community.user_likes.count()})
        if community.user != user:
            Notification.objects.create(
                user=community.user,
                type='community',
                title='좋아요 알림',
                message=f'{user.username}님이 회원님의 게시글을 좋아합니다.',
                community=community
            )
        return Response({'liked': True, 'likes_count': community.user_likes.count()})


class CommunityCommentViewSet(viewsets.ModelViewSet):
    queryset = CommunityComment.objects.all()
    serializer_class = CommunityCommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = CommunityComment.objects.select_related('user', 'community')
        post_id = self.request.query_params.get('post', None)
        if post_id:
            queryset = queryset.filter(community_id=post_id)
        return queryset.order_by('created_at')

    def perform_create(self, serializer):
        comment = serializer.save(user=self.request.user)
        community = comment.community
        if community.user != self.request.user:
            Notification.objects.create(
                user=community.user,
                type='comment',
                title='댓글 알림',
                message=f'{self.request.user.username}님이 댓글을 남겼습니다.',
                community=community
            )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user:
            return Response({'error': '삭제 권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
