from rest_framework import serializers
from .models import Stock, QualityStock

class StockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stock
        fields = ['id', 'symbol', 'name', 'current_price', 
                  'currency', 'exchange', 'sector', 'updated_at']
        read_only_fields = ['updated_at']


class QualityStockSerializer(serializers.ModelSerializer):
    class Meta:
        model = QualityStock
        fields = '__all__'
