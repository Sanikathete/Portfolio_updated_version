from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Stock
from .serializers import StockSerializer
from .live_prices import (
    get_live_btc_price_in_inr,
    get_live_metals_in_inr,
    get_live_stock_quote,
    stocks_need_refresh,
    sync_stock_prices,
)

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
    if request.query_params.get("refresh") == "1" or stocks_need_refresh():
        sync_stock_prices()

    stocks = Stock.objects.all().values(
        "id", "symbol", "name", "sector", "exchange",
        "current_price", "currency"
    )
    return Response(list(stocks))


@api_view(["GET"])
@permission_classes([AllowAny])
def live_stock_quote(request):
    symbol = request.query_params.get("symbol", "")
    exchange = request.query_params.get("exchange", "")
    if not symbol:
        return Response({"error": "symbol is required"}, status=400)

    quote = get_live_stock_quote(symbol, exchange)
    if not quote:
        return Response({"error": "Unable to fetch live stock price"}, status=502)
    return Response(quote)


@api_view(["GET"])
@permission_classes([AllowAny])
def live_crypto_quote(request):
    symbol = str(request.query_params.get("symbol", "BTC")).upper()
    if symbol != "BTC":
        return Response({"error": "Only BTC is supported right now"}, status=400)

    quote = get_live_btc_price_in_inr()
    if not quote:
        return Response({"error": "Unable to fetch live crypto price"}, status=502)
    return Response(quote)


@api_view(["GET"])
@permission_classes([AllowAny])
def live_metals_quote(request):
    quote = get_live_metals_in_inr()
    if not quote:
        return Response({"error": "Unable to fetch live metal prices"}, status=502)
    return Response(quote)
