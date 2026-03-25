from datetime import datetime
import os
from urllib.parse import quote_plus
import xml.etree.ElementTree as ET

import requests
from groq import Groq
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

MANUAL_NEWS: list[dict] = []


def infer_sentiment(text: str) -> str:
    lowered = text.lower()
    positive_words = ["gain", "growth", "surge", "rally", "upgrade", "beat", "rise", "strong"]
    negative_words = ["fall", "drop", "cut", "miss", "weak", "loss", "slump", "decline"]
    if any(word in lowered for word in positive_words):
        return "Positive"
    if any(word in lowered for word in negative_words):
        return "Negative"
    return "Neutral"


def fetch_google_news(query: str, limit: int = 8) -> list[dict]:
    url = f"https://news.google.com/rss/search?q={quote_plus(query)}&hl=en-IN&gl=IN&ceid=IN:en"
    response = requests.get(url, timeout=10)
    response.raise_for_status()

    root = ET.fromstring(response.content)
    items = []
    for node in root.findall(".//item")[:limit]:
        title = (node.findtext("title") or "").strip()
        link = (node.findtext("link") or "").strip()
        published_at = (node.findtext("pubDate") or "").strip()
        source_node = node.find("source")
        source = (source_node.text or "Google News").strip() if source_node is not None else "Google News"

        items.append({
            "title": title,
            "url": link,
            "source": source,
            "published_at": published_at,
            "summary": title,
            "sentiment": infer_sentiment(title),
        })
    return items


def summarise_text(text: str, system_prompt: str) -> str:
    if not text.strip():
        return "No content available to summarise."
    if not client:
        return text[:280]

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text},
        ],
        max_tokens=200,
        temperature=0.4,
    )
    return response.choices[0].message.content


@api_view(["POST"])
@permission_classes([AllowAny])
def add_news_article(request):
    doc_id = request.query_params.get("doc_id") or request.data.get("doc_id")
    text = request.query_params.get("text") or request.data.get("text")
    source = request.query_params.get("source") or request.data.get("source") or ""

    if not doc_id or not text:
        return Response({"error": "doc_id and text are required"}, status=400)

    MANUAL_NEWS.insert(0, {
        "doc_id": doc_id,
        "title": text[:120],
        "url": "",
        "source": source or "Manual",
        "published_at": datetime.utcnow().isoformat() + "Z",
        "summary": text,
        "sentiment": infer_sentiment(text),
    })
    return Response({"message": f"News article '{doc_id}' added successfully!"})


@api_view(["GET"])
@permission_classes([AllowAny])
def search_news_articles(request):
    query = request.query_params.get("query", "stocks")
    try:
        fetched = fetch_google_news(f"{query} stock market")
    except Exception:
        fetched = []

    manual_matches = [
        item for item in MANUAL_NEWS
        if query.lower() in item.get("title", "").lower() or query.lower() in item.get("summary", "").lower()
    ]

    return Response({"results": (manual_matches + fetched)[:10]})


@api_view(["POST"])
@permission_classes([AllowAny])
def summarise_news(request):
    text = request.query_params.get("text") or request.data.get("text") or ""
    doc_id = request.query_params.get("doc_id") or request.data.get("doc_id") or "news-doc"
    source = request.query_params.get("source") or request.data.get("source") or ""

    if not text:
        return Response({"error": "text is required"}, status=400)

    summary = summarise_text(
        text,
        "You are a financial news summariser. Summarise the following stock news in 2-3 sentences.",
    )

    return Response({
        "doc_id": doc_id,
        "original": text,
        "summary": summary,
        "source": source,
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def search_and_summarise(request):
    query = request.query_params.get("query", "stocks")
    try:
        articles = fetch_google_news(f"{query} stock market", limit=5)
    except Exception:
        articles = []

    if not articles:
        return Response({"message": "No relevant news found"})

    combined = " ".join(article["title"] for article in articles)
    summary = summarise_text(
        combined,
        "You are a financial news summariser. Summarise these stock news articles in 3-4 sentences.",
    )

    return Response({
        "query": query,
        "summary": summary,
        "articles_found": len(articles),
    })
