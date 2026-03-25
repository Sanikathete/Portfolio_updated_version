from django.urls import path
from .views import StockListView, StockDetailView, public_stocks

urlpatterns = [
    path('public-stocks/', public_stocks, name='public-stocks'),
    path('', StockListView.as_view(), name='stock-list'),
    path('<int:pk>/', StockDetailView.as_view(), name='stock-detail'),
]
