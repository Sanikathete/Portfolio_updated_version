from django.urls import path
from .views import (
    WatchlistListView,
    WatchlistDetailView,
    add_stock_to_watchlist,
    remove_stock_from_watchlist,
    add_stock_simple,
    get_watchlist_simple,
)

urlpatterns = [
    path('watchlist/', get_watchlist_simple),
    path('watchlist/add', add_stock_simple),
    path('', WatchlistListView.as_view(), name='watchlist-list'),
    path('<int:pk>/', WatchlistDetailView.as_view(), name='watchlist-detail'),
    path('<int:pk>/add_stock/', add_stock_to_watchlist, name='watchlist-add-stock'),
    path('<int:pk>/remove_stock/', remove_stock_from_watchlist, name='watchlist-remove-stock'),
]
