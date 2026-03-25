from rest_framework import serializers
from django.contrib.auth.hashers import make_password

from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'phone', 'created_at']
        read_only_fields = ['created_at']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    telegram_username = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    telegram_phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    telegram_chat_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    use_telegram_recovery = serializers.BooleanField(required=False, default=False)
    security_question = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    security_answer = serializers.CharField(required=False, allow_blank=True, allow_null=True, write_only=True)

    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'password',
            'phone',
            'telegram_username',
            'telegram_phone',
            'telegram_chat_id',
            'use_telegram_recovery',
            'security_question',
            'security_answer',
        ]

    def validate(self, attrs):
        use_telegram_recovery = attrs.get('use_telegram_recovery', False)

        if use_telegram_recovery:
            missing_fields = [
                field
                for field in ['telegram_username', 'telegram_phone']
                if not attrs.get(field)
            ]
            if missing_fields:
                raise serializers.ValidationError({
                    field: 'This field is required when using Telegram recovery.'
                    for field in missing_fields
                })
        else:
            if not attrs.get('security_question'):
                raise serializers.ValidationError({'security_question': 'This field is required when using a security question.'})
            if not attrs.get('security_answer'):
                raise serializers.ValidationError({'security_answer': 'This field is required when using a security question.'})

        return attrs

    def create(self, validated_data):
        security_answer = validated_data.pop('security_answer', None)
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            phone=validated_data.get('phone', ''),
            telegram_username=validated_data.get('telegram_username'),
            telegram_phone=validated_data.get('telegram_phone'),
            telegram_chat_id=validated_data.get('telegram_chat_id'),
            use_telegram_recovery=validated_data.get('use_telegram_recovery', False),
            security_question=validated_data.get('security_question'),
            security_answer=make_password(security_answer) if security_answer else None,
        )
        return user
