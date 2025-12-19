"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # API URLs
    path('api/accounts/', include('app.accounts.urls')), 
    path('api/missing-pets/', include('app.missing_pets.urls')), 
    path('api/communities/', include('app.communities.urls')),  
    path('api/lifecycles/', include('app.lifecycles.urls')), 
    path('api/hospitals/', include('app.hospitals.urls')),
    path('api/notifications/', include('app.notifications.urls')), 

    # Social Auth URLs
    path('api/auth/social/', include('allauth.socialaccount.urls')),
    path('accounts/', include('allauth.urls')),  # ← 이게 있어야 함!
]

