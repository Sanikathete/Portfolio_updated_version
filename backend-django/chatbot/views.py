from django.shortcuts import render

# Create your views here.
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from .chatbot import get_stock_answer

class ChatbotView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        question = request.data.get('question', '')
        if not question:
            return Response({'error': 'Question is required'}, status=400)
        
        try:
            answer = get_stock_answer(question)
            return Response({
                'question': question,
                'answer': answer
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)
