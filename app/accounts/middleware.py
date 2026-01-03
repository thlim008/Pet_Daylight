from django.http import HttpResponseRedirect
from rest_framework_simplejwt.tokens import RefreshToken
import sys

class SocialLoginRedirectMiddleware:
    """소셜 로그인 완료 후 200 응답을 가로채어 JWT와 함께 리다이렉트"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # 🔍 디버깅: 모든 소셜 로그인 관련 경로 로깅
        if any(keyword in request.path for keyword in ['kakao', 'google', 'naver', 'callback']):
            print("=" * 80, file=sys.stderr)
            print(f"🔍 [Middleware] 요청 경로: {request.path}", file=sys.stderr)
            print(f"🔍 [Middleware] 메서드: {request.method}", file=sys.stderr)
            print(f"🔍 [Middleware] 인증 상태: {request.user.is_authenticated}", file=sys.stderr)
            if request.user.is_authenticated:
                print(f"🔍 [Middleware] 사용자: {request.user.username}", file=sys.stderr)
                print(f"🔍 [Middleware] 이메일: {request.user.email}", file=sys.stderr)
            print(f"🔍 [Middleware] 응답 상태: {response.status_code}", file=sys.stderr)
            print("=" * 80, file=sys.stderr)
        
        # 소셜 로그인 콜백 경로 체크 (더 유연한 패턴)
        is_social_callback = (
            '/login/callback/' in request.path or
            (request.path.startswith('/accounts/') and '/login/callback/' in request.path)
        )
        
        # 사용자가 인증되었고 소셜 콜백 경로라면 무조건 리다이렉트 처리
        if is_social_callback and request.user.is_authenticated:
            user = request.user
            
            # 이메일 자동 생성 로직
            if not user.email:
                user.email = f"{user.username}@petdaylight.local"
                user.save()
                print(f"📧 [Middleware] 이메일 자동 생성: {user.email}", file=sys.stderr)
            
            # JWT 토큰 생성
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # 프론트엔드 리다이렉트 URL
            redirect_url = f"https://petdaylight.mooo.com/?access={access_token}&refresh={refresh_token}"
            
            print("🚀" * 40, file=sys.stderr)
            print(f"🚀 [Middleware] 소셜 로그인 성공!", file=sys.stderr)
            print(f"👤 [Middleware] 사용자: {user.username}", file=sys.stderr)
            print(f"📧 [Middleware] 이메일: {user.email}", file=sys.stderr)
            print(f"🎟️  [Middleware] Access Token: {access_token[:50]}...", file=sys.stderr)
            print(f"🎫 [Middleware] Refresh Token: {refresh_token[:50]}...", file=sys.stderr)
            print(f"📍 [Middleware] 리다이렉트: {redirect_url[:80]}...", file=sys.stderr)
            print("🚀" * 40, file=sys.stderr)
            
            # HttpResponseRedirect를 반환하면 Django는 302 리다이렉트를 보냅니다
            return HttpResponseRedirect(redirect_url)
        
        return response