from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated, IsAdminUser, BasePermission, SAFE_METHODS
from rest_framework.exceptions import PermissionDenied
from .models import Hospital, HospitalVisit, HospitalReview


class IsAdminOrHospitalManager(BasePermission):
    """전체 관리자(is_staff)는 모든 병원을, 병원 관리자(is_hospital_manager)는
    본인이 담당하는 병원만 수정/삭제할 수 있도록 하는 권한 클래스"""

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return bool(user.is_staff or user.is_hospital_manager)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.is_staff:
            return True
        if request.method in SAFE_METHODS:
            return True
        return obj.managers.filter(pk=user.pk).exists()
from .serializers import (
    HospitalSerializer,
    HospitalListSerializer,
    HospitalVisitSerializer,
    HospitalReviewSerializer
)
import math


def calculate_distance(lat1, lon1, lat2, lon2):
    """두 지점 간 거리 계산 (Haversine formula) - 미터 단위"""
    R = 6371000  # 지구 반지름 (미터)
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = (math.sin(delta_lat / 2) ** 2 +
         math.cos(lat1_rad) * math.cos(lat2_rad) *
         math.sin(delta_lon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


class HospitalViewSet(viewsets.ModelViewSet):
    """병원/미용실 ViewSet (생성/수정/삭제는 관리자만)"""
    queryset = Hospital.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    pagination_class = None
    search_fields = ['name', 'address']
    ordering_fields = ['rating', 'review_count', 'created_at']
    ordering = ['-rating']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminOrHospitalManager()]
        return [IsAuthenticatedOrReadOnly()]

    def get_serializer_class(self):
        """액션별 Serializer 선택"""
        if self.action == 'list':
            return HospitalListSerializer
        return HospitalSerializer
    
    def get_queryset(self):
        """필터링된 queryset 반환"""
        queryset = Hospital.objects.all()

        # 병원 관리자는 관리자 페이지 목록 조회(위치 검색 파라미터 없는 list)에서
        # 본인이 담당하는 병원/미용실만 보이도록 제한 (지도/목록 공개 검색은 영향 없음)
        user = self.request.user
        has_geo_params = self.request.query_params.get('latitude') and self.request.query_params.get('longitude')
        if (
            self.action == 'list'
            and not has_geo_params
            and user.is_authenticated
            and user.is_hospital_manager
            and not user.is_staff
        ):
            queryset = queryset.filter(managers=user)

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
        
        # 거리 기반 필터 (위치 정보가 있으면)
        latitude = self.request.query_params.get('latitude', None)
        longitude = self.request.query_params.get('longitude', None)
        radius = self.request.query_params.get('radius', None)
        
        if latitude and longitude and radius:
            try:
                user_lat = float(latitude)
                user_lon = float(longitude)
                search_radius = float(radius)
                
                # 거리 계산 후 필터링
                total_count = queryset.count()
                nearby_hospitals = []
                
                for hospital in queryset:
                    if hospital.latitude and hospital.longitude:
                        distance = calculate_distance(
                            user_lat, user_lon,
                            float(hospital.latitude), float(hospital.longitude)
                        )
                        if distance <= search_radius:
                            nearby_hospitals.append(hospital.id)
                
                print(f"📍 거리 필터링: {total_count}개 → {len(nearby_hospitals)}개 (반경 {search_radius/1000}km)")
                queryset = queryset.filter(id__in=nearby_hospitals)
            except (ValueError, TypeError) as e:
                print(f"⚠️ 거리 필터 오류: {e}")

        return queryset

    def perform_create(self, serializer):
        """병원 관리자가 새로 등록하면 자동으로 본인을 담당자로 지정
        (그렇지 않으면 목록 스코프 필터 때문에 방금 만든 병원이 바로 안 보이게 됨)"""
        hospital = serializer.save()
        user = self.request.user
        if user.is_hospital_manager and not user.is_staff:
            hospital.managers.add(user)

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
    @action(detail=True, methods=['get', 'post'], url_path='reviews')
    def reviews(self, request, pk=None):
        """
        병원 리뷰 조회/작성
        GET /api/hospitals/{id}/reviews/
        POST /api/hospitals/{id}/reviews/
        """
        hospital = self.get_object()
        
        if request.method == 'GET':
            reviews = HospitalReview.objects.filter(hospital=hospital).order_by('-created_at')
            serializer = HospitalReviewSerializer(reviews, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            if not request.user.is_authenticated:
                return Response({'error': '로그인이 필요합니다.'}, status=status.HTTP_401_UNAUTHORIZED)

            if HospitalReview.objects.filter(hospital=hospital, user=request.user).exists():
                return Response({'error': '이미 이 병원에 리뷰를 작성하셨습니다.'}, status=status.HTTP_400_BAD_REQUEST)

            serializer = HospitalReviewSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(user=request.user, hospital=hospital)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['put', 'delete'], url_path='reviews/(?P<review_id>[^/.]+)')
    def review_detail(self, request, pk=None, review_id=None):
        """리뷰 수정/삭제"""
        if not request.user.is_authenticated:
            return Response({'error': '로그인이 필요합니다.'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            review = HospitalReview.objects.get(id=review_id, hospital_id=pk)
        except HospitalReview.DoesNotExist:
            return Response({'error': '리뷰를 찾을 수 없습니다.'}, status=status.HTTP_404_NOT_FOUND)
        
        if review.user != request.user and not request.user.is_staff:
            return Response({'error': '본인의 리뷰만 수정/삭제할 수 있습니다.'}, status=status.HTTP_403_FORBIDDEN)
        
        if request.method == 'PUT':
            serializer = HospitalReviewSerializer(review, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        elif request.method == 'DELETE':
            review.delete()
            return Response({'message': '리뷰가 삭제되었습니다.'}, status=status.HTTP_204_NO_CONTENT)



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
            raise PermissionDenied('본인의 방문 기록만 수정할 수 있습니다.')
        serializer.save()

    def perform_destroy(self, instance):
        """본인의 방문 기록만 삭제 가능"""
        if instance.user != self.request.user:
            raise PermissionDenied('본인의 방문 기록만 삭제할 수 있습니다.')
        instance.delete()
    

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

        # 내가 작성한 리뷰만 보기
        my_reviews = self.request.query_params.get('my_reviews')
        if my_reviews and self.request.user.is_authenticated:
            queryset = queryset.filter(user=self.request.user)
            return queryset.order_by('-created_at')

        # 병원 관리자는 본인이 담당하는 병원의 리뷰만 조회 가능
        user = self.request.user
        if user.is_authenticated and user.is_hospital_manager and not user.is_staff:
            queryset = queryset.filter(hospital__managers=user)

        # 병원 필터
        hospital_id = self.request.query_params.get('hospital', None)
        if hospital_id:
            queryset = queryset.filter(hospital_id=hospital_id)

        # 병원 종류 필터 (병원/미용실 리뷰 탭 구분용)
        hospital_type = self.request.query_params.get('hospital_type', None)
        if hospital_type:
            queryset = queryset.filter(hospital__type=hospital_type)

        # 평점 필터
        rating = self.request.query_params.get('rating', None)
        if rating:
            queryset = queryset.filter(rating=rating)

        return queryset

    def perform_create(self, serializer):
        """후기 생성 시 user 자동 설정"""
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        """본인 또는 관리자만 수정 가능"""
        if serializer.instance.user != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied('본인의 후기만 수정할 수 있습니다.')
        serializer.save()

    def perform_destroy(self, instance):
        """본인, 전체 관리자, 또는 해당 병원 담당 관리자만 삭제 가능"""
        user = self.request.user
        is_hospital_manager_of_this = user.is_hospital_manager and instance.hospital.managers.filter(pk=user.pk).exists()
        if instance.user != user and not user.is_staff and not is_hospital_manager_of_this:
            raise PermissionDenied('본인의 후기만 삭제할 수 있습니다.')
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
