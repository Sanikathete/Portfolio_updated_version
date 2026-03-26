from rest_framework import generics, status, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Watchlist, WatchlistItem
from stocks.models import Stock
from stocks.live_prices import sync_stock_prices


class StockMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = ["id", "symbol", "name", "current_price", "sector", "exchange", "currency"]


class WatchlistItemSerializer(serializers.ModelSerializer):
    stock = StockMiniSerializer(read_only=True)
    created_at = serializers.DateTimeField(source="added_at", read_only=True)

    class Meta:
        model = WatchlistItem
        fields = ["id", "stock", "created_at"]


class WatchlistSerializer(serializers.ModelSerializer):
    items = WatchlistItemSerializer(many=True, read_only=True)

    class Meta:
        model = Watchlist
        fields = ["id", "name", "items"]


class WatchlistListView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = WatchlistSerializer

    def get_queryset(self):
        return Watchlist.objects.filter(user=self.request.user).prefetch_related("items__stock")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class WatchlistDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = WatchlistSerializer

    def get_queryset(self):
        return Watchlist.objects.filter(user=self.request.user).prefetch_related("items__stock")

    def retrieve(self, request, *args, **kwargs):
        watchlist = self.get_object()
        stock_ids = list(watchlist.items.values_list("stock_id", flat=True))
        if stock_ids:
            sync_stock_prices(queryset=Stock.objects.filter(id__in=stock_ids))
            watchlist = self.get_queryset().get(pk=watchlist.pk)

        serializer = self.get_serializer(watchlist)
        return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_stock_to_watchlist(request, pk):
    try:
        watchlist = Watchlist.objects.get(pk=pk, user=request.user)
    except Watchlist.DoesNotExist:
        return Response({"error": "Watchlist not found"}, status=status.HTTP_404_NOT_FOUND)

    stock_id = request.data.get("stock_id")
    stock_symbol = request.data.get("stock_symbol")

    try:
        if stock_id:
            stock = Stock.objects.get(pk=stock_id)
        elif stock_symbol:
            stock = Stock.objects.get(symbol=stock_symbol)
        else:
            return Response({"error": "Provide stock_id or stock_symbol"}, status=status.HTTP_400_BAD_REQUEST)
    except Stock.DoesNotExist:
        return Response({"error": "Stock not found"}, status=status.HTTP_404_NOT_FOUND)

    item, created = WatchlistItem.objects.get_or_create(watchlist=watchlist, stock=stock)
    return Response(
        {"id": item.id, "created": created, "stock_symbol": stock.symbol},
        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def remove_stock_from_watchlist(request, pk):
    try:
        watchlist = Watchlist.objects.get(pk=pk, user=request.user)
    except Watchlist.DoesNotExist:
        return Response({"error": "Watchlist not found"}, status=status.HTTP_404_NOT_FOUND)

    stock_id = request.data.get("stock_id")
    stock_symbol = request.data.get("stock_symbol")

    try:
        if stock_id:
            item = WatchlistItem.objects.get(watchlist=watchlist, stock_id=stock_id)
        elif stock_symbol:
            item = WatchlistItem.objects.get(watchlist=watchlist, stock__symbol=stock_symbol)
        else:
            return Response({"error": "Provide stock_id or stock_symbol"}, status=status.HTTP_400_BAD_REQUEST)
    except WatchlistItem.DoesNotExist:
        return Response({"error": "Stock not in watchlist"}, status=status.HTTP_404_NOT_FOUND)

    item.delete()
    return Response({"removed": True}, status=status.HTTP_200_OK)


@api_view(["POST"])
def add_stock_simple(request):
    from django.contrib.auth import authenticate
    username = request.query_params.get("username")
    password = request.query_params.get("password")
    stock_symbol = request.query_params.get("stock_symbol")

    user = authenticate(username=username, password=password)
    if not user:
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    watchlist, _ = Watchlist.objects.get_or_create(user=user, defaults={"name": "My Watchlist"})

    try:
        stock = Stock.objects.get(symbol=stock_symbol)
    except Stock.DoesNotExist:
        return Response({"error": "Stock not found"}, status=status.HTTP_404_NOT_FOUND)

    item, created = WatchlistItem.objects.get_or_create(watchlist=watchlist, stock=stock)
    return Response({"created": created, "stock_symbol": stock.symbol}, status=201 if created else 200)


@api_view(["GET"])
def get_watchlist_simple(request):
    from django.contrib.auth import authenticate
    username = request.query_params.get("username")
    password = request.query_params.get("password")

    user = authenticate(username=username, password=password)
    if not user:
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    watchlist, _ = Watchlist.objects.get_or_create(user=user, defaults={"name": "My Watchlist"})
    stock_ids = list(watchlist.items.values_list("stock_id", flat=True))
    if stock_ids:
        sync_stock_prices(queryset=Stock.objects.filter(id__in=stock_ids))
        watchlist = Watchlist.objects.prefetch_related("items__stock").get(pk=watchlist.pk)
    serializer = WatchlistSerializer(watchlist)
    return Response(serializer.data)
