import os
import re

import feedparser
import yfinance as yf
from groq import Groq
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from portfolio.models import PortfolioItem
from watchlist.models import WatchlistItem
from .embeddings import get_similar_stocks
from .langgraph_agent import get_agent_answer

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
client = Groq(api_key=GROQ_API_KEY)

PUBLIC_SYSTEM_PROMPT = """You are StockSphere AI, a helpful Indian stock market assistant.
You specialize in NSE-listed Indian stocks. You provide live prices, news,
stock analysis, and investment education. Always add disclaimer that this
is not financial advice."""

PERSONAL_SYSTEM_PROMPT = """You are StockSphere AI personal advisor.
You have access to the user's portfolio and watchlist. Provide personalized
analysis using their actual holdings data. Always add disclaimer."""

NEWS_FEEDS = {
    "general": [
        "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms",
        "https://www.moneycontrol.com/rss/marketreports.xml",
    ],
    "stock": "https://feeds.finance.yahoo.com/rss/2.0/headline?s={symbol}.NS&region=IN&lang=en-IN",
}


class ChatbotView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        question = request.data.get("question", "")
        if not question:
            return Response({"error": "Question is required"}, status=400)

        try:
            result = get_agent_answer(question)
            return Response({
                "question": question,
                "answer": result["answer"],
                "agent_type": result["agent_type"],
            })
        except Exception as e:
            return Response({"error": str(e)}, status=500)


def detect_question_type(message: str) -> str:
    msg = message.lower()
    us_keywords = ["us stock", "nyse", "nasdaq", "s&p", "dow jones", "wall street"]
    if any(k in msg for k in us_keywords):
        return "out_of_scope"
    if any(k in msg for k in ["hello", "hi ", "hey", "good morning", "good evening"]):
        return "greeting"
    if any(k in msg for k in ["price of", "what is the price", "current price", "live price"]):
        return "price_query"
    if any(k in msg for k in [
        "sector", "banking stocks", "it stocks", "pharma stocks",
        "fmcg stocks", "metal stocks", "energy stocks", "auto stocks",
        "power stocks", "steel stocks", "realty stocks", "media stocks",
        "top it", "top metal", "top energy", "top banking", "top pharma",
        "top auto", "top fmcg", "best it", "best metal", "best energy",
        "best banking", "best pharma", "best auto", "good energy",
        "good pharma", "good banking", "good it", "good metal",
    ]):
        return "sector_query"
    if any(k in msg for k in ["best stock", "recommend", "should i buy", "what to buy", "top stock"]):
        return "buy_advice"
    if any(k in msg for k in ["compare", "vs ", "versus", "better between"]):
        return "compare_stocks"
    if any(k in msg for k in ["long term", "5 year", "10 year"]):
        return "longterm_advice"
    if any(k in msg for k in ["short term", "swing", "quick profit"]):
        return "shortterm_advice"
    if any(k in msg for k in ["dividend", "passive income"]):
        return "dividend_query"
    if any(k in msg for k in ["ipo", "upcoming ipo", "new listing"]):
        return "ipo_query"
    if any(k in msg for k in ["market news", "today news", "market update"]):
        return "market_news"
    if any(k in msg for k in ["my portfolio", "my stocks", "my holdings"]):
        return "portfolio_analysis"
    if any(k in msg for k in ["avoid", "don't buy", "stay away", "risky stock"]):
        return "avoid_advice"
    return "general"


def is_portfolio_performance_question(message: str) -> bool:
    msg = message.lower()
    return any(phrase in msg for phrase in [
        "how is my portfolio",
        "how's my portfolio",
        "portfolio doing",
        "portfolio performance",
        "my portfolio doing",
        "portfolio return",
        "profit in my portfolio",
        "loss in my portfolio",
    ])


def is_best_performer_question(message: str) -> bool:
    msg = message.lower()
    return any(phrase in msg for phrase in [
        "best performing stock",
        "best performer",
        "top performing stock",
        "which stock is performing best",
        "which is my best",
    ])


def is_watchlist_suggestion_question(message: str) -> bool:
    msg = message.lower()
    return "watchlist" in msg and any(phrase in msg for phrase in [
        "should i add",
        "add anything",
        "what should i add",
        "what to add",
        "add to my watchlist",
    ])



def has_personal_terms(message: str) -> bool:
    msg = message.lower()
    return any(term in msg for term in [
        "my portfolio",
        "my stocks",
        "my holdings",
        "my watchlist",
        "portfolio",
        "watchlist",
        "holdings",
    ])


def format_recommended_stock(stock: dict) -> str:
    symbol = stock.get("symbol", "")
    name = stock.get("name", "")
    sector = stock.get("sector", "Unknown")
    try:
        current_price = float(stock.get("current_price", 0) or 0)
    except (TypeError, ValueError):
        current_price = 0.0
    return f"{name} ({symbol}) at Rs{current_price:.2f} in {sector}"


def resolve_symbol(name: str) -> str:
    """
    Dynamically resolve company name to stock symbol from DB.
    Tries exact symbol match first, then searches by company name.
    """
    from stocks.models import Stock

    name = name.strip()
    if not name:
        return ""

    stock = Stock.objects.filter(symbol__iexact=name).first()
    if stock:
        return stock.symbol

    stock = Stock.objects.filter(name__icontains=name).first()
    if stock:
        return stock.symbol

    return name.upper()


def stock_obj_to_dict(stock) -> dict:
    return {
        "symbol": stock.symbol,
        "name": stock.name,
        "sector": stock.sector,
        "exchange": stock.exchange,
        "current_price": stock.current_price,
        "currency": getattr(stock, "currency", ""),
    }


def is_news_query(message: str) -> bool:
    msg = message.lower()
    return any(k in msg for k in ["news", "headline", "headlines", "latest news", "update", "updates"])


def extract_stock_from_message_for_news(message: str):
    from stocks.models import Stock

    stopwords = {
        "news", "latest", "on", "about", "tell", "me", "of", "for",
        "stock", "stocks", "share", "shares"
    }
    for word in re.findall(r"[A-Za-z&]+", message):
        if word.lower() in stopwords:
            continue
        symbol = resolve_symbol(word)
        stock = Stock.objects.filter(symbol__iexact=symbol).first()
        if stock:
            return stock
    return None


def detect_recommendation_intent(query: str) -> str:
    query = query.lower()
    if any(w in query for w in ["short term", "short-term", "quick", "intraday"]):
        return "short_term"
    if any(w in query for w in ["long term", "long-term", "years", "future"]):
        return "long_term"
    if any(w in query for w in ["swing", "swing trading", "weekly", "monthly"]):
        return "swing"
    return "general"


