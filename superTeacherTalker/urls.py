"""superTeacherTalker URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.2/topics/http/urls/
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
from django.urls import path
from stt_app import views

urlpatterns = [
    path('admin_page/', admin.site.urls, name="admin_page"),
    path('login_request/', views.login_request, name="login_request"),
    path('go_to_class/', views.go_to_class, name="go_to_class"),

    # URL for home page
    path('', views.home_page, name="home_page"),
]
