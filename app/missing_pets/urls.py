from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import MissingPetViewSet, CommentViewSet

router = DefaultRouter()
router.register(r'comments', CommentViewSet, basename='comment')  # comments 먼저!
router.register(r'', MissingPetViewSet, basename='missing-pet')

urlpatterns = router.urls