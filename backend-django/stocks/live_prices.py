from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from time import time

import yfinance as yf
from django.db.models import QuerySet
from django.utils import timezone

from .models import Stock

TROY_OUNCE_TO_GRAMS = 31.1034768
QUOTE_TTL_SECONDS = 300
_QUOTE_CACHE: dict[str, tuple[float, dict]] = {}
BULK_BATCH_SIZE = 50


def _to_float(value) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _read_cache(key: str) -> dict | None:
    cached = _QUOTE_CACHE.get(key)
    if not cached:
        return None

    expires_at, payload = cached
    if time() >= expires_at:
        _QUOTE_CACHE.pop(key, None)
        return None
    return payload


def _write_cache(key: str, payload: dict) -> dict:
    _QUOTE_CACHE[key] = (time() + QUOTE_TTL_SECONDS, payload)
    return payload


def _latest_close(ticker: yf.Ticker) -> float | None:
    history = ticker.history(period="5d", interval="1d", auto_adjust=False)
    if history.empty or "Close" not in history:
        return None
    closes = history["Close"].dropna()
    if closes.empty:
        return None
    return _to_float(closes.iloc[-1])


def fetch_quote(ticker_symbol: str) -> dict:
    cache_key = f"quote:{ticker_symbol}"
    cached = _read_cache(cache_key)
    if cached is not None:
        return cached

    ticker = yf.Ticker(ticker_symbol)
    fast_info = getattr(ticker, "fast_info", None) or {}

    price = _to_float(fast_info.get("lastPrice") or fast_info.get("regularMarketPrice"))
    previous_close = _to_float(fast_info.get("previousClose"))
    currency = fast_info.get("currency")

    if price is None:
        price = _latest_close(ticker)

    info = {}
    if price is None or previous_close is None or not currency:
        try:
            info = ticker.info or {}
        except Exception:
            info = {}

    if price is None:
        price = _to_float(info.get("currentPrice") or info.get("regularMarketPrice"))
    if previous_close is None:
        previous_close = _to_float(info.get("previousClose") or info.get("regularMarketPreviousClose"))
    currency = currency or info.get("currency")

    if price is None:
        return {}

    change_percent = None
    if previous_close not in (None, 0):
        change_percent = ((price - previous_close) / previous_close) * 100

    return _write_cache(
        cache_key,
        {
            "ticker": ticker_symbol,
            "price": round(price, 2),
            "currency": currency or "",
            "previous_close": round(previous_close, 2) if previous_close is not None else None,
            "change_percent": round(change_percent, 2) if change_percent is not None else None,
        },
    )


def build_stock_ticker(symbol: str, exchange: str = "") -> str:
    raw_symbol = str(symbol or "").strip().upper()
    if not raw_symbol:
        return raw_symbol
    if any(token in raw_symbol for token in ("=", "^")) or raw_symbol.endswith((".NS", ".BO")):
        return raw_symbol

    exchange_upper = str(exchange or "").strip().upper()
    if exchange_upper in {"NSE", "NS"}:
        return f"{raw_symbol}.NS"
    if exchange_upper in {"BSE", "BO"}:
        return f"{raw_symbol}.BO"
    return raw_symbol


def get_live_stock_quote(symbol: str, exchange: str = "") -> dict:
    ticker = build_stock_ticker(symbol, exchange)
    quote = fetch_quote(ticker)
    if not quote:
        return {}
    return {
        "symbol": str(symbol or "").upper(),
        "exchange": exchange or "",
        "ticker": ticker,
        "price": quote["price"],
        "currency": quote["currency"] or "INR",
        "change_percent": quote["change_percent"],
        "source": "yfinance",
    }


def get_usd_inr_rate() -> float | None:
    quote = fetch_quote("USDINR=X")
    return _to_float(quote.get("price"))


def get_live_btc_price_in_inr() -> dict:
    btc_quote = fetch_quote("BTC-USD")
    usd_inr = get_usd_inr_rate()
    btc_usd = _to_float(btc_quote.get("price"))
    if btc_usd is None or usd_inr is None:
        return {}

    price_in_inr = btc_usd * usd_inr
    change_percent = _to_float(btc_quote.get("change_percent"))
    return {
        "symbol": "BTC",
        "price_inr": round(price_in_inr, 2),
        "price_usd": round(btc_usd, 2),
        "usd_inr": round(usd_inr, 4),
        "change_percent": round(change_percent, 2) if change_percent is not None else None,
        "source": "yfinance",
    }