def get_recommendations_by_intent(intent: str, top_k: int = 5):
    from stocks.models import Stock
    from django.db.models import Q
    import ast

    all_sectors = list(
        Stock.objects.values_list('sector', flat=True).distinct()
    )
    prompt = f"""
    Available stock sectors in database: {all_sectors}

    For a "{intent}" investment strategy, pick the 3 most suitable
    sectors from the list above. Return ONLY a Python list of exact
    sector names from the list. Nothing else.
    Example: ["Nifty IT", "Nifty FMCG", "Nifty Pharma"]
    """
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=100
    )
    try:
        sectors = ast.literal_eval(
            response.choices[0].message.content.strip()
        )
    except (ValueError, SyntaxError):
        sectors = []

    sector_filter = Q()
    for s in sectors:
        sector_filter |= Q(sector__iexact=s)

    stocks = Stock.objects.filter(sector_filter)[:top_k] if sectors else []
    return list(stocks), sectors


def llm_pick_sector(user_query: str, sectors: list) -> str:
    prompt = f"""
    Given the user query: "{user_query}"
    And these available stock sectors: {sectors}
    Return ONLY the single most relevant sector name exactly
    as it appears in the list. Return nothing else.
    """
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=50
    )
    return response.choices[0].message.content.strip()


def safe_float(value, default=0.0):
    try:
        if value in (None, ""):
            return float(default)
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def get_live_price(symbol: str) -> dict:
    try:
        ticker = yf.Ticker(f"{symbol}.NS")
        info = ticker.info
        price = info.get("currentPrice") or info.get("regularMarketPrice")
        high_52w = info.get("fiftyTwoWeekHigh")
        low_52w = info.get("fiftyTwoWeekLow")
        if price:
            return {
                "live_price": round(price, 2),
                "52w_high": round(high_52w, 2) if high_52w else None,
                "52w_low": round(low_52w, 2) if low_52w else None,
            }
    except Exception:
        pass
    return {}


def build_live_price_context(symbol: str, db_price) -> str:
    live = get_live_price(symbol)
    if live:
        return (
            f"LIVE Price (real-time NSE): Rs{live['live_price']}\n"
            f"52-Week High: Rs{live['52w_high']} | 52-Week Low: Rs{live['52w_low']}"
        )
    return f"Price (from StockSphere DB): Rs{db_price} (live price unavailable)"


def find_stock_in_db(message: str):
    from stocks.models import Stock

    stock_field_names = {field.name for field in Stock._meta.fields}
    has_pe_ratio = "pe_ratio" in stock_field_names
    has_market_cap = "market_cap" in stock_field_names
    has_week_52_high = "week_52_high" in stock_field_names
    has_week_52_low = "week_52_low" in stock_field_names

    words = message.upper().split()
    for word in words:
        if len(word) > 2:
            stock = Stock.objects.filter(symbol=word).first()
            if stock:
                return {
                    "symbol": stock.symbol,
                    "name": stock.name,
                    "sector": stock.sector,
                    "exchange": stock.exchange,
                    "current_price": safe_float(stock.current_price, 0),
                    "pe_ratio": safe_float(getattr(stock, "pe_ratio", None), 0) if has_pe_ratio else 0,
                    "market_cap": safe_float(getattr(stock, "market_cap", None), 0) if has_market_cap else 0,
                    "week_52_high": safe_float(getattr(stock, "week_52_high", None), 0) if has_week_52_high else 0,
                    "week_52_low": safe_float(getattr(stock, "week_52_low", None), 0) if has_week_52_low else 0,
                    "currency": stock.currency,
                }
    return None


def get_all_stocks_data():
    from stocks.models import Stock

    base_fields = ["id", "symbol", "name", "sector", "exchange", "current_price", "currency"]
    optional_fields = ["pe_ratio", "market_cap", "week_52_high", "week_52_low"]
    stock_field_names = {field.name for field in Stock._meta.fields}
    selected_fields = base_fields + [field for field in optional_fields if field in stock_field_names]

    return list(
        Stock.objects.all().values(*selected_fields)
    )


def find_stock(stocks: list, query: str):
    query_lower = query.lower()
    general_stock_list_phrases = [
        "best indian stocks",
        "indian stocks to buy",
        "best nse stocks",
        "top nse stocks",
        "best stocks in india",
        "india stocks to buy",
    ]
    if any(phrase in query_lower for phrase in general_stock_list_phrases):
        return None

    query_upper = query.upper()
    query_words = [w for w in query_upper.split() if len(w) > 2]

    for stock in stocks:
        symbol = str(stock.get("symbol", "")).upper()
        if symbol in query_words:
            return stock

    for stock in stocks:
        name = str(stock.get("name", "")).upper()
        name_words = name.split()
        for word in query_words:
            if word in name_words and len(word) > 3:
                return stock

    return None


def get_stocks_by_sector(user_query: str, top_k: int = 5):
    from stocks.models import Stock

    all_sectors = Stock.objects.values_list(
        'sector', flat=True
    ).distinct()

    query_lower = user_query.lower()
    stopwords = {
        "good", "best", "top", "stock", "stocks", "invest", "investment",
        "buy", "to", "in", "the", "for", "and", "of", "a", "an"
    }
    query_tokens = [
        w for w in re.findall(r"[a-z]+", query_lower)
        if w not in stopwords and len(w) > 2
    ]
    matched_sector = None
    for sector in all_sectors:
        if sector and any(
            word in sector.lower()
            for word in query_tokens
        ):
            matched_sector = sector
            break

    if not matched_sector:
        sectors_list = list(all_sectors)
        matched_sector = llm_pick_sector(user_query, sectors_list)

    if matched_sector:
        stocks = Stock.objects.filter(
            sector__iexact=matched_sector
        )[:top_k]
        return list(stocks), matched_sector

    return None, None


def format_price_with_currency(stock: dict) -> str:
    price = stock.get("current_price")
    currency = (stock.get("currency") or "").upper()
    exchange = str(stock.get("exchange", "")).upper()
    if currency:
        return f"{currency}{price}"
    if exchange == "NSE":
        return f"Rs{price}"
    if exchange in ("NYSE", "NASDAQ"):
        return f"${price}"
    return f"{price}"


