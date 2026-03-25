from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from rest_framework.test import APIClient

from datetime import timedelta

from .models import PasswordResetToken, User


class PasswordRecoveryTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_hashes_security_answer(self):
        response = self.client.post('/api/users/register/', {
            'username': 'securityuser',
            'email': 'security@example.com',
            'password': 'ComplexPass123!',
            'security_question': 'What city were you born in?',
            'security_answer': 'Lisbon',
            'use_telegram_recovery': False,
        }, format='json')

        self.assertEqual(response.status_code, 201)
        user = User.objects.get(username='securityuser')
        self.assertNotEqual(user.security_answer, 'Lisbon')
        self.assertTrue(user.check_password('ComplexPass123!'))

    def test_security_answer_flow_returns_token(self):
        user = User.objects.create_user(
            username='answeruser',
            email='answer@example.com',
            password='ComplexPass123!',
            security_question='What was your first school?',
            security_answer=make_password('Lisbon'),
        )

        response = self.client.post('/api/users/forgot-password/security/', {
            'username': 'answeruser',
            'security_answer': 'Lisbon',
        }, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertIn('token', response.data)

    def test_reset_password_rejects_expired_token(self):
        user = User.objects.create_user(
            username='expireduser',
            email='expired@example.com',
            password='OldPass123!',
            security_question='What city were you born in?',
            security_answer='answer',
        )
        token = PasswordResetToken.objects.create(user=user)
        PasswordResetToken.objects.filter(pk=token.pk).update(
            created_at=timezone.now() - timedelta(minutes=16)
        )

        response = self.client.post('/api/users/reset-password/', {
            'token': token.token,
            'new_password': 'NewPass123!',
        }, format='json')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data['detail'], 'This reset token has expired.')
