from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.adapter import DefaultAccountAdapter
from rest_framework_simplejwt.tokens import RefreshToken
import sys

class CustomAccountAdapter(DefaultAccountAdapter):
    def get_login_redirect_url(self, request):
        print("=" * 80, file=sys.stderr)
        print("🚀 CustomAccountAdapter.get_login_redirect_url 호출!", file=sys.stderr)
        user = request.user
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        url = f"https://petdaylight.mooo.com/?access={access_token}&refresh={refresh_token}"
        print(f"🔗 리다이렉트 URL: {url[:50]}...", file=sys.stderr)
        print("=" * 80, file=sys.stderr)
        return url

class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def populate_user(self, request, sociallogin, data):
        """닉네임이 비어있으면 이메일 아이디 부분으로 임시 닉네임 채움"""
        user = super().populate_user(request, sociallogin, data)
        if not getattr(user, 'nickname', None):
            email = data.get('email') or user.email or ''
            if email and '@' in email:
                user.nickname = email.split('@')[0]
            elif user.username:
                user.nickname = user.username
        return user

    def get_login_redirect_url(self, request):
        print("=" * 80, file=sys.stderr)
        print("🚀 CustomSocialAccountAdapter.get_login_redirect_url 호출!", file=sys.stderr)
        user = request.user
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        url = f"https://petdaylight.mooo.com/?access={access_token}&refresh={refresh_token}"
        print(f"🔗 리다이렉트 URL: {url[:50]}...", file=sys.stderr)
        print("=" * 80, file=sys.stderr)
        return url
