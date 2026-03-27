import logging
import re
import time
from typing import List

from google import genai
from google.genai import types
import numpy as np
from django.conf import settings
from pgvector.django import CosineDistance
from google.api_core.exceptions import ResourceExhausted

logger = logging.getLogger(__name__)


def get_embedding(text: str) -> List[float]:
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    max_retries = getattr(settings, "GEMINI_EMBED_MAX_RETRIES", 5)
    base_sleep = getattr(settings, "GEMINI_EMBED_RETRY_SLEEP", 5)
    for attempt in range(1, max_retries + 1):
        try:
            result = client.models.embed_content(
                model=settings.GEMINI_EMBED_MODEL.replace("models/", ""),
                contents=text,
                config=types.EmbedContentConfig(
                    task_type="SEMANTIC_SIMILARITY",
                    output_dimensionality=settings.GEMINI_EMBED_DIM,
                ),
            )
            embedding = []
            if getattr(result, "embeddings", None):
                embedding = result.embeddings[0].values
            return np.array(embedding, dtype=float).tolist()
        except ResourceExhausted as exc:
            # Try to respect server-provided retry delay if present.
            delay = None
            match = re.search(r"retry in ([0-9.]+)s", str(exc), re.IGNORECASE)
            if match:
                delay = float(match.group(1))
            sleep_for = delay if delay is not None else base_sleep
            logger.warning("Gemini quota hit, retrying in %ss (attempt %s/%s)", sleep_for, attempt, max_retries)
            time.sleep(sleep_for)
        except Exception:
            raise
    return []


def _keyword_fallback(query: str, top_k: int = 5):
    from stocks.models import Stock

    query_words = [word.upper() for word in query.split() if len(word) > 2]
    matches = []
    seen = set()
    for stock in Stock.objects.all():
        symbol = str(stock.symbol).upper()
        name = str(stock.name).upper()
        sector = str(stock.sector or "").upper()
        if any(word in symbol or word in name or word in sector for word in query_words):
            if symbol and symbol not in seen:
                matches.append({
                    "symbol": stock.symbol,
                    "name": stock.name,
                    "sector": stock.sector,
                    "industry": getattr(stock, "industry", "") or "",
                    "exchange": stock.exchange,
                    "current_price": stock.current_price,
                    "similarity": None,
                })
                seen.add(symbol)
        if len(matches) >= top_k:
            break
    if not matches:
        for stock in Stock.objects.all()[:top_k]:
            matches.append({
                "symbol": stock.symbol,
                "name": stock.name,
                "sector": stock.sector,
                "industry": getattr(stock, "industry", "") or "",
                "exchange": stock.exchange,
                "current_price": stock.current_price,
                "similarity": None,
            })
    return matches


def get_similar_stocks(query: str, top_k: int = 5):
    from stocks.models import Stock

    try:
        query_embedding = get_embedding(query)
        if not query_embedding:
            return _keyword_fallback(query, top_k=top_k)

        qs = (
            Stock.objects.exclude(embedding__isnull=True)
            .annotate(distance=CosineDistance("embedding", query_embedding))
            .order_by("distance")[:top_k]
        )
        results = []
        for stock in qs:
            distance = float(stock.distance) if stock.distance is not None else None
            similarity = round(1 - distance, 4) if distance is not None else None
            results.append({
                "symbol": stock.symbol,
                "name": stock.name,
                "sector": stock.sector,
                "industry": getattr(stock, "industry", "") or "",
                "exchange": stock.exchange,
                "current_price": stock.current_price,
                "similarity": similarity,
            })
        return results or _keyword_fallback(query, top_k=top_k)
    except Exception as exc:
        logger.exception("Vector search failed; falling back to keyword search: %s", exc)
        return _keyword_fallback(query, top_k=top_k)


def generate_all_embeddings(batch_size: int = 100):
    from stocks.models import Stock

    qs = Stock.objects.filter(embedding__isnull=True)
    total = qs.count()
    logger.info("Generating embeddings for %s stocks", total)
    throttle = getattr(settings, "GEMINI_EMBED_THROTTLE_SECONDS", 0.0)
    while True:
        batch = list(qs[:batch_size])
        if not batch:
            break
        for stock in batch:
            try:
                stock.embedding = get_embedding(stock.embedding_text())
                if not stock.embedding:
                    continue
                stock.save(update_fields=["embedding"])
                logger.info("Embedded %s", stock.symbol)
            except Exception as exc:
                logger.exception("Failed to embed %s: %s", stock.symbol, exc)
            if throttle:
                time.sleep(throttle)
        qs = Stock.objects.filter(embedding__isnull=True)
