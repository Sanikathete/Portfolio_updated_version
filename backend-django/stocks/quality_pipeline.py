from __future__ import annotations

from typing import Any, Dict, List, TypedDict

from django.utils import timezone
from langgraph.graph import END, StateGraph
import yfinance as yf

from .models import Stock, QualityStock


class QualityPipelineState(TypedDict):
    stocks_data: List[Dict[str, Any]]
    scored_stocks: List[Dict[str, Any]]
    filtered_stocks: List[Dict[str, Any]]


_sentiment_pipeline = None
_sentiment_pipeline_error = None


def _get_sentiment_pipeline():
    global _sentiment_pipeline, _sentiment_pipeline_error
    if _sentiment_pipeline is not None:
        return _sentiment_pipeline
    if _sentiment_pipeline_error:
        return None
    try:
        from transformers import pipeline
        _sentiment_pipeline = pipeline("sentiment-analysis", model="ProsusAI/finbert", device=-1)
        return _sentiment_pipeline
    except Exception as exc:
        _sentiment_pipeline_error = exc
        return None


def _normalize_symbol(symbol: str, exchange: str | None, currency: str | None) -> str:
    sym = (symbol or "").strip()
    if not sym:
        return sym
    upper = sym.upper()
    if upper.endswith(".NS") or upper.endswith(".BO"):
        return upper

    ex = (exchange or "").upper()
    if "BSE" in ex:
        return f"{upper}.BO"
    if "NSE" in ex:
        return f"{upper}.NS"
    if (currency or "").upper() == "INR":
        return f"{upper}.NS"
    return upper


def fetch_stocks_node(state: QualityPipelineState) -> QualityPipelineState:
    stocks_data: List[Dict[str, Any]] = []
    for stock in Stock.objects.all():
        yf_symbol = _normalize_symbol(stock.symbol, stock.exchange, stock.currency)
        if not yf_symbol:
            continue
        try:
            info = yf.Ticker(yf_symbol).info or {}
        except Exception:
            continue

        current_price = info.get("currentPrice")
        pe_ratio = info.get("trailingPE")
        fifty_two_week_high = info.get("fiftyTwoWeekHigh")
        eps = info.get("trailingEps")
        debt_to_equity = info.get("debtToEquity")
        revenue_growth = info.get("revenueGrowth")
        company_name = info.get("shortName") or stock.name

        if all(value is None for value in [current_price, pe_ratio, fifty_two_week_high, eps, debt_to_equity, revenue_growth, company_name]):
            continue

        stocks_data.append({
            "symbol": stock.symbol,
            "yf_symbol": yf_symbol,
            "company_name": company_name,
            "current_price": current_price,
            "pe_ratio": pe_ratio,
            "fifty_two_week_high": fifty_two_week_high,
            "eps": eps,
            "debt_to_equity": debt_to_equity,
            "revenue_growth": revenue_growth,
        })

    return {
        **state,
        "stocks_data": stocks_data,
    }


def sentiment_analysis_node(state: QualityPipelineState) -> QualityPipelineState:
    scored: List[Dict[str, Any]] = []
    sentiment_model = _get_sentiment_pipeline()
    for stock in state.get("stocks_data", []):
        if sentiment_model is None:
            stock["sentiment_score"] = 0.0
            stock["sentiment_label"] = "Neutral"
            scored.append(stock)
            continue
        yf_symbol = stock.get("yf_symbol")
        news_items = []
        try:
            news_items = yf.Ticker(yf_symbol).news or []
        except Exception:
            news_items = []

        titles = [item.get("title") for item in news_items if item.get("title")]
        if not titles:
            stock["sentiment_score"] = 0.0
            stock["sentiment_label"] = "Neutral"
            scored.append(stock)
            continue

        raw_scores = []
        for title in titles:
            try:
                result = sentiment_model(title)[0]
                label = (result.get("label") or "").lower()
                score = float(result.get("score") or 0)
            except Exception:
                continue

            if "positive" in label:
                raw_scores.append(score)
            elif "negative" in label:
                raw_scores.append(-score)
            else:
                raw_scores.append(0.0)

        if not raw_scores:
            sentiment_score = 0.0
        else:
            sentiment_score = sum(raw_scores) / len(raw_scores)

        sentiment_score = max(-1.0, min(1.0, sentiment_score))
        if sentiment_score > 0.2:
            sentiment_label = "Bullish"
        elif sentiment_score < -0.2:
            sentiment_label = "Bearish"
        else:
            sentiment_label = "Neutral"

        stock["sentiment_score"] = sentiment_score
        stock["sentiment_label"] = sentiment_label
        scored.append(stock)

    return {
        **state,
        "scored_stocks": scored,
    }


