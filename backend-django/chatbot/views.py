from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from .langgraph_agent import get_agent_answer

class ChatbotView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        question = request.data.get('question', '')
        if not question:
            return Response({'error': 'Question is required'}, status=400)
        
        try:
            result = get_agent_answer(question)
            return Response({
                'question': question,
                'answer': result['answer'],
                'agent_type': result['agent_type']
            })
        except Exception as e:
            return Response({'error': str(e)}, status=500)