def get_live_metals_in_inr() -> dict:
    gold_quote = fetch_quote("GC=F")
    silver_quote = fetch_quote("SI=F")
    usd_inr = get_usd_inr_rate()

    gold_usd_oz = _to_float(gold_quote.get("price"))
    silver_usd_oz = _to_float(silver_quote.get("price"))
    if gold_usd_oz is None or silver_usd_oz is None or usd_inr is None:
        return {}

    gold_inr_per_10g = gold_usd_oz * usd_inr * (10 / TROY_OUNCE_TO_GRAMS)
    silver_inr_per_10g = silver_usd_oz * usd_inr * (10 / TROY_OUNCE_TO_GRAMS)

    return {
        "gold_inr_per_10g": round(gold_inr_per_10g, 2),
        "silver_inr_per_10g": round(silver_inr_per_10g, 2),
        "gold_usd_per_oz": round(gold_usd_oz, 2),
        "silver_usd_per_oz": round(silver_usd_oz, 2),
        "usd_inr": round(usd_inr, 4),
        "gold_change_percent": gold_quote.get("change_percent"),
        "silver_change_percent": silver_quote.get("change_percent"),
        "source": "yfinance",
        "note": "Metal quotes are derived from global futures and converted to INR per 10 grams.",
    }


def _extract_bulk_close(history, ticker_symbol: str) -> float | None:
    if history is None:
        return None

    try:
        if getattr(history, "empty", True):
            return None
    except Exception:
        return None

    close_series = None

    try:
        columns = getattr(history, "columns", None)
        if columns is not None and getattr(columns, "nlevels", 1) > 1:
            if ticker_symbol in columns.get_level_values(0):
                close_series = history[ticker_symbol]["Close"]
        elif "Close" in history:
            close_series = history["Close"]
    except Exception:
        close_series = None

    if close_series is None:
        return None

    try:
        closes = close_series.dropna()
        if closes.empty:
            return None
        return _to_float(closes.iloc[-1])
    except Exception:
        return None


def _bulk_fetch_latest_prices(ticker_symbols: list[str]) -> dict[str, float]:
    if not ticker_symbols:
        return {}

    downloaded = yf.download(
        tickers=ticker_symbols,
        period="5d",
        interval="1d",
        auto_adjust=False,
        progress=False,
        threads=True,
        group_by="ticker",
    )

    results: dict[str, float] = {}
    for ticker_symbol in ticker_symbols:
        latest_price = _extract_bulk_close(downloaded, ticker_symbol)
        if latest_price is not None:
            results[ticker_symbol] = latest_price
    return results


@dataclass
class SyncResult:
    updated: int
    skipped: int


def sync_stock_prices(queryset: QuerySet[Stock] | None = None) -> SyncResult:
    stocks = list(queryset if queryset is not None else Stock.objects.all())
    updated = 0
    skipped = 0

    batches = [
        stocks[index:index + BULK_BATCH_SIZE]
        for index in range(0, len(stocks), BULK_BATCH_SIZE)
    ]

    for batch in batches:
        ticker_map = {
            build_stock_ticker(stock.symbol, stock.exchange): stock
            for stock in batch
        }

        batch_quotes = {}
        try:
            batch_quotes = _bulk_fetch_latest_prices(list(ticker_map.keys()))
        except Exception:
            batch_quotes = {}

        for ticker_symbol, stock in ticker_map.items():
            live_price = batch_quotes.get(ticker_symbol)

            if live_price is None:
                quote = get_live_stock_quote(stock.symbol, stock.exchange)
                live_price = _to_float(quote.get("price"))

            if live_price is None:
                skipped += 1
                continue

            if stock.current_price != live_price:
                stock.current_price = live_price
                stock.save(update_fields=["current_price", "updated_at"])
                updated += 1

    return SyncResult(updated=updated, skipped=skipped)


def stocks_need_refresh(max_age_minutes: int = 30) -> bool:
    latest_update = Stock.objects.order_by("-updated_at").values_list("updated_at", flat=True).first()
    if latest_update is None:
        return True
    return latest_update < timezone.now() - timedelta(minutes=max_age_minutes)
