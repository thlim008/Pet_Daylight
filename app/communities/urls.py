from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CommunityViewSet, CommunityCommentViewSet, CommunitySettingsView

app_name = 'communities'

router = DefaultRouter()
router.register(r'comments', CommunityCommentViewSet, basename='community-comment')
router.register(r'', CommunityViewSet, basename='community')


urlpatterns = [
    # 라우터의 r'' 등록이 /communities/<pk>/ 를 전부 잡아채므로 그보다 먼저 매칭되도록 위에 둔다
    path('settings/', CommunitySettingsView.as_view()),
    path('', include(router.urls)),
]