def pick_diverse_stocks(primary_stocks: list, fallback_stocks: list, limit: int = 4):
    selected = []
    seen_symbols = set()
    seen_sectors = set()

    for pool in (primary_stocks or [], fallback_stocks or []):
        for stock in pool:
            symbol = stock.get("symbol")
            sector = (stock.get("sector") or "Unknown").strip()
            if not symbol or symbol in seen_symbols:
                continue
            if sector in seen_sectors and len(seen_sectors) < limit:
                continue
            selected.append(stock)
            seen_symbols.add(symbol)
            seen_sectors.add(sector)
            if len(selected) >= limit:
                return selected

    if len(selected) < limit:
        for stock in (primary_stocks or []) + (fallback_stocks or []):
            symbol = stock.get("symbol")
            if not symbol or symbol in seen_symbols:
                continue
            selected.append(stock)
            seen_symbols.add(symbol)
            if len(selected) >= limit:
                break

    return selected


def get_general_market_news(max_items: int = 5) -> list[str]:
    headlines = []
    for url in NEWS_FEEDS["general"]:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:max_items]:
                headlines.append(entry.title)
            if headlines:
                break
        except Exception:
            continue
    return headlines[:max_items]


def get_stock_news(symbol: str, max_items: int = 3) -> list[str]:
    try:
        url = NEWS_FEEDS["stock"].format(symbol=symbol.upper())
        feed = feedparser.parse(url)
        return [entry.title for entry in feed.entries[:max_items]]
    except Exception:
        return []


def format_news_context(headlines: list[str], label: str = "Latest Market News") -> str:
    if not headlines:
        return f"{label}: Not available right now."
    numbered = "\n".join([f"{i + 1}. {h}" for i, h in enumerate(headlines)])
    return f"{label}:\n{numbered}"


