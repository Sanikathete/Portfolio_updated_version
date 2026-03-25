from django.urls import path
from .views import add_news_article, search_news_articles, summarise_news, search_and_summarise

urlpatterns = [
    path('add', add_news_article, name='news-add'),
    path('search', search_news_articles, name='news-search'),
    path('summarise', summarise_news, name='news-summarise'),
    path('search-summary', search_and_summarise, name='news-search-summary'),
]
