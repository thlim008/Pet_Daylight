from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MissingPetViewSet, CommentViewSet

app_name = 'missing_pets'

router = DefaultRouter()
router.register(r'', MissingPetViewSet, basename='missing-pet')
router.register(r'comments', CommentViewSet, basename='comment')

urlpatterns = [
    path('', include(router.urls)),
]