from django.shortcuts import render

# Create your views here.
from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate
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
    """Public endpoint: accepts username+password as query params."""
    username = request.query_params.get("username")
    password = request.query_params.get("password")

    user = authenticate(username=username, password=password)
    if not user:
        return Response({"error": "Invalid credentials"}, status=401)

    stocks = Stock.objects.all().values(
        "id", "symbol", "name", "sector", "exchange",
        "current_price", "pe_ratio", "market_cap",
        "week_52_high", "week_52_low", "currency"
    )
    return Response(list(stocks))
