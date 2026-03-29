from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.utils import timezone
from .models import Stock, QualityStock
from .serializers import StockSerializer, QualityStockSerializer
from .quality_pipeline import run_pipeline
from .live_prices import (
    get_live_btc_price_in_inr,
    get_live_metals_in_inr,
    get_live_stock_quote,
    stocks_need_refresh,
    sync_stock_prices,
)


def _parse_limit(raw_limit: str | None) -> int | None:
    try:
        limit = int(raw_limit) if raw_limit else None
    except (TypeError, ValueError):
        return None
    return limit if limit and limit > 0 else None


def _refresh_queryset_prices(queryset):
    stock_ids = list(queryset.values_list("id", flat=True))
    if stock_ids:
        sync_stock_prices(queryset=Stock.objects.filter(id__in=stock_ids))


def _safe_refresh_queryset_prices(queryset):
    try:
        _refresh_queryset_prices(queryset)
        return True
    except Exception:
        return False


class StockListView(generics.ListAPIView):
    serializer_class = StockSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Stock.objects.all().order_by("symbol")
        symbol = self.request.query_params.get("symbol")
        if symbol:
            queryset = queryset.filter(symbol__iexact=symbol)
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        if request.query_params.get("refresh") == "1" or stocks_need_refresh():
            _safe_refresh_queryset_prices(queryset)
            queryset = self.filter_queryset(self.get_queryset())

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class StockDetailView(generics.RetrieveAPIView):
    serializer_class = StockSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Stock.objects.all()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.query_params.get("refresh") == "1" or stocks_need_refresh():
            try:
                sync_stock_prices(queryset=Stock.objects.filter(pk=instance.pk))
                instance.refresh_from_db()
            except Exception:
                pass

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

@api_view(["GET"])
@permission_classes([AllowAny])
def public_stocks(request):
    limit = _parse_limit(request.query_params.get("limit"))
    include_change = request.query_params.get("include_change") == "1"

    queryset = Stock.objects.all().order_by("symbol")
    if limit is not None:
        queryset = queryset[:limit]

    if request.query_params.get("refresh") == "1" or stocks_need_refresh():
        _safe_refresh_queryset_prices(queryset)
        queryset = Stock.objects.all().order_by("symbol")
        if limit is not None:
            queryset = queryset[:limit]

    stocks = list(queryset.values(
        "id", "symbol", "name", "sector", "exchange",
        "current_price", "currency"
    ))

    if include_change:
        for stock in stocks:
            try:
                quote = get_live_stock_quote(stock["symbol"], stock["exchange"])
            except Exception:
                quote = {}
            if not quote:
                stock["change_percent"] = None
                continue
            stock["current_price"] = quote["price"]
            stock["currency"] = quote["currency"]
            stock["change_percent"] = quote["change_percent"]
            stock["source"] = quote["source"]

    return Response(stocks)


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


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def quality_stocks_top3(request):
    today = timezone.localdate()
    queryset = QualityStock.objects.filter(date=today).order_by("rank")

    if not queryset.exists():
        run_pipeline()
        queryset = QualityStock.objects.filter(date=today).order_by("rank")

    serializer = QualityStockSerializer(queryset[:3], many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def quality_stocks_refresh(request):
    result = run_pipeline()
    count = len(result.get("filtered_stocks", []) or [])
    return Response({"status": "success", "stocks_processed": count})
