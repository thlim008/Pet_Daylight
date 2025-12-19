from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HospitalViewSet, HospitalVisitViewSet, HospitalReviewViewSet

app_name = 'hospitals'

router = DefaultRouter()
router.register(r'', HospitalViewSet, basename='hospital')
router.register(r'visits', HospitalVisitViewSet, basename='hospital-visit')
router.register(r'reviews', HospitalReviewViewSet, basename='hospital-review')

urlpatterns = [
    path('', include(router.urls)),
]