from django.urls import path
from .views import (
    StockListView,
    StockDetailView,
    live_crypto_quote,
    live_metals_quote,
    live_stock_quote,
    public_stocks,
    quality_stocks_refresh,
    quality_stocks_top3,
)

urlpatterns = [
    path('public-stocks/', public_stocks, name='public-stocks'),
    path('live-stock/', live_stock_quote, name='live-stock-quote'),
    path('live-crypto/', live_crypto_quote, name='live-crypto-quote'),
    path('live-metals/', live_metals_quote, name='live-metals-quote'),
    path('quality-stocks/top3/', quality_stocks_top3, name='quality-stocks-top3'),
    path('quality-stocks/refresh/', quality_stocks_refresh, name='quality-stocks-refresh'),
    path('', StockListView.as_view(), name='stock-list'),
    path('<int:pk>/', StockDetailView.as_view(), name='stock-detail'),
]
