# app/accounts/adapters.py
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from rest_framework_simplejwt.tokens import RefreshToken
import sys

class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    
    def pre_social_login(self, request, sociallogin):
        """소셜 로그인 시작 시 호출"""
        print("=" * 80, file=sys.stderr)
        print("🔵 [Adapter] pre_social_login 호출됨!", file=sys.stderr)
        print(f"🔵 [Adapter] Provider: {sociallogin.account.provider}", file=sys.stderr)
        print(f"🔵 [Adapter] User: {sociallogin.user}", file=sys.stderr)
        print(f"🔵 [Adapter] User ID: {sociallogin.user.id}", file=sys.stderr)
        print(f"🔵 [Adapter] User Username: {sociallogin.user.username}", file=sys.stderr)
        print(f"🔵 [Adapter] Is Existing: {sociallogin.is_existing}", file=sys.stderr)
        print(f"🔵 [Adapter] State: {sociallogin.state}", file=sys.stderr)
        print("=" * 80, file=sys.stderr)
    
    def save_user(self, request, sociallogin, form=None):
        """소셜 로그인 사용자 저장 시 호출"""
        print("=" * 80, file=sys.stderr)
        print("💾 [Adapter] save_user 호출 시작!", file=sys.stderr)
        
        try:
            user = super().save_user(request, sociallogin, form)
            
            print(f"💾 [Adapter] save_user 성공!", file=sys.stderr)
            print(f"💾 [Adapter] Username: {user.username}", file=sys.stderr)
            print(f"💾 [Adapter] Email: {user.email}", file=sys.stderr)
            print(f"💾 [Adapter] Provider: {sociallogin.account.provider}", file=sys.stderr)
            
            # 이메일이 없으면 자동 생성
            if not user.email:
                user.email = f"{user.username}@petdaylight.local"
                user.save()
                print(f"📧 [Adapter] 이메일 자동 생성: {user.email}", file=sys.stderr)
            
            print("=" * 80, file=sys.stderr)
            return user
            
        except Exception as e:
            print(f"❌ [Adapter] save_user 실패: {e}", file=sys.stderr)
            print(f"❌ [Adapter] Error Type: {type(e).__name__}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            print("=" * 80, file=sys.stderr)
            raise
    
    def populate_user(self, request, sociallogin, data):
        """사용자 정보 채우기"""
        print("=" * 80, file=sys.stderr)
        print("📝 [Adapter] populate_user 호출!", file=sys.stderr)
        print(f"📝 [Adapter] Provider: {sociallogin.account.provider}", file=sys.stderr)
        print(f"📝 [Adapter] Data: {data}", file=sys.stderr)
        
        try:
            user = super().populate_user(request, sociallogin, data)
            print(f"📝 [Adapter] populate_user 성공! Username: {user.username}", file=sys.stderr)
            print("=" * 80, file=sys.stderr)
            return user
        except Exception as e:
            print(f"❌ [Adapter] populate_user 실패: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            print("=" * 80, file=sys.stderr)
            raise
    
    def get_login_redirect_url(self, request):
        """소셜 로그인 완료 후 리다이렉트 URL 결정"""
        print("=" * 80, file=sys.stderr)
        print("🚀 [Adapter] get_login_redirect_url 호출됨!", file=sys.stderr)
        
        user = request.user
        print(f"👤 [Adapter] 사용자: {user.username}", file=sys.stderr)
        print(f"📧 [Adapter] 이메일: {user.email}", file=sys.stderr)
        print(f"🔐 [Adapter] 인증 상태: {user.is_authenticated}", file=sys.stderr)
        
        # JWT 토큰 생성
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        # React 앱으로 리다이렉트
        redirect_url = f"http://localhost:3000/?access={access_token}&refresh={refresh_token}"
        
        print(f"🔗 [Adapter] 리다이렉트 URL: {redirect_url[:80]}...", file=sys.stderr)
        print("=" * 80, file=sys.stderr)
        
        return redirect_url