def score_calculation_node(state: QualityPipelineState) -> QualityPipelineState:
    scored: List[Dict[str, Any]] = []
    for stock in state.get("scored_stocks", []):
        pe_ratio = stock.get("pe_ratio")
        current_price = stock.get("current_price")
        fifty_two_week_high = stock.get("fifty_two_week_high")
        sentiment_score = stock.get("sentiment_score")
        eps = stock.get("eps")
        debt_to_equity = stock.get("debt_to_equity")

        pe_points = 0
        if pe_ratio is not None:
            try:
                pe_value = float(pe_ratio)
                if pe_value < 15:
                    pe_points = 30
                elif pe_value < 25:
                    pe_points = 20
                elif pe_value < 40:
                    pe_points = 10
            except Exception:
                pe_points = 0

        discount_points = 0
        discount = None
        if current_price is not None and fifty_two_week_high:
            try:
                current_value = float(current_price)
                high_value = float(fifty_two_week_high)
                if high_value > 0:
                    discount = ((high_value - current_value) / high_value) * 100
                    if discount > 30:
                        discount_points = 25
                    elif discount >= 20:
                        discount_points = 18
                    elif discount >= 10:
                        discount_points = 10
                    else:
                        discount_points = 5
            except Exception:
                discount = None

        if sentiment_score is None:
            sentiment_score = 0.0
        try:
            sentiment_value = float(sentiment_score)
        except Exception:
            sentiment_value = 0.0
        sentiment_points = ((sentiment_value + 1) / 2) * 25

        eps_points = 0
        if eps is not None:
            try:
                eps_value = float(eps)
                eps_points = 10 if eps_value > 0 else 0
            except Exception:
                eps_points = 0

        debt_points = 5
        if debt_to_equity is not None:
            try:
                debt_value = float(debt_to_equity)
                if debt_value < 0.5:
                    debt_points = 10
                elif debt_value <= 1:
                    debt_points = 6
                else:
                    debt_points = 2
            except Exception:
                debt_points = 5

        quality_score = pe_points + discount_points + sentiment_points + eps_points + debt_points

        stock["discount_from_52w_high"] = discount
        stock["quality_score"] = float(round(quality_score, 2))
        scored.append(stock)

    scored.sort(key=lambda item: item.get("quality_score", 0), reverse=True)

    return {
        **state,
        "scored_stocks": scored,
    }


def filter_stocks_node(state: QualityPipelineState) -> QualityPipelineState:
    scored = state.get("scored_stocks", [])
    top_100 = scored[:100]
    top_50 = top_100[:50]
    top_30 = top_50[:30]

    for idx, stock in enumerate(top_30, start=1):
        stock["rank"] = idx

    return {
        **state,
        "filtered_stocks": top_30,
    }


def save_to_db_node(state: QualityPipelineState) -> QualityPipelineState:
    today = timezone.localdate()
    for stock in state.get("filtered_stocks", []):
        QualityStock.objects.update_or_create(
            symbol=stock.get("symbol"),
            date=today,
            defaults={
                "company_name": stock.get("company_name") or "",
                "pe_ratio": stock.get("pe_ratio"),
                "discount_from_52w_high": stock.get("discount_from_52w_high"),
                "sentiment_score": stock.get("sentiment_score"),
                "sentiment_label": stock.get("sentiment_label") or "Neutral",
                "eps": stock.get("eps"),
                "debt_to_equity": stock.get("debt_to_equity"),
                "revenue_growth": stock.get("revenue_growth"),
                "quality_score": stock.get("quality_score", 0),
                "rank": stock.get("rank", 0),
            },
        )

    return state


def run_pipeline() -> QualityPipelineState:
    graph = StateGraph(QualityPipelineState)
    graph.add_node("fetch_stocks", fetch_stocks_node)
    graph.add_node("sentiment_analysis", sentiment_analysis_node)
    graph.add_node("score_calculation", score_calculation_node)
    graph.add_node("filter_stocks", filter_stocks_node)
    graph.add_node("save_to_db", save_to_db_node)

    graph.set_entry_point("fetch_stocks")
    graph.add_edge("fetch_stocks", "sentiment_analysis")
    graph.add_edge("sentiment_analysis", "score_calculation")
    graph.add_edge("score_calculation", "filter_stocks")
    graph.add_edge("filter_stocks", "save_to_db")
    graph.add_edge("save_to_db", END)

    app = graph.compile()
    return app.invoke({"stocks_data": [], "scored_stocks": [], "filtered_stocks": []})
