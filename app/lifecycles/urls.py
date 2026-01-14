from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LifecycleGuideViewSet, PetViewSet, VaccinationViewSet, HealthRecordViewSet, PetPhotoViewSet, SymptomCheckerView

app_name = 'lifecycles'

router = DefaultRouter()
router.register(r'guides', LifecycleGuideViewSet, basename='lifecycle-guide')
router.register(r'pets', PetViewSet, basename='pet')
router.register(r'vaccinations', VaccinationViewSet, basename='vaccination')
router.register(r'health-records', HealthRecordViewSet, basename='health-record')
router.register(r'photos', PetPhotoViewSet, basename='pet-photo')

urlpatterns = [
    path('', include(router.urls)),
    path('symptom-checker/', SymptomCheckerView.as_view(), name='symptom-checker'),
]
