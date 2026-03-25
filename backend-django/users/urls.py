from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    ForgotPasswordSecurityView,
    ForgotPasswordTelegramView,
    ProfileView,
    RegisterView,
    ResetPasswordView,
    SecurityQuestionView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('forgot-password/telegram/', ForgotPasswordTelegramView.as_view(), name='forgot_password_telegram'),
    path('forgot-password/security/', ForgotPasswordSecurityView.as_view(), name='forgot_password_security'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('security-question/', SecurityQuestionView.as_view(), name='security_question'),
]
