from django.urls import path
from .views import StockListView, StockDetailView

urlpatterns = [
    path('', StockListView.as_view(), name='stock-list'),
    path('<int:pk>/', StockDetailView.as_view(), name='stock-detail'),
]
