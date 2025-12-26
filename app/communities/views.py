import os
import uuid
from django.conf import settings
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
    """커뮤니티 게시글 ViewSet"""
    queryset = Community.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'views']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """액션별 Serializer 선택"""
        if self.action == 'list':
            return CommunityListSerializer
        return CommunitySerializer
    
    def get_queryset(self):
        """필터링된 queryset 반환"""
        queryset = Community.objects.select_related('user').prefetch_related(
            'comments', 'user_likes'
        )
        
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
    
    def create(self, request, *args, **kwargs):
        """게시글 생성 + 이미지 업로드"""
        print("📥 받은 데이터:", request.data)
        print("📷 받은 파일:", request.FILES)
        
        try:
            uploaded_images = request.FILES.getlist('uploaded_images')
            
            # 이미지 저장
            image_urls = []
            if uploaded_images:
                for image in uploaded_images[:5]:  # 최대 5장
                    ext = os.path.splitext(image.name)[1]
                    filename = f"{uuid.uuid4()}{ext}"
                    filepath = os.path.join('community', filename)
                    
                    os.makedirs(os.path.join(settings.MEDIA_ROOT, 'community'), exist_ok=True)
                    
                    full_path = os.path.join(settings.MEDIA_ROOT, filepath)
                    with open(full_path, 'wb+') as f:
                        for chunk in image.chunks():
                            f.write(chunk)
                    
                    image_urls.append(f"/media/{filepath}")
                    print(f"✅ 이미지 저장: {filepath}")
            
            # Serializer에 전달할 데이터 준비
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
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        """게시글 수정 + 이미지 업로드"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # 권한 체크
        if instance.user != request.user:
            return Response(
                {'error': '본인의 게시글만 수정할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # 기존 이미지 처리
            import json
            existing_images_str = request.data.get('existing_images', '[]')
            if isinstance(existing_images_str, str):
                existing_images = json.loads(existing_images_str)
            else:
                existing_images = existing_images_str
            
            # 새 이미지 업로드
            uploaded_images = request.FILES.getlist('uploaded_images')
            new_image_urls = []
            
            if uploaded_images:
                for image in uploaded_images[:5]:
                    ext = os.path.splitext(image.name)[1]
                    filename = f"{uuid.uuid4()}{ext}"
                    filepath = os.path.join('community', filename)
                    
                    os.makedirs(os.path.join(settings.MEDIA_ROOT, 'community'), exist_ok=True)
                    
                    full_path = os.path.join(settings.MEDIA_ROOT, filepath)
                    with open(full_path, 'wb+') as f:
                        for chunk in image.chunks():
                            f.write(chunk)
                    
                    new_image_urls.append(f"/media/{filepath}")
            
            # 이미지 합치기 (기존 + 새로운)
            all_images = existing_images + new_image_urls
            all_images = all_images[:5]  # 최대 5장
            
            data = {
                'category': request.data.get('category'),
                'title': request.data.get('title'),
                'content': request.data.get('content'),
                'images': all_images,
            }
            
            serializer = self.get_serializer(instance, data=data, partial=partial)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            
            return Response(serializer.data)
        
        except Exception as e:
            print(f"❌ 게시글 수정 실패: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        """게시글 삭제"""
        instance = self.get_object()
        
        if instance.user != request.user:
            return Response(
                {'error': '본인의 게시글만 삭제할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def like(self, request, pk=None):
        """
        좋아요 토글 (누르면 추가, 다시 누르면 취소)
        POST /api/communities/{id}/like/
        """
        community = self.get_object()
        user = request.user

        # 이미 좋아요 눌렀는지 확인
        like_obj = CommunityLike.objects.filter(community=community, user=user).first()

        if like_obj:
            # 좋아요 취소
            like_obj.delete()
            return Response({
                'message': '좋아요를 취소했습니다.',
                'is_liked': False,
                'likes': community.likes
            })
        else:
            # 좋아요 추가
            CommunityLike.objects.create(community=community, user=user)

            # 알림 생성 (좋아요 누른 사람과 게시글 작성자가 다를 때만)
            if user != community.user:
                Notification.objects.create(
                    user=community.user,
                    type='community',
                    title='좋아요를 받았습니다',
                    message=f'{user.display_name}님이 "{community.title}" 글을 좋아합니다.',
                    community=community
                )
                print(f"🔔 좋아요 알림 생성: {community.user.username}에게")

            return Response({
                'message': '좋아요를 눌렀습니다.',
                'is_liked': True,
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
        from django.db.models import Count
        
        queryset = self.get_queryset().annotate(
            like_count=Count('user_likes')
        ).order_by('-like_count', '-views')[:10]
        
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
        
        return queryset.order_by('created_at')
    
    from app.notifications.models import Notification

    def create(self, request, *args, **kwargs):
        """댓글 생성 + 알림 생성"""
        print("📥 댓글 데이터:", request.data)

        try:
            # community ID 확인
            community_id = request.data.get('community')
            if not community_id:
                return Response(
                    {'error': 'community 필드가 필요합니다.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Community 존재 확인
            try:
                community = Community.objects.get(id=community_id)
            except Community.DoesNotExist:
                return Response(
                    {'error': '게시글을 찾을 수 없습니다.'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # 댓글 생성
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            comment = serializer.save(user=request.user)

            print("✅ 댓글 생성 성공:", serializer.data)

            # 알림 생성 (댓글 작성자와 게시글 작성자가 다를 때만)
            if comment.user != comment.community.user:
                Notification.objects.create(
                    user=comment.community.user,
                    type='community',
                    title='새 댓글이 달렸습니다',
                    message=f'{comment.user.display_name}님이 "{comment.community.title}" 글에 댓글을 남겼습니다.',
                    community=comment.community
                )
                print(f"🔔 알림 생성: {comment.community.user.username}에게")

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"❌ 댓글 생성 실패: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        """댓글 수정"""
        instance = self.get_object()
        
        if instance.user != request.user:
            return Response(
                {'error': '본인의 댓글만 수정할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """댓글 삭제"""
        instance = self.get_object()
        
        if instance.user != request.user:
            return Response(
                {'error': '본인의 댓글만 삭제할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)