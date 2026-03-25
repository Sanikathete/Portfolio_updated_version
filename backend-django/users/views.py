import os

import requests
from django.contrib.auth.hashers import check_password
from dotenv import load_dotenv
from rest_framework import generics, permissions
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import PasswordResetToken, User
from .serializers import UserSerializer, RegisterSerializer

load_dotenv()


def send_telegram_reset_message(chat_id, token):
    telegram_bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
    if not telegram_bot_token:
        raise ValidationError({'detail': 'Telegram bot token is not configured.'})

    message = (
        f'Your StockSphere password reset token is: {token}. '
        'Valid for 15 minutes. If you did not request this, ignore this message.'
    )
    response = requests.post(
        f'https://api.telegram.org/bot{telegram_bot_token}/sendMessage',
        json={'chat_id': chat_id, 'text': message},
        timeout=15,
    )
    if response.status_code >= 400:
        raise ValidationError({'detail': 'Unable to send the reset token to Telegram right now.'})

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        if response.status_code == status.HTTP_201_CREATED and request.data.get('use_telegram_recovery'):
            response.data['message'] = (
                'Registration successful. Make sure you have started @StockSphereBot on Telegram so reset codes can be delivered.'
            )
        return response

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ForgotPasswordTelegramView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        if not username:
            return Response({'detail': 'Username is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not user.use_telegram_recovery:
            return Response(
                {'detail': 'This account does not use Telegram recovery'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.telegram_chat_id:
            return Response(
                {'detail': 'Telegram recovery is not fully configured for this account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reset_token = PasswordResetToken.objects.create(user=user)
        send_telegram_reset_message(user.telegram_chat_id, reset_token.token)
        return Response({'message': 'Reset token sent to your Telegram'})


class ForgotPasswordSecurityView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        security_answer = request.data.get('security_answer')

        if not username or not security_answer:
            return Response(
                {'detail': 'Username and security answer are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        if user.use_telegram_recovery:
            return Response(
                {'detail': 'This account uses Telegram recovery'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.security_answer or not check_password(security_answer, user.security_answer):
            return Response({'detail': 'Incorrect security answer'}, status=status.HTTP_400_BAD_REQUEST)

        reset_token = PasswordResetToken.objects.create(user=user)
        return Response({'token': reset_token.token})


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        new_password = request.data.get('new_password')

        if not token or not new_password:
            return Response(
                {'detail': 'Token and new password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            reset_token = PasswordResetToken.objects.select_related('user').get(token=token)
        except PasswordResetToken.DoesNotExist:
            return Response({'detail': 'Invalid reset token.'}, status=status.HTTP_400_BAD_REQUEST)

        if reset_token.is_used:
            return Response({'detail': 'This reset token has already been used.'}, status=status.HTTP_400_BAD_REQUEST)

        if reset_token.is_expired:
            return Response({'detail': 'This reset token has expired.'}, status=status.HTTP_400_BAD_REQUEST)

        user = reset_token.user
        user.set_password(new_password)
        user.save(update_fields=['password'])
        reset_token.is_used = True
        reset_token.save(update_fields=['is_used'])

        return Response({'message': 'Password reset successful'})


class SecurityQuestionView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        username = request.query_params.get('username')
        if not username:
            return Response({'detail': 'Username is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'security_question': user.security_question,
            'use_telegram_recovery': user.use_telegram_recovery,
        })
