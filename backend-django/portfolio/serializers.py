from rest_framework import serializers
from .models import Portfolio, PortfolioItem
from stocks.serializers import StockSerializer

class PortfolioItemSerializer(serializers.ModelSerializer):
    stock = StockSerializer(read_only=True)
    stock_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = PortfolioItem
        fields = ['id', 'stock', 'stock_id', 'quantity', 'buy_price', 'bought_at']
        read_only_fields = ['bought_at']

class PortfolioSerializer(serializers.ModelSerializer):
    items = PortfolioItemSerializer(many=True, read_only=True)

    class Meta:
        model = Portfolio
        fields = ['id', 'name', 'items', 'created_at']
        read_only_fields = ['created_at']
