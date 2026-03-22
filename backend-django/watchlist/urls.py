from django.urls import path
from .views import WatchlistListView, WatchlistDetailView

urlpatterns = [
    path('', WatchlistListView.as_view(), name='watchlist-list'),
    path('<int:pk>/', WatchlistDetailView.as_view(), name='watchlist-detail'),
]