@api_view(["POST"])
@permission_classes([AllowAny])
def public_chat(request):
    message = request.query_params.get("message", "")
    if not message:
        return Response({"error": "Message is required"}, status=400)

    try:
        normalized = re.sub(r"[^a-z]+", " ", message.lower()).strip()
        greeting_tokens = {"hi", "hello", "hey", "hey there", "good morning", "good evening"}
        first_token = normalized.split()[0] if normalized else ""
        if normalized in greeting_tokens or first_token in {"hi", "hello", "hey"}:
            reply = "Hello! I'm StockSphere AI, your market assistant. How can I help you today?"
            return Response({
                "mode": "public",
                "message": message,
                "reply": reply,
            })

        stocks = get_all_stocks_data()
        question_type = detect_question_type(message)
        if question_type in ("sector_query", "buy_advice", "avoid_advice", "out_of_scope", "market_news", "ipo_query"):
            found_stock = None
        else:
            found_stock = find_stock(stocks, message) or find_stock_in_db(message)
        if not found_stock and is_news_query(message):
            news_stock = extract_stock_from_message_for_news(message)
            if news_stock:
                found_stock = stock_obj_to_dict(news_stock)
        use_personal_context = True
        if question_type == "buy_advice" and not has_personal_terms(message):
            use_personal_context = False

        if question_type == "market_news":
            general_news = get_general_market_news()
            news_headlines = format_news_context(
                general_news,
                label="Latest Indian Market News"
            )
            prompt = f"""User asked: {message}

{news_headlines}

Instructions:
- ONLY talk about the news headlines listed above
- Summarise each headline in 1-2 simple sentences
- Do NOT mention portfolio, watchlist, or any user data
- Do NOT suggest any stocks to buy
- Do NOT mention recommended stocks at all
- If no headlines are available say news is temporarily
  unavailable and suggest checking moneycontrol.com
- Add disclaimer: This is not financial advice."""
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": PUBLIC_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=600,
                temperature=0.7,
            )
            return Response({
                "mode": "public",
                "message": message,
                "question_type": question_type,
                "stock_found": False,
                "reply": response.choices[0].message.content,
            })

        if question_type == "greeting":
            reply = (
                "Hello! I'm StockSphere AI, your personal market assistant. "
                "How can I help you today?"
            )
            return Response({
                "mode": "personal",
                "message": message,
                "reply": reply,
            })
        pgvector_results = get_similar_stocks(message, top_k=5)

        msg_lower = message.lower()
        us_keywords = ["us stock", "us stocks", "us market", "american stock", "american stocks", "nyse", "nasdaq", "s&p", "dow jones", "wall street", "top nyse", "best nyse", "nyse stocks", "top nasdaq", "best nasdaq", "nasdaq stocks"]
        india_keywords = ["nse", "bse", "nse stocks", "best nse", "top nse", "indian stock", "indian stocks", "india market", "india stocks", "sensex", "nifty"]

        if any(k in msg_lower for k in us_keywords):
            pgvector_results = [s for s in pgvector_results if str(s.get("exchange", "")).upper() in ("NYSE", "NASDAQ")]
        elif any(k in msg_lower for k in india_keywords):
            pgvector_results = [s for s in pgvector_results if str(s.get("exchange", "")).upper() == "NSE"]

        live_price_ctx = ""
        stock_news_ctx = ""

        stock_news_list = []
        if found_stock:
            symbol = resolve_symbol(found_stock.get("symbol", ""))
            live_price_ctx = build_live_price_context(symbol, found_stock.get("current_price"))
            stock_news_list = get_stock_news(symbol)
            stock_news_ctx = format_news_context(
                stock_news_list, label=f"Latest News for {symbol}"
            )
            if is_news_query(message) and not stock_news_list:
                live = get_live_price(symbol)
                live_price = live.get("live_price") if live else "N/A"
                high_52w = live.get("52w_high") if live else "N/A"
                low_52w = live.get("52w_low") if live else "N/A"
                reply = (
                    f"Live news for {found_stock.get('name', symbol)} is not available right now.\n\n"
                    f"Here are the latest price details for {symbol}:\n"
                    f"• Live Price: Rs{live_price}\n"
                    f"• 52-Week High: Rs{high_52w}\n"
                    f"• 52-Week Low: Rs{low_52w}\n\n"
                    "For the latest news visit moneycontrol.com or nseindia.com.\n\n"
                    "This is not financial advice. Please consult a SEBI-registered advisor."
                )
                return Response({
                    "mode": "public",
                    "message": message,
                    "question_type": "news",
                    "stock_found": True,
                    "reply": reply,
                })

        if found_stock:
            stock_context = f"""
Symbol       : {found_stock.get('symbol')}
Company Name : {found_stock.get('name')}
Sector       : {found_stock.get('sector')}
Exchange     : {found_stock.get('exchange')}
Market Cap   : {found_stock.get('market_cap', 'N/A')}
P/E Ratio    : {found_stock.get('pe_ratio', 'N/A')}
{live_price_ctx}
"""
            prompt = f"""User asked: {message}

Stock data:
{stock_context}

{stock_news_ctx}

Question type: {question_type}

Instructions:
- Use the LIVE price provided above - do not guess prices
- If news is available, naturally mention 1-2 relevant headlines
- If buy/sell advice: Give balanced view using price vs 52-week range
- If price query: Clearly state the live price
- If general info: Explain what the company does, sector, key metrics
- Always add disclaimer: This is not financial advice."""
        elif question_type == "price_query":
            words = [w.upper() for w in message.split() if w.isalpha() and len(w) > 2]
            live_results = []
            seen = set()
            for w in words:
                sym = resolve_symbol(w)
                if not sym or sym in seen:
                    continue
                seen.add(sym)
                live = get_live_price(sym)
                if live:
                    live_results.append(f"{sym}: Rs{live['live_price']} (52W H: Rs{live['52w_high']} | L: Rs{live['52w_low']})")

            live_text = "\n".join(live_results) if live_results else "Could not fetch live price for the requested stock."
            prompt = f"""User asked: {message}

Live NSE Price Data:
{live_text}

Similar stocks: {[s.get('symbol') for s in pgvector_results]}

Instructions:
- State the live price clearly
- Mention 52-week high/low for context
- If price not found, suggest checking the symbol spelling
- Add disclaimer: Prices are live from NSE via yfinance."""
        elif question_type == "avoid_advice":
            sample_text = "\n".join([
                f"- {s.get('symbol')} | {s.get('name')} | {'Rs' if str(s.get('exchange', '')).upper() == 'NSE' else '$'}{s.get('current_price')} | {s.get('sector')} | {s.get('exchange', 'NSE')}"
                for s in stocks[:20]
            ])
            prompt = f"""User asked: {message}

Sample stocks from database:
{sample_text}

Instructions:
- Explain what types of stocks beginners should be careful about
- Mention warning signs: penny stocks, unknown companies, very high P/E
- Suggest safer alternatives like blue chip / large cap stocks
- Always add: This is not financial advice. Please consult a SEBI-registered advisor."""
        elif question_type == "out_of_scope":
            prompt = f"""User asked: {message}

Instructions:
- Politely inform the user that StockSphere currently covers only NSE-listed Indian stocks
- Do NOT suggest Indian stocks as replacements for NYSE/NASDAQ stocks
- Tell them they can explore available NSE stocks on StockSphere
- Suggest they check Yahoo Finance or Google Finance for US stock data
- Keep it short, friendly, and helpful
- Add disclaimer: This is not financial advice."""
        elif question_type == "buy_advice":
            intent = detect_recommendation_intent(message)
            rec_stocks, _ = get_recommendations_by_intent(intent, top_k=5)
            sample_stocks = rec_stocks[:4]
            if not sample_stocks:
                reply = (
                    "No stocks from this sector are currently available in StockSphere. "
                    "This is not financial advice. Please consult a SEBI-registered advisor."
                )
                return Response({
                    "mode": "public",
                    "message": message,
                    "question_type": "buy_advice",
                    "stock_found": False,
                    "reply": reply,
                })
            sample_text = "\n".join([
                f"- {s.symbol} | {s.name} | Rs{s.current_price} | {s.sector} | {s.exchange}"
                for s in sample_stocks
            ])
            prompt = f"""User asked: {message}

Relevant stocks:
{sample_text}

Instructions:
- Suggest 3-4 stocks from different sectors
- Explain briefly why each might be worth looking at
- Mention StockSphere has NSE stocks to explore
- Always add: This is not financial advice. Do your own research and consult a SEBI-registered advisor."""
        elif question_type == "sector_query":
            sector_stocks, matched_sector = get_stocks_by_sector(message, top_k=5)
            if not sector_stocks:
                reply = (
                    "No stocks from this sector are currently available in StockSphere. "
                    "This is not financial advice. Please consult a SEBI-registered advisor."
                )
                return Response({
                    "mode": "public",
                    "message": message,
                    "question_type": "sector_query",
                    "stock_found": False,
                    "reply": reply,
                })

            sector_text = "\n".join([
                f"- {s.symbol} | {s.name} | {format_price_with_currency(stock_obj_to_dict(s))}"
                for s in sector_stocks
            ]) or "No specific sector stocks found."
            exchanges_in_list = {str(s.exchange).upper() for s in sector_stocks if s}
            market_scope = "India (NSE) and US (NYSE/NASDAQ)" if exchanges_in_list & {"NYSE", "NASDAQ"} and "NSE" in exchanges_in_list else "India (NSE)" if "NSE" in exchanges_in_list else "US (NYSE/NASDAQ)" if exchanges_in_list & {"NYSE", "NASDAQ"} else "available markets"
            prompt = f"""User asked: {message}

Sector stocks from database:
{sector_text}

Instructions:
- Explain the current outlook for this sector for {market_scope}
- Mention 2-3 stocks from the list as examples
- Explain key factors affecting this sector
- Add disclaimer about investment advice."""
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": PUBLIC_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=600,
                temperature=0.7,
            )
            return Response({
                "mode": "public",
                "message": message,
                "question_type": "sector_query",
                "stock_found": False,
                "reply": response.choices[0].message.content,
            })
        elif question_type == "greeting":
            prompt = f"""User said: {message}

Instructions:
- Greet the user warmly as StockSphere AI
- Do NOT mention portfolio data, stocks, or recommendations
- Tell them you can help with: live stock prices, stock news,
  buy recommendations, sector analysis, IPO info,
  dividend stocks, long term and short term investing
- Mention they can login for personal portfolio analysis
- Keep it short, friendly, and under 5 lines
- Do not add any disclaimer for greetings"""
        elif question_type == "compare_stocks":
            stopwords = {
                "COMPARE", "VERSUS", "BETTER", "WHICH", "BETWEEN",
                "AND", "THE", "FOR", "TOP", "BEST", "GOOD", "WITH",
                "WHAT", "HOW", "ARE", "STOCK", "STOCKS", "INDIA"
            }
            symbols_in_msg = [
                resolve_symbol(w) for w in message.split()
                if w.isalpha() and len(w) > 2
                and w.upper() not in stopwords
            ]
            live_compare = []
            unavailable_symbols = []
            seen = set()
            for sym in symbols_in_msg:
                if not sym or sym in seen:
                    continue
                seen.add(sym)
                if len(seen) > 2:
                    break
                live = get_live_price(sym)
                if live and live.get("live_price"):
                    live_compare.append(
                        f"{sym}: Live Rs{live['live_price']} | "
                        f"52W High Rs{live['52w_high']} | "
                        f"52W Low Rs{live['52w_low']}"
                    )
                else:
                    unavailable_symbols.append(sym)

            live_compare_text = (
                "\n".join(live_compare)
                if live_compare
                else "No live data available for these stocks."
            )

            if unavailable_symbols:
                unavailable_note = (
                    "IMPORTANT: The following stocks have NO data "
                    "in StockSphere: " + ", ".join(unavailable_symbols) +
                    ". You MUST tell the user these stocks are not "
                    "available and suggest checking nseindia.com"
                )
            else:
                unavailable_note = ""
            prompt = f"""User asked: {message}

Live Prices:
{live_compare_text}

Similar stocks: {pgvector_results}

Instructions:
{unavailable_note}
- If any stock has no data, clearly say so first
- Do NOT make up or guess data for unavailable stocks
- Only compare stocks where live data was fetched above
- Add disclaimer: This is not financial advice."""
        elif question_type == "longterm_advice":
            intent = detect_recommendation_intent(message)
            rec_stocks, _ = get_recommendations_by_intent(intent, top_k=5)
            sample_stocks = rec_stocks if rec_stocks else []
            if not sample_stocks:
                reply = (
                    "No stocks from this sector are currently available in StockSphere. "
                    "This is not financial advice. Please consult a SEBI-registered advisor."
                )
                return Response({
                    "mode": "public",
                    "message": message,
                    "question_type": "longterm_advice",
                    "stock_found": False,
                    "reply": reply,
                })
            sample_text = "\n".join([
                f"- {s.symbol} | {s.name} | {'Rs' if str(s.exchange).upper() == 'NSE' else '$'}{s.current_price} | {s.sector} | {s.exchange}"
                for s in sample_stocks
            ])
            prompt = f"""User asked: {message}

Stocks from database:
{sample_text}

Instructions:
- Suggest 3-4 stocks good for long term (5-10 years)
- Focus on stable, large cap, fundamentally strong companies
- Explain why each is suitable for long term holding
- Mention benefits of SIP and portfolio diversification
- Add disclaimer: This is not financial advice."""
        elif question_type == "shortterm_advice":
            intent = detect_recommendation_intent(message)
            rec_stocks, _ = get_recommendations_by_intent(intent, top_k=5)
            sample_stocks = rec_stocks if rec_stocks else []
            if not sample_stocks:
                reply = (
                    "No stocks from this sector are currently available in StockSphere. "
                    "This is not financial advice. Please consult a SEBI-registered advisor."
                )
                return Response({
                    "mode": "public",
                    "message": message,
                    "question_type": "shortterm_advice",
                    "stock_found": False,
                    "reply": reply,
                })
            sample_text = "\n".join([
                f"- {s.symbol} | {s.name} | {'Rs' if str(s.exchange).upper() == 'NSE' else '$'}{s.current_price} | {s.sector} | {s.exchange}"
                for s in sample_stocks
            ])
            prompt = f"""User asked: {message}

Available stocks:
{sample_text}

Instructions:
- Suggest 3-4 stocks suitable for short term trading or swing trading
- Mention typical holding period (days to weeks)
- Explain what makes a stock good for short term trading (volume, volatility, momentum)
- Warn about higher risk in short term trading
- Add disclaimer: This is not financial advice. Please consult a SEBI-registered advisor."""
        elif question_type == "dividend_query":
            sample_stocks = pgvector_results if pgvector_results else stocks[:20]
            sample_text = "\n".join([
                f"- {s.get('symbol')} | {s.get('name')} | {'Rs' if str(s.get('exchange', '')).upper() == 'NSE' else '$'}{s.get('current_price')} | {s.get('sector')} | {s.get('exchange', 'NSE')}"
                for s in sample_stocks
            ])
            prompt = f"""User asked: {message}

Available stocks:
{sample_text}

Instructions:
- Explain what dividend yield means
- Suggest sectors known for good dividends (FMCG, PSU banks, utilities)
- Mention 3-4 stocks from the list that are typically known for dividends
- Explain how to check dividend history
- Add disclaimer: This is not financial advice. Please consult a SEBI-registered advisor."""
        elif question_type == "ipo_query":
            prompt = f"""User asked: {message}

Instructions:
- Do NOT mention any specific IPO company names
- Do NOT recommend any stocks from the database
- Tell the user to visit these websites for latest IPOs:
  1. nseindia.com
  2. sebi.gov.in
  3. moneycontrol.com
  4. chittorgarh.com
- Explain what an IPO is in 2-3 simple sentences
- Explain the steps to apply for an IPO in India using
  ASBA method through net banking or UPI
- Keep the response focused only on IPOs
- Add disclaimer: This is not financial advice.
  Please consult a SEBI-registered advisor."""
        elif question_type == "portfolio_analysis":
            prompt = f"""User asked: {message}

Instructions:
- Explain what a well-diversified portfolio looks like
- Suggest spreading investments across sectors: IT, Banking, Pharma, FMCG, Energy
- Recommend the user use StockSphere personal chat (post-login) for actual portfolio analysis
- Add disclaimer: This is not financial advice."""
        else:
            upper_words = [w for w in message.split() if w.isupper() and len(w) > 2]
            if not found_stock and upper_words:
                stock_name = upper_words[0]
                similar_symbols = [s.get("symbol") for s in pgvector_results]
                prompt = f"""User asked about: {message}

The stock "{stock_name}" was not found in our StockSphere database.

Instructions:
- Politely tell the user this stock is not in our database
- Suggest they verify the NSE symbol spelling
- Suggest these similar stocks: {similar_symbols}
- Tell them they can explore our NSE stocks
- Be helpful and friendly."""
            else:
                prompt = f"""User asked: {message}

Instructions:
- Answer this general stock market or finance question clearly
- Use simple language suitable for Indian investors
- Add disclaimer if any investment advice is given."""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": PUBLIC_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=600,
            temperature=0.7,
        )

        return Response({
            "mode": "public",
            "message": message,
            "question_type": question_type,
            "stock_found": found_stock is not None,
            "reply": response.choices[0].message.content,
        })
    except Exception as exc:
        return Response({"error": str(exc)}, status=500)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def personal_chat(request):
    message = request.query_params.get("message", "")
    if not message:
        return Response({"error": "Message is required"}, status=400)

    try:
        if not GROQ_API_KEY:
            return Response({"error": "Chatbot is not configured. Missing GROQ_API_KEY."}, status=503)

        user = request.user
        normalized = re.sub(r"[^a-z]+", " ", message.lower()).strip()
        greeting_tokens = {"hi", "hello", "hey", "hey there", "good morning", "good evening"}
        first_token = normalized.split()[0] if normalized else ""
        if normalized in greeting_tokens or first_token in {"hi", "hello", "hey"}:
            reply = "Hello! I'm StockSphere AI, your personal market assistant. How can I help you today?"
            return Response({
                "mode": "personal",
                "message": message,
                "reply": reply,
            })
        portfolio_id_raw = request.query_params.get("portfolio_id")
        selected_portfolio_id = None
        if portfolio_id_raw not in (None, ""):
            try:
                selected_portfolio_id = int(portfolio_id_raw)
            except (TypeError, ValueError):
                return Response({"error": "Invalid portfolio_id"}, status=400)

        stocks = get_all_stocks_data()
        question_type = detect_question_type(message)
        if question_type in ("sector_query", "buy_advice", "avoid_advice", "out_of_scope", "market_news", "ipo_query"):
            found_stock = None
        else:
            found_stock = find_stock(stocks, message) or find_stock_in_db(message)
        question_type = detect_question_type(message)
        use_personal_context = True
        if question_type == "buy_advice" and not has_personal_terms(message):
            use_personal_context = False

        pgvector_results = get_similar_stocks(message, top_k=5)

        if question_type == "greeting":
            reply = "Hello! I'm StockSphere AI, your personal market assistant. How can I help you today?"
            return Response({
                "mode": "personal",
                "message": message,
                "reply": reply,
            })

        if question_type == "market_news":
            general_news = get_general_market_news()
            news_headlines = format_news_context(
                general_news,
                label="Latest Indian Market News"
            )
            prompt = f"""User asked: {message}

{news_headlines}

Instructions:
- ONLY talk about the news headlines listed above
- Summarise each headline in 1-2 simple sentences
- Do NOT mention portfolio, watchlist, or any user data
- Do NOT suggest any stocks to buy
- Do NOT mention recommended stocks at all
- If no headlines are available say news is temporarily
  unavailable and suggest checking moneycontrol.com
- Add disclaimer: This is not financial advice."""
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": PERSONAL_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=800,
                temperature=0.7,
            )
            return Response({
                "mode": "personal",
                "message": message,
                "reply": response.choices[0].message.content,
                "portfolio_stats": {
                    "best_performing": None,
                    "most_profitable": None,
                    "highest_price_stock": None,
                    "lowest_price_stock": None,
                },
                "recommendations": [],
            })

        if question_type == "sector_query":
            sector_stocks, matched_sector = get_stocks_by_sector(message, top_k=5)
            if not sector_stocks:
                reply = (
                    "No stocks from this sector are currently available in StockSphere. "
                    "This is not financial advice. Please consult a SEBI-registered advisor."
                )
                return Response({
                    "mode": "personal",
                    "message": message,
                    "question_type": "sector_query",
                    "stock_found": False,
                    "reply": reply,
                })

            sector_text = "\n".join([
                f"- {s.symbol} | {s.name} | Rs{s.current_price}"
                for s in sector_stocks
            ]) or "No specific sector stocks found."
            prompt = f"""User asked: {message}

Sector stocks from database:
{sector_text}

Instructions:
- Explain the current outlook for this sector in India
- Mention 2-3 stocks from the list as examples
- Explain key factors affecting this sector
- Add disclaimer about investment advice."""
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": PUBLIC_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=600,
                temperature=0.7,
            )
            return Response({
                "mode": "personal",
                "message": message,
                "question_type": "sector_query",
                "stock_found": False,
                "reply": response.choices[0].message.content,
            })

        if question_type == "ipo_query":
            prompt = f"""User asked: {message}

Instructions:
- Do NOT mention any specific IPO company names
- Do NOT recommend any stocks from the database
- Tell the user to visit these websites for latest IPOs:
  1. nseindia.com
  2. sebi.gov.in
  3. moneycontrol.com
  4. chittorgarh.com
- Explain what an IPO is in 2-3 simple sentences
- Explain the steps to apply for an IPO in India using
  ASBA method through net banking or UPI
- Keep the response focused only on IPOs
- Add disclaimer: This is not financial advice.
  Please consult a SEBI-registered advisor."""
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": PERSONAL_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=800,
                temperature=0.7,
            )
            return Response({
                "mode": "personal",
                "message": message,
                "reply": response.choices[0].message.content,
                "portfolio_stats": {
                    "best_performing": None,
                    "most_profitable": None,
                    "highest_price_stock": None,
                    "lowest_price_stock": None,
                },
                "recommendations": [],
            })

        portfolio_items_qs = PortfolioItem.objects.filter(portfolio__user=user)
        if selected_portfolio_id is not None:
            portfolio_items_qs = portfolio_items_qs.filter(portfolio_id=selected_portfolio_id)

        portfolio_items = portfolio_items_qs.select_related("stock", "portfolio")
        watchlist_items = WatchlistItem.objects.filter(
            watchlist__user=user
        ).select_related("stock", "watchlist")

        portfolio_analysis = []
        for item in portfolio_items:
            symbol = item.stock.symbol
            avg_buy_price = float(item.buy_price or 0)
            quantity = float(item.quantity or 0)
            live_data = get_live_price(symbol)
            if not live_data:
                continue
            try:
                live_price = float(live_data.get("live_price"))
            except (TypeError, ValueError):
                continue

            profit_pct = round(((live_price - avg_buy_price) / avg_buy_price) * 100, 2) if avg_buy_price > 0 else 0
            abs_profit = round(quantity * (live_price - avg_buy_price), 2)

            portfolio_analysis.append({
                "symbol": symbol,
                "name": item.stock.name,
                "live_price": live_price,
                "avg_buy_price": avg_buy_price,
                "quantity": quantity,
                "profit_pct": profit_pct,
                "abs_profit": abs_profit,
                "sector": item.stock.sector,
            })

        if portfolio_analysis:
            best_performing = max(portfolio_analysis, key=lambda x: x["profit_pct"])
            most_profitable = max(portfolio_analysis, key=lambda x: x["abs_profit"])
            highest_price_stock = max(portfolio_analysis, key=lambda x: x["live_price"])
            lowest_price_stock = min(portfolio_analysis, key=lambda x: x["live_price"])
        else:
            best_performing = None
            most_profitable = None
            highest_price_stock = None
            lowest_price_stock = None

        recommended_stocks = []
        seen_symbols = set()
        for stock in stocks:
            include_stock = False
            try:
                pe_raw = stock.get("pe_ratio")
                pe_ratio = float(pe_raw) if pe_raw not in (None, "") else None
                if pe_ratio is None or pe_ratio < 25:
                    include_stock = True
            except (TypeError, ValueError):
                include_stock = False

            try:
                current_price = float(stock.get("current_price", 0))
                week_52_low = float(stock.get("week_52_low", 0))
                if week_52_low > 0 and current_price <= week_52_low * 1.2:
                    include_stock = True
            except (TypeError, ValueError):
                pass

            symbol = stock.get("symbol", "")
            if include_stock and symbol not in seen_symbols:
                recommended_stocks.append(stock)
                seen_symbols.add(symbol)
            if len(recommended_stocks) >= 5:
                break

        if len(recommended_stocks) < 5:
            for stock in stocks:
                symbol = stock.get("symbol", "")
                if symbol in seen_symbols:
                    continue
                recommended_stocks.append(stock)
                seen_symbols.add(symbol)
                if len(recommended_stocks) >= 5:
                    break

        recommendation_intent = detect_recommendation_intent(message)
        if question_type in ("buy_advice", "longterm_advice", "shortterm_advice") or recommendation_intent in ("short_term", "long_term", "swing"):
            rec_stocks, _ = get_recommendations_by_intent(recommendation_intent, top_k=5)
            if rec_stocks:
                recommended_stocks = [stock_obj_to_dict(s) for s in rec_stocks]

        if found_stock is not None:
            symbol = resolve_symbol(found_stock.get("symbol", ""))
            live_price_ctx = build_live_price_context(symbol, found_stock.get("current_price"))
            stock_news_list = get_stock_news(symbol)
            stock_news_ctx = format_news_context(stock_news_list, label=f"Latest News for {symbol}")
            if is_news_query(message) and not stock_news_list:
                live = get_live_price(symbol)
                live_price = live.get("live_price") if live else "N/A"
                high_52w = live.get("52w_high") if live else "N/A"
                low_52w = live.get("52w_low") if live else "N/A"
                reply = (
                    f"Live news for {found_stock.get('name', symbol)} is not available right now.\n\n"
                    f"Here are the latest price details for {symbol}:\n"
                    f"• Live Price: Rs{live_price}\n"
                    f"• 52-Week High: Rs{high_52w}\n"
                    f"• 52-Week Low: Rs{low_52w}\n\n"
                    "For the latest news visit moneycontrol.com or nseindia.com.\n\n"
                    "This is not financial advice. Please consult a SEBI-registered advisor."
                )
                return Response({
                    "mode": "personal",
                    "message": message,
                    "reply": reply,
                    "portfolio_stats": {
                        "best_performing": best_performing,
                        "most_profitable": most_profitable,
                        "highest_price_stock": highest_price_stock,
                        "lowest_price_stock": lowest_price_stock,
                    },
                    "recommendations": recommended_stocks,
                })
        else:
            live_price_ctx = ""
            stock_news_ctx = ""

        if use_personal_context:
            if portfolio_analysis:
                portfolio_text = "User's Portfolio with Live Prices:\n" + "\n".join([
                    f"- {item['symbol']} | {item['name']} | Qty: {item['quantity']:g} | Bought @ Rs{item['avg_buy_price']:.2f} | "
                    f"Live: Rs{item['live_price']:.2f} | Profit: {item['profit_pct']:+.2f}% | "
                    f"Abs Profit: Rs{item['abs_profit']:.2f}"
                    for item in portfolio_analysis
                ])
            else:
                portfolio_text = "User has no portfolio items yet."

            if watchlist_items:
                watchlist_text = "User's Watchlist:\n" + "\n".join([
                    f"- {item.stock.symbol} | {item.stock.name}"
                    for item in watchlist_items
                ])
            else:
                watchlist_text = "User has no watchlist items yet."

            if best_performing is not None:
                portfolio_stats_text = (
                    "Portfolio Statistics:\n"
                    f"- Best Performing Stock: {best_performing['symbol']} at {best_performing['profit_pct']:+.2f}% profit\n"
                    f"- Most Profitable Stock: {most_profitable['symbol']} with Rs{most_profitable['abs_profit']:.2f} total profit\n"
                    f"- Highest Price Stock: {highest_price_stock['symbol']} at Rs{highest_price_stock['live_price']:.2f}\n"
                    f"- Lowest Price Stock: {lowest_price_stock['symbol']} at {lowest_price_stock['live_price']:.2f}"
                )
            else:
                portfolio_stats_text = "No portfolio data available for analysis."
        else:
            portfolio_text = "Personal portfolio context not requested."
            watchlist_text = "Personal watchlist context not requested."
            portfolio_stats_text = "No personal portfolio stats requested."

        recommendations_text = "Recommended Stocks to Buy:\n" + "\n".join([
            f"- {stock.get('symbol', '')} | {stock.get('name', '')} | "
            f"Rs{safe_float(stock.get('current_price', 0), 0):.2f} | Sector: {stock.get('sector', 'Unknown')}"
            for stock in recommended_stocks
        ])

        if is_portfolio_performance_question(message):
            if not portfolio_analysis:
                reply = (
                    "You do not have any portfolio holdings yet, so I cannot assess performance right now. "
                    f"You could start by tracking stocks like {', '.join(stock.get('symbol', '') for stock in recommended_stocks[:3])}. "
                    "This is not financial advice. Please consult a SEBI-registered advisor."
                )
            else:
                total_invested = round(sum(item["avg_buy_price"] * item["quantity"] for item in portfolio_analysis), 2)
                total_value = round(sum(item["live_price"] * item["quantity"] for item in portfolio_analysis), 2)
                total_profit = round(total_value - total_invested, 2)
                total_profit_pct = round((total_profit / total_invested) * 100, 2) if total_invested > 0 else 0

                reply = (
                    f"Your portfolio is currently worth Rs{total_value:.2f} against an invested value of Rs{total_invested:.2f}, "
                    f"so your overall P/L is Rs{total_profit:.2f} ({total_profit_pct:+.2f}%). "
                    f"Your best performing stock is {best_performing['name']} ({best_performing['symbol']}) at {best_performing['profit_pct']:+.2f}%, "
                    f"and your highest absolute profit is in {most_profitable['name']} ({most_profitable['symbol']}) with Rs{most_profitable['abs_profit']:.2f}. "
                    "This is not financial advice. Please consult a SEBI-registered advisor."
                )

            return Response({
                "mode": "personal",
                "message": message,
                "reply": reply,
                "portfolio_stats": {
                    "best_performing": best_performing,
                    "most_profitable": most_profitable,
                    "highest_price_stock": highest_price_stock,
                    "lowest_price_stock": lowest_price_stock,
                },
                "recommendations": recommended_stocks,
            })

        if is_best_performer_question(message):
            if not best_performing:
                reply = (
                    "You do not have any portfolio holdings yet, so I cannot identify a best performing stock. "
                    "This is not financial advice. Please consult a SEBI-registered advisor."
                )
            else:
                reply = (
                    f"Your best performing stock right now is {best_performing['name']} ({best_performing['symbol']}). "
                    f"It is up {best_performing['profit_pct']:+.2f}% versus your average buy price, with an absolute profit of Rs{best_performing['abs_profit']:.2f}. "
                    f"The live price is Rs{best_performing['live_price']:.2f}. "
                    "This is not financial advice. Please consult a SEBI-registered advisor."
                )

            return Response({
                "mode": "personal",
                "message": message,
                "reply": reply,
                "portfolio_stats": {
                    "best_performing": best_performing,
                    "most_profitable": most_profitable,
                    "highest_price_stock": highest_price_stock,
                    "lowest_price_stock": lowest_price_stock,
                },
                "recommendations": recommended_stocks,
            })

        if is_watchlist_suggestion_question(message):
            watchlist_symbols = {item.stock.symbol for item in watchlist_items}
            portfolio_symbols = {item["symbol"] for item in portfolio_analysis}
            fresh_ideas = [
                stock for stock in recommended_stocks
                if stock.get("symbol") not in watchlist_symbols and stock.get("symbol") not in portfolio_symbols
            ][:3]

            if fresh_ideas:
                formatted = "; ".join(format_recommended_stock(stock) for stock in fresh_ideas)
                reply = (
                    f"Yes, you could consider adding these to your watchlist: {formatted}. "
                    "They were picked from the current recommendation pool based on valuation and price-position signals, "
                    "and they are not already in your portfolio or watchlist. "
                    "This is not financial advice. Please consult a SEBI-registered advisor."
                )
            else:
                reply = (
                    "Your current watchlist and portfolio already cover the strongest candidates from the current recommendation pool, "
                    "so I do not see an obvious additional watchlist idea right now. "
                    "This is not financial advice. Please consult a SEBI-registered advisor."
                )

            return Response({
                "mode": "personal",
                "message": message,
                "reply": reply,
                "portfolio_stats": {
                    "best_performing": best_performing,
                    "most_profitable": most_profitable,
                    "highest_price_stock": highest_price_stock,
                    "lowest_price_stock": lowest_price_stock,
                },
                "recommendations": recommended_stocks,
            })

        if question_type == "compare_stocks":
            stopwords = {
                "COMPARE", "VERSUS", "BETTER", "WHICH", "BETWEEN",
                "AND", "THE", "FOR", "TOP", "BEST", "GOOD", "WITH",
                "WHAT", "HOW", "ARE", "STOCK", "STOCKS", "INDIA"
            }
            symbols_in_msg = [
                resolve_symbol(w) for w in message.split()
                if w.isalpha() and len(w) > 2
                and w.upper() not in stopwords
            ]
            live_compare = []
            unavailable_symbols = []
            seen = set()
            for sym in symbols_in_msg:
                if not sym or sym in seen:
                    continue
                seen.add(sym)
                if len(seen) > 2:
                    break
                live = get_live_price(sym)
                if live and live.get("live_price"):
                    live_compare.append(
                        f"{sym}: Live Rs{live['live_price']} | "
                        f"52W High Rs{live['52w_high']} | "
                        f"52W Low Rs{live['52w_low']}"
                    )
                else:
                    unavailable_symbols.append(sym)

            live_compare_text = (
                "\n".join(live_compare)
                if live_compare
                else "No live data available for these stocks."
            )

            if unavailable_symbols:
                unavailable_note = (
                    "IMPORTANT: The following stocks have NO data "
                    "in StockSphere: " + ", ".join(unavailable_symbols) +
                    ". You MUST tell the user these stocks are not "
                    "available and suggest checking nseindia.com"
                )
            else:
                unavailable_note = ""

            prompt = f"""User asked: {message}

Live Prices:
{live_compare_text}

Instructions:
{unavailable_note}
- If any stock has no data, clearly say so first
- Do NOT make up or guess data for unavailable stocks
- Only compare stocks where live data was fetched above
- Add disclaimer: This is not financial advice."""
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": PERSONAL_SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=800,
                temperature=0.7,
            )
            return Response({
                "mode": "personal",
                "message": message,
                "reply": response.choices[0].message.content,
                "portfolio_stats": {
                    "best_performing": best_performing,
                    "most_profitable": most_profitable,
                    "highest_price_stock": highest_price_stock,
                    "lowest_price_stock": lowest_price_stock,
                },
                "recommendations": recommended_stocks,
            })

        prompt = f"""User asked: {message}

{portfolio_text}

{watchlist_text}

{portfolio_stats_text}

{recommendations_text}

{stock_news_ctx}

Specific stock details: {live_price_ctx if live_price_ctx else "No specific stock mentioned."}

Question type detected: {question_type}

Instructions:
- If question is about portfolio performance or profit/loss: answer using portfolio_stats_text with real numbers and percentages
- If question is about best or worst performing stock: name the exact stock with its profit % and absolute profit in Rs
- If question is about buy recommendation: suggest stocks from recommended_stocks and explain why (low P/E ratio, price near 52-week low, strong sector)
- If question is about a specific stock: use the live price and news provided above
- If question is about watchlist: comment on each watchlist stock and whether it looks like a good buy
- If portfolio is empty: acknowledge it warmly and suggest starting with 2-3 stocks from recommended_stocks
- If the user did not ask for personal context, do not mention their portfolio or watchlist.
- Always use actual stock names, symbols, and real numbers from the data - never give generic vague answers
- Always end with disclaimer: This is not financial advice. Please consult a SEBI-registered advisor.
"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": PERSONAL_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=800,
            temperature=0.7,
        )

        return Response({
            "mode": "personal",
            "message": message,
            "reply": response.choices[0].message.content,
            "portfolio_stats": {
                "best_performing": best_performing,
                "most_profitable": most_profitable,
                "highest_price_stock": highest_price_stock,
                "lowest_price_stock": lowest_price_stock,
            },
            "recommendations": recommended_stocks,
        })
    except Exception as exc:
        return Response({"error": str(exc)}, status=500)
