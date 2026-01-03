from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LifecycleGuideViewSet, PetViewSet

app_name = 'lifecycles'

router = DefaultRouter()
router.register(r'guides', LifecycleGuideViewSet, basename='lifecycle-guide')
router.register(r'pets', PetViewSet, basename='pet')

urlpatterns = [
    path('', include(router.urls)),
]