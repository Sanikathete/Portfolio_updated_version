from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Stock
from .serializers import StockSerializer

class StockListView(generics.ListAPIView):
    queryset = Stock.objects.all()
    serializer_class = StockSerializer
    permission_classes = [permissions.IsAuthenticated]

class StockDetailView(generics.RetrieveAPIView):
    queryset = Stock.objects.all()
    serializer_class = StockSerializer
    permission_classes = [permissions.IsAuthenticated]

@api_view(["GET"])
@permission_classes([AllowAny])
def public_stocks(request):
    stocks = Stock.objects.all().values(
        "id", "symbol", "name", "sector", "exchange",
        "current_price", "currency"
    )
    return Response(list(stocks))
