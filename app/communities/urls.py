from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CommunityViewSet, CommunityCommentViewSet

app_name = 'communities'

router = DefaultRouter()
router.register(r'comments', CommunityCommentViewSet, basename='community-comment')
router.register(r'', CommunityViewSet, basename='community')


urlpatterns = [
    path('', include(router.urls)),
]