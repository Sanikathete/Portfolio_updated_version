from django.urls import path
from .views import PortfolioListView, PortfolioDetailView

urlpatterns = [
    path('', PortfolioListView.as_view(), name='portfolio-list'),
    path('<int:pk>/', PortfolioDetailView.as_view(), name='portfolio-detail'),
]
