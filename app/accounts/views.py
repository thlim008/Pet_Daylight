"""
accounts/views.py - 완성본
기존 파일을 이것으로 완전히 교체하세요!
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError as DjangoValidationError

from app.validators import validate_password_strength
from .models import User
from .serializers import (
    UserSerializer,
    UserRegistrationSerializer,
    UserUpdateSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    PasswordChangeSerializer,
)


class UserViewSet(viewsets.ModelViewSet):
    """
    사용자 관련 ViewSet
    - 회원가입, 로그인, 로그아웃
    - 내 정보 조회
    - 위치 업데이트
    - 알림 설정 업데이트
    - 비밀번호 재설정 (신규 추가)
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_throttles(self):
        """남용 우려가 있는 액션에 요청 빈도 제한 적용"""
        scope_by_action = {
            'login': 'login',
            'password_reset_request': 'password_reset',
            'create': 'register',
        }
        self.throttle_scope = scope_by_action.get(self.action)
        return super().get_throttles()

    def get_permissions(self):
        """
        액션별 권한 설정
        - create, login, password_reset_*: 인증 불필요
        - 나머지: 인증 필요
        """
        if self.action in ['create', 'login', 'password_reset_request', 'password_reset_confirm']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        """액션별 Serializer 선택"""
        if self.action == 'create':
            return UserRegistrationSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        elif self.action == 'password_reset_request':
            return PasswordResetRequestSerializer
        elif self.action == 'password_reset_confirm':
            return PasswordResetConfirmSerializer
        elif self.action == 'password_change':
            return PasswordChangeSerializer
        return UserSerializer

    # ==========================================
    # 회원가입
    # ==========================================
    def create(self, request):
        """
        회원가입
        POST /api/accounts/
        """
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(
                {
                    'message': '회원가입이 완료되었습니다.',
                    'user': UserSerializer(user).data
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ==========================================
    # 로그인
    # ==========================================
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        """
        로그인
        POST /api/accounts/login/
        
        Request Body:
        {
            "username": "user1",
            "password": "password123"
        }
        
        Response:
        {
            "tokens": {
                "refresh": "...",
                "access": "..."
            },
            "user": {...}
        }
        """
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'error': '아이디와 비밀번호를 입력해주세요.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 사용자 인증
        user = authenticate(username=username, password=password)
        
        if user:
            # JWT 토큰 생성
            refresh = RefreshToken.for_user(user)
            
            return Response({
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                },
                'user': UserSerializer(user).data
            })
        
        return Response(
            {'error': '아이디 또는 비밀번호가 올바르지 않습니다.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    # ==========================================
    # 로그아웃
    # ==========================================
    @action(detail=False, methods=['post'])
    def logout(self, request):
        """
        로그아웃 (토큰 블랙리스트 등록)
        POST /api/accounts/logout/
        
        Request Body:
        {
            "refresh_token": "..."
        }
        """
        try:
            refresh_token = request.data.get('refresh_token')
            if not refresh_token:
                return Response(
                    {'error': 'refresh_token이 필요합니다.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            return Response(
                {'message': '로그아웃되었습니다.'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': f'로그아웃 실패: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def get_queryset(self):
        """일반 사용자는 목록 조회 불가 (관리자만 전체 회원 조회 가능)"""
        if self.action == 'list' and not self.request.user.is_staff:
            return User.objects.none()
        return User.objects.all().order_by('id')

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        if not (request.user.is_staff or obj == request.user):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        obj = self.get_object()
        if not (request.user.is_staff or obj == request.user):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        if not (request.user.is_staff or obj == request.user):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if not (request.user.is_staff or obj == request.user):
            return Response({'error': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)
        if obj.is_staff or obj.is_superuser:
            return Response({'error': '관리자 계정은 삭제할 수 없습니다.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def set_password(self, request, pk=None):
        """
        관리자가 특정 회원의 비밀번호를 강제로 변경
        POST /api/accounts/{id}/set_password/
        Request Body: { "password": "새비밀번호" }
        """
        target = self.get_object()
        if not target.has_usable_password() and target.socialaccount_set.exists():
            return Response({'error': '소셜 로그인 계정은 비밀번호를 설정할 수 없습니다.'}, status=status.HTTP_400_BAD_REQUEST)
        password = request.data.get('password', '')
        try:
            validate_password_strength(password)
        except DjangoValidationError as e:
            return Response({'error': e.messages[0]}, status=status.HTTP_400_BAD_REQUEST)
        target.set_password(password)
        target.save()
        return Response({'message': '비밀번호가 변경되었습니다.'})

    # ==========================================
    # 내 정보 조회
    # ==========================================
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        현재 로그인한 사용자 정보 조회
        GET /api/accounts/me/
        """
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    # ==========================================
    # 위치 업데이트
    # ==========================================
    @action(detail=False, methods=['patch'])
    def update_location(self, request):
        """
        사용자 위치 업데이트
        PATCH /api/accounts/update_location/
        
        Request Body:
        {
            "latitude": 37.5665,
            "longitude": 126.9780
        }
        """
        user = request.user
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')

        if latitude is None or longitude is None:
            return Response(
                {'error': 'latitude와 longitude가 필요합니다.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.latitude = latitude
        user.longitude = longitude
        user.save()

        return Response(
            {
                'message': '위치가 업데이트되었습니다.',
                'user': UserSerializer(user).data
            }
        )

    # ==========================================
    # 비밀번호 재설정 요청 (이메일 발송) - 🔥 신규
    # ==========================================
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def password_reset_request(self, request):
        """
        비밀번호 재설정 요청 (이메일로 링크 발송)
        POST /api/accounts/password_reset_request/
        
        Request Body:
        {
            "email": "user@example.com"
        }
        
        Response:
        {
            "message": "비밀번호 재설정 이메일이 발송되었습니다.",
            "email": "user@example.com"
        }
        """
        serializer = PasswordResetRequestSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save()
            return Response(
                {
                    'message': '비밀번호 재설정 이메일이 발송되었습니다.',
                    'email': serializer.validated_data['email']
                },
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ==========================================
    # 비밀번호 재설정 확인 (새 비밀번호 설정) - 🔥 신규
    # ==========================================
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def password_reset_confirm(self, request):
        """
        비밀번호 재설정 확인 (새 비밀번호 설정)
        POST /api/accounts/password_reset_confirm/
        
        Request Body:
        {
            "uid": "MQ",
            "token": "bhqo8g-...",
            "new_password": "newpassword123",
            "new_password_confirm": "newpassword123"
        }
        
        Response:
        {
            "message": "비밀번호가 성공적으로 변경되었습니다."
        }
        """
        serializer = PasswordResetConfirmSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'message': '비밀번호가 성공적으로 변경되었습니다.'},
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ==========================================
    # 비밀번호 변경 (로그인 상태) - 🔥 신규
    # ==========================================
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def password_change(self, request):
        """
        비밀번호 변경 (로그인된 사용자)
        POST /api/accounts/password_change/
        
        Request Body:
        {
            "current_password": "oldpassword",
            "new_password": "newpassword123",
            "new_password_confirm": "newpassword123"
        }
        
        Response:
        {
            "message": "비밀번호가 변경되었습니다."
        }
        """
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(
                {'message': '비밀번호가 변경되었습니다.'},
                status=status.HTTP_200_OK
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)