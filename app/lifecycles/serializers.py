from rest_framework import serializers
from .models import LifecycleGuide, Pet, UserChecklistProgress, Vaccination, HealthRecord, PetPhoto
from app.accounts.serializers import UserSimpleSerializer


class UserChecklistProgressSerializer(serializers.ModelSerializer):
    """사용자 체크리스트 진행상황 Serializer"""
    
    class Meta:
        model = UserChecklistProgress
        fields = [
            'id', 'guide', 'checklist_item', 
            'is_completed', 'completed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LifecycleGuideSerializer(serializers.ModelSerializer):
    """생애주기 가이드 Serializer"""
    checklist_progress = serializers.SerializerMethodField()
    
    class Meta:
        model = LifecycleGuide
        fields = [
            'id', 'species', 'custom_species_name', 'emoji', 'stage', 'title', 'description',
            'content', 'checklist', 'checklist_progress', 'image', 'order',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """강아지/고양이는 species+stage 조합이 하나만 존재해야 함 (수정만 가능)"""
        species = data.get('species', getattr(self.instance, 'species', None))
        stage = data.get('stage', getattr(self.instance, 'stage', None))
        if species in ('dog', 'cat'):
            qs = LifecycleGuide.objects.filter(species=species, stage=stage)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    '강아지/고양이는 종류+단계 조합당 가이드가 하나만 존재할 수 있습니다. 기존 가이드를 수정해주세요.'
                )
        return data

    def get_checklist_progress(self, obj):
        """현재 사용자의 체크리스트 완료 상태"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return {}
        
        # 해당 가이드의 사용자 진행상황 조회
        progress = UserChecklistProgress.objects.filter(
            user=request.user,
            guide=obj
        ).values_list('checklist_item', 'is_completed')
        
        # {항목: 완료여부} 딕셔너리로 변환
        return dict(progress)


class PetSerializer(serializers.ModelSerializer):
    """반려동물 프로필 Serializer"""
    user = UserSimpleSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)
    age_in_years = serializers.ReadOnlyField()
    
    class Meta:
        model = Pet
        fields = [
            'id', 'user', 'user_id', 'name', 'species', 'breed',
            'gender', 'is_neutered', 'neutered_date',
            'birth_date', 'adoption_date', 'weight',
            'profile_image', 'notes', 'is_active', 'age_in_years',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'age_in_years', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        validated_data.pop('user_id', None)
        return super().create(validated_data)


class PetListSerializer(serializers.ModelSerializer):
    """반려동물 리스트용 Serializer (간단 버전)"""
    age_in_years = serializers.ReadOnlyField()
    
    class Meta:
        model = Pet
        fields = [
            'id', 'name', 'species', 'breed', 'gender',
            'is_neutered', 'neutered_date',
            'birth_date', 'adoption_date', 'weight',
            'profile_image', 'notes', 'age_in_years', 'is_active'
        ]

class VaccinationSerializer(serializers.ModelSerializer):
    """예방접종 기록 Serializer"""
    vaccine_type_display = serializers.CharField(source='get_vaccine_type_display', read_only=True)
    pet_name = serializers.CharField(source='pet.name', read_only=True)
    
    class Meta:
        model = Vaccination
        fields = [
            'id', 'pet', 'pet_name', 'vaccine_type', 'vaccine_type_display',
            'vaccine_name', 'vaccination_date', 'next_due_date',
            'hospital_name', 'notes', 'reminder_sent',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'reminder_sent', 'created_at', 'updated_at']


class HealthRecordSerializer(serializers.ModelSerializer):
    """건강 기록 Serializer"""
    condition_display = serializers.CharField(source='get_condition_display', read_only=True)
    pet_name = serializers.CharField(source='pet.name', read_only=True)
    
    class Meta:
        model = HealthRecord
        fields = [
            'id', 'pet', 'pet_name', 'record_date', 'weight',
            'condition', 'condition_display', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PetPhotoSerializer(serializers.ModelSerializer):
    """펫 사진 Serializer"""
    pet_name = serializers.CharField(source='pet.name', read_only=True)
    
    class Meta:
        model = PetPhoto
        fields = [
            'id', 'pet', 'pet_name', 'image', 'caption',
            'taken_date', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
