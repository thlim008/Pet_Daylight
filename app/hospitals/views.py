from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from .models import Hospital, HospitalVisit, HospitalReview
from .serializers import (
    HospitalSerializer,
    HospitalListSerializer,
    HospitalVisitSerializer,
    HospitalReviewSerializer
)


class HospitalViewSet(viewsets.ReadOnlyModelViewSet):
    """병원/미용실 ViewSet (읽기 전용)"""
    queryset = Hospital.objects.all()
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'address']
    ordering_fields = ['rating', 'review_count', 'created_at']
    ordering = ['-rating']
    
    def get_serializer_class(self):
        """액션별 Serializer 선택"""
        if self.action == 'list':
            return HospitalListSerializer
        return HospitalSerializer
    
    def get_queryset(self):
        """필터링된 queryset 반환"""
        queryset = Hospital.objects.all()
        
        # 타입 필터 (병원/미용실)
        hospital_type = self.request.query_params.get('type', None)
        if hospital_type:
            queryset = queryset.filter(type=hospital_type)
        
        # 가격대 필터
        price_range = self.request.query_params.get('price_range', None)
        if price_range:
            queryset = queryset.filter(price_range=price_range)
        
        # 24시간 운영 필터
        is_24_hours = self.request.query_params.get('is_24_hours', None)
        if is_24_hours is not None:
            is_24_hours_bool = is_24_hours.lower() in ['true', '1', 'yes']
            queryset = queryset.filter(is_24_hours=is_24_hours_bool)
        
        # 현재 진료중 필터
        is_open_now = self.request.query_params.get('is_open_now', None)
        if is_open_now is not None and is_open_now.lower() in ['true', '1', 'yes']:
            # Python 측에서 필터링 (DB 쿼리로는 복잡함)
            open_hospitals = [h.id for h in queryset if h.is_open_now()]
            queryset = queryset.filter(id__in=open_hospitals)
        
        return queryset
    
    @action(detail=False, methods=['post'], url_path='create-from-kakao')
    def create_from_kakao(self, request):
        """
        카카오맵 데이터로 자동으로 Hospital 생성
        
        POST /api/hospitals/create-from-kakao/
        
        요청 데이터:
        {
            "kakao_id": "26876033",
            "name": "반려동물병원",
            "type": "hospital",  // or "grooming"
            "address": "대전 유성구 관들1길 54",
            "phone": "0502-5553-5353",
            "latitude": "36.4183552",
            "longitude": "127.3823232",
            "category": "의료,건강 > 동물병원",
            "place_url": "http://place.map.kakao.com/26876033"
        }
        
        응답:
        {
            "hospital_id": 123,
            "created": true  // or false (이미 존재하는 경우)
        }
        """
        kakao_id = request.data.get('kakao_id')
        
        if not kakao_id:
            return Response(
                {'error': 'kakao_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 이미 존재하는지 확인 (kakao_place_id로)
        existing = Hospital.objects.filter(kakao_place_id=kakao_id).first()
        if existing:
            return Response({
                'message': 'Hospital already exists',
                'hospital_id': existing.id,
                'created': False
            }, status=status.HTTP_200_OK)
        
        # 새 Hospital 생성
        hospital_data = {
            'kakao_place_id': kakao_id,
            'name': request.data.get('name'),
            'type': request.data.get('type', 'hospital'),
            'address': request.data.get('address'),
            'phone': request.data.get('phone', ''),
            'latitude': request.data.get('latitude'),
            'longitude': request.data.get('longitude'),
            'description': '',
            'website': request.data.get('place_url', ''),
            'is_24_hours': False,  # 카카오맵 데이터에는 없으므로 기본값
            'opening_hours': {},   # 나중에 수동으로 추가
            'services': [],        # 나중에 수동으로 추가
            'price_range': 'medium',
            'rating': 0.0,
            'review_count': 0,
        }
        
        try:
            hospital = Hospital.objects.create(**hospital_data)
            
            return Response({
                'message': 'Hospital created successfully',
                'hospital_id': hospital.id,
                'created': True
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class HospitalVisitViewSet(viewsets.ModelViewSet):
    """병원 방문 기록 ViewSet"""
    queryset = HospitalVisit.objects.all()
    serializer_class = HospitalVisitSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['visit_date', 'created_at']
    ordering = ['-visit_date']
    
    def get_queryset(self):
        """본인의 방문 기록만 조회"""
        queryset = HospitalVisit.objects.filter(user=self.request.user)
        queryset = queryset.select_related('user', 'pet', 'hospital')
        
        # 반려동물 필터
        pet_id = self.request.query_params.get('pet', None)
        if pet_id:
            queryset = queryset.filter(pet_id=pet_id)
        
        # 병원 필터
        hospital_id = self.request.query_params.get('hospital', None)
        if hospital_id:
            queryset = queryset.filter(hospital_id=hospital_id)
        
        return queryset
    
    def perform_create(self, serializer):
        """방문 기록 생성 시 user 자동 설정"""
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        """본인의 방문 기록만 수정 가능"""
        if serializer.instance.user != self.request.user:
            return Response(
                {'error': '본인의 방문 기록만 수정할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer.save()
    
    def perform_destroy(self, instance):
        """본인의 방문 기록만 삭제 가능"""
        if instance.user != self.request.user:
            return Response(
                {'error': '본인의 방문 기록만 삭제할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """
        다가오는 방문 일정
        GET /api/hospital-visits/upcoming/
        """
        from django.utils import timezone
        
        queryset = self.get_queryset().filter(
            next_visit_date__gte=timezone.now().date()
        ).order_by('next_visit_date')
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class HospitalReviewViewSet(viewsets.ModelViewSet):
    """병원 후기 ViewSet"""
    queryset = HospitalReview.objects.all()
    serializer_class = HospitalReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['rating', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """필터링된 queryset 반환"""
        queryset = HospitalReview.objects.select_related('user', 'hospital')
        
        # 병원 필터
        hospital_id = self.request.query_params.get('hospital', None)
        if hospital_id:
            queryset = queryset.filter(hospital_id=hospital_id)
        
        # 평점 필터
        rating = self.request.query_params.get('rating', None)
        if rating:
            queryset = queryset.filter(rating=rating)
        
        return queryset
    
    def perform_create(self, serializer):
        """후기 생성 시 user 자동 설정"""
        serializer.save(user=self.request.user)
    
    def perform_update(self, serializer):
        """본인의 후기만 수정 가능"""
        if serializer.instance.user != self.request.user:
            return Response(
                {'error': '본인의 후기만 수정할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer.save()
    
    def perform_destroy(self, instance):
        """본인의 후기만 삭제 가능"""
        if instance.user != self.request.user:
            return Response(
                {'error': '본인의 후기만 삭제할 수 있습니다.'},
                status=status.HTTP_403_FORBIDDEN
            )
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def my_reviews(self, request):
        """
        내 후기 목록
        GET /api/hospital-reviews/my_reviews/
        """
        queryset = self.get_queryset().filter(user=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)