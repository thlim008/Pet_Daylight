from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.utils import timezone
from .models import LifecycleGuide, Pet, UserChecklistProgress
from .serializers import (
    LifecycleGuideSerializer,
    PetSerializer,
    PetListSerializer,
    UserChecklistProgressSerializer
)
from rest_framework.views import APIView
from django.conf import settings
import requests

class LifecycleGuideViewSet(viewsets.ReadOnlyModelViewSet):
    """생애주기 가이드 ViewSet (읽기 전용)"""
    queryset = LifecycleGuide.objects.all()
    serializer_class = LifecycleGuideSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    ordering = ['species', 'order']
    
    def get_queryset(self):
        """필터링된 queryset 반환"""
        queryset = LifecycleGuide.objects.all()
        
        # 종류별 필터 (dog, cat, other)
        species = self.request.query_params.get('species', None)
        if species:
            queryset = queryset.filter(species=species)
        
        # 단계별 필터
        stage = self.request.query_params.get('stage', None)
        if stage:
            queryset = queryset.filter(stage=stage)
        
        return queryset.order_by('species', 'order')
    
    @action(detail=False, methods=['get'])
    def stages(self, request):
        """
        생애주기 단계 목록
        GET /api/lifecycles/guides/stages/
        """
        stages = [
            {'value': 'adoption', 'label': '입양 준비', 'emoji': '🏠'},
            {'value': 'puppy', 'label': '육아', 'emoji': '🐾'},
            {'value': 'health', 'label': '건강관리', 'emoji': '💚'},
            {'value': 'senior', 'label': '노령 케어', 'emoji': '👴'},
            {'value': 'farewell', 'label': '이별/장례', 'emoji': '🌈'},
        ]
        return Response(stages)
    
    @action(detail=False, methods=['get'])
    def species_list(self, request):
        """
        반려동물 종류 목록
        GET /api/lifecycles/guides/species_list/
        """
        species = [
            {'value': 'dog', 'label': '강아지', 'emoji': '🐕'},
            {'value': 'cat', 'label': '고양이', 'emoji': '🐱'},
            {'value': 'other', 'label': '기타', 'emoji': '🐾'},
        ]
        return Response(species)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def recommended_for_pet(self, request):
        """
        특정 펫을 위한 추천 가이드
        GET /api/lifecycles/guides/recommended_for_pet/?pet_id=1
        """
        pet_id = request.query_params.get('pet_id')
        if not pet_id:
            return Response(
                {'error': 'pet_id가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            pet = Pet.objects.get(id=pet_id, user=request.user)
        except Pet.DoesNotExist:
            return Response(
                {'error': '펫을 찾을 수 없습니다.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 펫의 나이에 따라 적합한 단계 결정
        age = pet.age_in_years
        if age is None:
            stage = 'adoption'
        elif age < 1:
            stage = 'puppy'
        elif age < 7:
            stage = 'health'
        else:
            stage = 'senior'
        
        # 해당 종류와 단계의 가이드 조회
        guides = LifecycleGuide.objects.filter(
            species=pet.species,
            stage=stage
        ).order_by('order')
        
        serializer = self.get_serializer(guides, many=True)
        return Response({
            'pet': PetSerializer(pet).data,
            'recommended_stage': stage,
            'guides': serializer.data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def toggle_checklist(self, request, pk=None):
        """
        체크리스트 항목 토글 (완료/미완료)
        POST /api/lifecycles/guides/{id}/toggle_checklist/
        Body: { "checklist_item": "항목 내용" }
        """
        guide = self.get_object()
        checklist_item = request.data.get('checklist_item')
        
        if not checklist_item:
            return Response(
                {'error': 'checklist_item이 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 해당 항목이 가이드의 checklist에 있는지 확인
        if checklist_item not in guide.checklist:
            return Response(
                {'error': '유효하지 않은 체크리스트 항목입니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 기존 진행상황 조회 또는 생성
        progress, created = UserChecklistProgress.objects.get_or_create(
            user=request.user,
            guide=guide,
            checklist_item=checklist_item,
            defaults={'is_completed': True, 'completed_at': timezone.now()}
        )
        
        # 이미 있으면 토글
        if not created:
            progress.is_completed = not progress.is_completed
            progress.completed_at = timezone.now() if progress.is_completed else None
            progress.save()
        
        return Response({
            'checklist_item': checklist_item,
            'is_completed': progress.is_completed,
            'completed_at': progress.completed_at
        })


class PetViewSet(viewsets.ModelViewSet):
    """반려동물 프로필 ViewSet"""
    queryset = Pet.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'breed']
    ordering_fields = ['created_at', 'birth_date']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """액션별 Serializer 선택"""
        if self.action == 'list':
            return PetListSerializer
        return PetSerializer
    
    def get_queryset(self):
        """본인의 반려동물만 조회"""
        queryset = Pet.objects.filter(user=self.request.user)
        
        # 활성 상태 필터
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # 종류 필터
        species = self.request.query_params.get('species', None)
        if species:
            queryset = queryset.filter(species=species)
        
        return queryset
    
    def perform_create(self, serializer):
        """반려동물 생성 시 user 자동 설정"""
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        """본인의 반려동물만 수정 가능"""
        serializer.save()
    
    def update(self, request, *args, **kwargs):
        """본인의 반려동물만 수정 가능"""
        instance = self.get_object()
        if instance.user != request.user:
            return Response(
                {'error': '본인의 반려동물만 수정할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
    
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """본인의 반려동물만 삭제 가능"""
        instance = self.get_object()
        if instance.user != request.user:
            return Response(
                {'error': '본인의 반려동물만 삭제할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
    def perform_destroy(self, instance):
        instance.delete()
    
    @action(detail=True, methods=['patch'])
    def deactivate(self, request, pk=None):
        """
        반려동물 비활성화 (무지개다리)
        PATCH /api/lifecycles/pets/{id}/deactivate/
        """
        pet = self.get_object()
        
        if pet.user != request.user:
            return Response(
                {'error': '본인의 반려동물만 수정할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        pet.is_active = False
        pet.save()
        
        return Response({
            'message': f'{pet.name}의 프로필이 비활성화되었습니다.',
            'is_active': pet.is_active
        })
    @action(detail=True, methods=['delete'], url_path='profile-image')
    def delete_profile_image(self, request, pk=None):
        """
        프로필 사진 삭제
        DELETE /api/lifecycles/pets/{id}/profile-image/
        """
        pet = self.get_object()
        
        # 본인 펫만 수정 가능
        if pet.user != request.user:
            return Response(
                {'error': '본인의 반려동물만 수정할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 프로필 이미지 삭제
        if pet.profile_image:
            pet.profile_image.delete(save=False)
            pet.profile_image = None
            pet.save()
            return Response(
                {'message': '프로필 사진이 삭제되었습니다.'},
                status=status.HTTP_200_OK
            )
        else:
            return Response(
                {'message': '삭제할 프로필 사진이 없습니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def recommended_guides(self, request, pk=None):
        """
        특정 펫을 위한 추천 가이드
        GET /api/lifecycles/pets/{id}/recommended_guides/
        """
        pet = self.get_object()
        
        if pet.user != request.user:
            return Response(
                {'error': '본인의 반려동물만 조회할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 펫의 나이에 따라 적합한 단계 결정
        age = pet.age_in_years
        if age is None:
            stage = 'adoption'
        elif age < 1:
            stage = 'puppy'
        elif age < 7:
            stage = 'health'
        else:
            stage = 'senior'
        
        # 해당 종류와 단계의 가이드 조회
        guides = LifecycleGuide.objects.filter(
            species=pet.species,
            stage=stage
        ).order_by('order')
        
        serializer = LifecycleGuideSerializer(
            guides, 
            many=True, 
            context={'request': request}
        )
        
        return Response({
            'pet': PetSerializer(pet).data,
            'recommended_stage': stage,
            'stage_label': dict(LifecycleGuide.STAGE_CHOICES).get(stage, stage),
            'guides': serializer.data
        })

class VaccinationViewSet(viewsets.ModelViewSet):
    """예방접종 기록 ViewSet"""
    permission_classes = [IsAuthenticated]
    ordering = ['-vaccination_date']

    def get_serializer_class(self):
        from .serializers import VaccinationSerializer
        return VaccinationSerializer

    def get_queryset(self):
        from .models import Vaccination
        queryset = Vaccination.objects.filter(pet__user=self.request.user)
        
        # 펫 필터
        pet_id = self.request.query_params.get('pet')
        if pet_id:
            queryset = queryset.filter(pet_id=pet_id)
        
        return queryset.order_by('-vaccination_date')

    def perform_create(self, serializer):
        # 본인의 펫인지 확인
        pet = serializer.validated_data.get('pet')
        if pet.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('본인의 반려동물만 등록할 수 있습니다.')
        serializer.save()


class HealthRecordViewSet(viewsets.ModelViewSet):
    """건강 기록 ViewSet"""
    permission_classes = [IsAuthenticated]
    ordering = ['-record_date']

    def get_serializer_class(self):
        from .serializers import HealthRecordSerializer
        return HealthRecordSerializer

    def get_queryset(self):
        from .models import HealthRecord
        queryset = HealthRecord.objects.filter(pet__user=self.request.user)
        
        # 펫 필터
        pet_id = self.request.query_params.get('pet')
        if pet_id:
            queryset = queryset.filter(pet_id=pet_id)
        
        return queryset.order_by('-record_date')

    def perform_create(self, serializer):
        pet = serializer.validated_data.get('pet')
        if pet.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('본인의 반려동물만 등록할 수 있습니다.')
        serializer.save()

    @action(detail=False, methods=['get'])
    def weight_history(self, request):
        """
        체중 변화 히스토리 (그래프용)
        GET /api/lifecycles/health-records/weight_history/?pet=1
        """
        from .models import HealthRecord
        pet_id = request.query_params.get('pet')
        if not pet_id:
            return Response({'error': 'pet 파라미터가 필요합니다.'}, status=400)
        
        records = HealthRecord.objects.filter(
            pet_id=pet_id,
            pet__user=request.user,
            weight__isnull=False
        ).order_by('record_date').values('record_date', 'weight')
        
        return Response(list(records))


class PetPhotoViewSet(viewsets.ModelViewSet):
    """펫 앨범 ViewSet"""
    permission_classes = [IsAuthenticated]
    ordering = ['-created_at']

    def get_serializer_class(self):
        from .serializers import PetPhotoSerializer
        return PetPhotoSerializer

    def get_queryset(self):
        from .models import PetPhoto
        queryset = PetPhoto.objects.filter(pet__user=self.request.user)
        
        # 펫 필터
        pet_id = self.request.query_params.get('pet')
        if pet_id:
            queryset = queryset.filter(pet_id=pet_id)
        
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        pet = serializer.validated_data.get('pet')
        if pet.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('본인의 반려동물만 등록할 수 있습니다.')
        serializer.save()

class SymptomCheckerView(APIView):
    """AI 증상 체커 챗봇 (OpenRouter)"""
    permission_classes = [IsAuthenticated]
    
    SYSTEM_PROMPT = """너는 반려동물 건강 상담 도우미 '펫닥터'야.
    
역할:
- 반려동물(강아지, 고양이 등)의 증상을 듣고 가능한 원인과 간단한 조언을 제공해
- 이미지가 제공되면 사진을 분석해서 증상을 파악해
- 친근하고 따뜻한 말투를 사용해
- 이모지를 적절히 사용해서 친근감을 줘

중요 규칙:
1. 절대 확정적인 진단을 내리지 마. "~일 수 있어요", "~가 의심돼요" 같은 표현 사용
2. 다음 증상은 반드시 즉시 병원 방문을 권유해:
   - 호흡 곤란, 의식 저하, 경련, 대량 출혈, 중독 의심, 24시간 이상 구토/설사
3. 응답은 300자 이내로 간결하게
4. 마지막에 항상 "더 궁금한 점이 있으면 물어봐 주세요!" 같은 후속 질문 유도

면책: 이 서비스는 의료 조언을 대체하지 않습니다."""

    def post(self, request):
        user_message = request.data.get('message', '')
        pet_info = request.data.get('pet_info', None)
        conversation_history = request.data.get('history', [])
        image_data = request.data.get('image', None)
        
        if not user_message and not image_data:
            return Response(
                {'error': '메시지를 입력해주세요.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        api_key = getattr(settings, 'OPENROUTER_API_KEY', None)
        if not api_key:
            return Response(
                {'error': 'AI 서비스가 설정되지 않았습니다.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        try:
            system_prompt = self.SYSTEM_PROMPT
            if pet_info:
                pet_details = f"\n\n현재 상담 중인 반려동물 정보:"
                pet_details += f"\n- 이름: {pet_info.get('name', '알 수 없음')}"
                pet_details += f"\n- 종류: {pet_info.get('species', '알 수 없음')}"
                pet_details += f"\n- 품종: {pet_info.get('breed', '알 수 없음')}"
                pet_details += f"\n- 나이: {pet_info.get('age', '알 수 없음')}"
                if pet_info.get('weight'):
                    pet_details += f"\n- 체중: {pet_info.get('weight')}"
                if pet_info.get('gender'):
                    pet_details += f"\n- 성별: {pet_info.get('gender')}"
                if pet_info.get('is_neutered'):
                    pet_details += f"\n- 중성화: {pet_info.get('is_neutered')}"
                system_prompt += pet_details
            
            messages = [{"role": "system", "content": system_prompt}]
            
            for msg in conversation_history[-10:]:
                messages.append({
                    "role": msg.get('role', 'user'),
                    "content": msg.get('content', '')
                })
            
            if image_data:
                content = []
                if user_message:
                    content.append({"type": "text", "text": user_message})
                else:
                    content.append({"type": "text", "text": "이 사진에서 반려동물의 증상을 분석해주세요."})
                content.append({
                    "type": "image_url",
                    "image_url": {"url": image_data}
                })
                messages.append({"role": "user", "content": content})
            else:
                messages.append({"role": "user", "content": user_message})
            
            response = requests.post(
                'https://openrouter.ai/api/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': 'google/gemini-2.0-flash-exp:free',
                    'max_tokens': 500,
                    'messages': messages,
                }
            )
            
            data = response.json()
            reply = data['choices'][0]['message']['content']
            
            return Response({
                'reply': reply,
                'disclaimer': '⚠️ 이 정보는 참고용이며, 정확한 진단은 수의사와 상담하세요.'
            })
            
        except Exception as e:
            return Response(
                {'error': f'서버 오류: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
