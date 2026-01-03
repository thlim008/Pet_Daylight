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
