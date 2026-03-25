from django.urls import path
from .views import ChatbotView, public_chat, personal_chat

urlpatterns = [
    path('ask/', ChatbotView.as_view(), name='chatbot'),
    path('public-chat/', public_chat, name='public-chat'),
    path('personal-chat/', personal_chat, name='personal-chat'),
]
