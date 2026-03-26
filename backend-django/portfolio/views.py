from rest_framework import generics, status, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Portfolio, PortfolioItem
from stocks.models import Stock
from stocks.live_prices import get_live_stock_quote, sync_stock_prices


class StockMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = ["id", "symbol", "name", "current_price", "sector", "exchange", "currency"]


class PortfolioItemSerializer(serializers.ModelSerializer):
    stock = StockMiniSerializer(read_only=True)

    class Meta:
        model = PortfolioItem
        fields = ["id", "stock", "quantity", "buy_price"]


class PortfolioSerializer(serializers.ModelSerializer):
    items = PortfolioItemSerializer(many=True, read_only=True)

    class Meta:
        model = Portfolio
        fields = ["id", "name", "items"]


class PortfolioCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Portfolio
        fields = ["id", "name"]


class PortfolioListView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return PortfolioCreateSerializer
        return PortfolioSerializer

    def get_queryset(self):
        return Portfolio.objects.filter(user=self.request.user).prefetch_related(
            "items__stock"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PortfolioDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PortfolioSerializer

    def get_queryset(self):
        return Portfolio.objects.filter(user=self.request.user).prefetch_related(
            "items__stock"
        )

    def retrieve(self, request, *args, **kwargs):
        portfolio = self.get_object()
        stock_ids = list(portfolio.items.values_list("stock_id", flat=True))
        if stock_ids:
            sync_stock_prices(queryset=Stock.objects.filter(id__in=stock_ids))
            portfolio = self.get_queryset().get(pk=portfolio.pk)

        serializer = self.get_serializer(portfolio)
        return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_stock_to_portfolio(request, pk):
    try:
        portfolio = Portfolio.objects.get(pk=pk, user=request.user)
    except Portfolio.DoesNotExist:
        return Response({"error": "Portfolio not found"}, status=status.HTTP_404_NOT_FOUND)

    stock_id = request.data.get("stock_id")
    stock_symbol = request.data.get("stock_symbol")
    quantity = request.data.get("quantity", 1)
    buy_price = request.data.get("buy_price")

    try:
        if stock_id:
            stock = Stock.objects.get(pk=stock_id)
        elif stock_symbol:
            stock = Stock.objects.get(symbol=stock_symbol)
        else:
            return Response({"error": "Provide stock_id or stock_symbol"}, status=status.HTTP_400_BAD_REQUEST)
    except Stock.DoesNotExist:
        return Response({"error": "Stock not found"}, status=status.HTTP_404_NOT_FOUND)

    if not buy_price:
        quote = get_live_stock_quote(stock.symbol, stock.exchange)
        buy_price = quote.get("price") or stock.current_price

    item, created = PortfolioItem.objects.get_or_create(
        portfolio=portfolio,
        stock=stock,
        defaults={"quantity": quantity, "buy_price": buy_price},
    )
    if not created:
        item.quantity = float(item.quantity) + float(quantity)
        item.save()

    serializer = PortfolioItemSerializer(item)
    return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def remove_stock_from_portfolio(request, pk):
    try:
        portfolio = Portfolio.objects.get(pk=pk, user=request.user)
    except Portfolio.DoesNotExist:
        return Response({"error": "Portfolio not found"}, status=status.HTTP_404_NOT_FOUND)

    stock_id = request.data.get("stock_id")
    stock_symbol = request.data.get("stock_symbol")

    try:
        if stock_id:
            item = PortfolioItem.objects.get(portfolio=portfolio, stock_id=stock_id)
        elif stock_symbol:
            item = PortfolioItem.objects.get(portfolio=portfolio, stock__symbol=stock_symbol)
        else:
            return Response({"error": "Provide stock_id or stock_symbol"}, status=status.HTTP_400_BAD_REQUEST)
    except PortfolioItem.DoesNotExist:
        return Response({"error": "Stock not in portfolio"}, status=status.HTTP_404_NOT_FOUND)

    item.delete()
    return Response({"removed": True}, status=status.HTTP_200_OK)
