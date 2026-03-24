from django.urls import path
from .views import PortfolioListView, PortfolioDetailView, add_stock_to_portfolio, remove_stock_from_portfolio

urlpatterns = [
    path('', PortfolioListView.as_view(), name='portfolio-list'),
    path('<int:pk>/', PortfolioDetailView.as_view(), name='portfolio-detail'),
    path('<int:pk>/add_stock/', add_stock_to_portfolio, name='portfolio-add-stock'),
    path('<int:pk>/remove_stock/', remove_stock_from_portfolio, name='portfolio-remove-stock'),
]
