import os

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone
from rest_framework import serializers

from app.validators import validate_image_size
from .models import Hospital, HospitalVisit, HospitalReview

MAX_HOSPITAL_IMAGES = 5


def _absolute_image_url(request, image_url):
    if image_url.startswith('/media/') and request:
        return request.build_absolute_uri(image_url)
    return image_url


def _save_hospital_images(existing_images, uploaded_images):
    """기존 이미지(유지분) + 새로 업로드된 이미지를 합쳐 최대 5장으로 저장"""
    final_images = list(existing_images or [])
    for image_file in uploaded_images:
        if len(final_images) >= MAX_HOSPITAL_IMAGES:
            break
        ext = os.path.splitext(image_file.name)[1]
        timestamp = timezone.now().strftime('%Y%m%d_%H%M%S%f')
        filename = f'hospitals/{timestamp}{ext}'
        path = default_storage.save(filename, ContentFile(image_file.read()))
        final_images.append(default_storage.url(path))
    return final_images[:MAX_HOSPITAL_IMAGES]


class HospitalListSerializer(serializers.ModelSerializer):
    """병원/미용실 목록용 Serializer (간단한 정보)"""
    is_open_now = serializers.SerializerMethodField()
    manager_names = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    images_full_url = serializers.SerializerMethodField()

    class Meta:
        model = Hospital
        fields = [
            'id',
            'type',
            'name',
            'latitude',
            'longitude',
            'address',
            'phone',
            'rating',
            'review_count',
            'is_24_hours',
            'opening_hours',
            'is_open_now',
            'price_range',
            'kakao_place_id',
            'managers',
            'manager_names',
            'image',
            'images_full_url',
        ]
        read_only_fields = ['rating', 'review_count']

    def get_is_open_now(self, obj):
        return obj.is_open_now()

    def get_manager_names(self, obj):
        return [u.nickname or u.username for u in obj.managers.all()]

    def get_image(self, obj):
        """대표(첫 번째) 이미지 - 목록/상세 화면에서 바로 사용"""
        if obj.images:
            return _absolute_image_url(self.context.get('request'), obj.images[0])
        return None

    def get_images_full_url(self, obj):
        request = self.context.get('request')
        return [_absolute_image_url(request, url) for url in (obj.images or [])]


class HospitalSerializer(serializers.ModelSerializer):
    """병원/미용실 상세 Serializer"""
    is_open_now = serializers.SerializerMethodField()
    manager_names = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    images_full_url = serializers.SerializerMethodField()
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(validators=[validate_image_size]),
        write_only=True,
        required=False
    )
    existing_images = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = Hospital
        fields = '__all__'
        read_only_fields = ['rating', 'review_count', 'created_at', 'updated_at']

    def get_is_open_now(self, obj):
        return obj.is_open_now()

    def get_manager_names(self, obj):
        return [u.nickname or u.username for u in obj.managers.all()]

    def get_image(self, obj):
        if obj.images:
            return _absolute_image_url(self.context.get('request'), obj.images[0])
        return None

    def get_images_full_url(self, obj):
        request = self.context.get('request')
        return [_absolute_image_url(request, url) for url in (obj.images or [])]

    def create(self, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        validated_data.pop('existing_images', None)
        managers = validated_data.pop('managers', None)
        validated_data['images'] = _save_hospital_images([], uploaded_images)
        hospital = Hospital.objects.create(**validated_data)
        if managers is not None:
            hospital.managers.set(managers)
        return hospital

    def update(self, instance, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        existing_images = validated_data.pop('existing_images', None)
        managers = validated_data.pop('managers', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if uploaded_images or existing_images is not None:
            base_images = existing_images if existing_images is not None else instance.images
            instance.images = _save_hospital_images(base_images, uploaded_images)

        instance.save()
        if managers is not None:
            instance.managers.set(managers)
        return instance


class HospitalVisitSerializer(serializers.ModelSerializer):
    """방문 기록 Serializer"""
    
    class Meta:
        model = HospitalVisit
        fields = [
            'id',
            'user',
            'pet',
            'hospital',
            'hospital_name',
            'hospital_address',
            'hospital_phone',
            'visit_date',
            'purpose',
            'notes',
            'cost',
            'next_visit_date',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['user', 'created_at', 'updated_at']

    def to_representation(self, instance):
        """응답 시 병원 정보를 적절히 표시"""
        data = super().to_representation(instance)
        
        # hospital 또는 hospital_name 중 하나를 우선 표시
        if instance.hospital:
            data['hospital_name'] = instance.hospital.name
            data['hospital_address'] = instance.hospital.address
            data['hospital_phone'] = instance.hospital.phone
        # else: 직접 입력한 값이 그대로 사용됨
        
        return data


class HospitalReviewSerializer(serializers.ModelSerializer):
    """리뷰 Serializer"""
    user_name = serializers.CharField(source='user.display_name', read_only=True)
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    
    class Meta:
        model = HospitalReview
        fields = '__all__'
        read_only_fields = ['user', 'hospital', 'created_at', 'updated_at']
