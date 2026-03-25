from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

from datetime import timedelta
from uuid import uuid4


def generate_reset_token():
    return str(uuid4())


class User(AbstractUser):
    phone = models.CharField(max_length=15, blank=True, null=True)
    mpin = models.CharField(max_length=6, blank=True, null=True)
    telegram_username = models.CharField(max_length=150, blank=True, null=True)
    telegram_phone = models.CharField(max_length=20, blank=True, null=True)
    telegram_chat_id = models.CharField(max_length=100, blank=True, null=True)
    use_telegram_recovery = models.BooleanField(default=False)
    security_question = models.CharField(max_length=255, blank=True, null=True)
    security_answer = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.email


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.CharField(max_length=64, unique=True, default=generate_reset_token, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.username}:{self.token}'

    @property
    def is_expired(self):
        return timezone.now() - self.created_at > timedelta(minutes=15)
