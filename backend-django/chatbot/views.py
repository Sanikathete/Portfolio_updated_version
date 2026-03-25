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
    if any(k in msg for k in ["best stock", "recommend", "should i buy", "what to buy", "top stock"]):
        return "buy_advice"
    if any(k in msg for k in ["sector", "banking stocks", "it stocks", "pharma stocks", "fmcg stocks"]):
        return "sector_query"
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
                    "current_price": float(stock.current_price or 0),
                    "pe_ratio": float(stock.pe_ratio or 0),
                    "market_cap": float(stock.market_cap or 0) if stock.market_cap is not None else 0,
                    "week_52_high": float(stock.week_52_high or 0) if stock.week_52_high is not None else 0,
                    "week_52_low": float(stock.week_52_low or 0) if stock.week_52_low is not None else 0,
                    "currency": stock.currency,
                }
    return None


def get_all_stocks_data():
    from stocks.models import Stock

    return list(
        Stock.objects.all().values(
            "id",
            "symbol",
            "name",
            "sector",
            "exchange",
            "current_price",
            "pe_ratio",
            "market_cap",
            "week_52_high",
            "week_52_low",
            "currency",
        )
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


def get_stocks_by_sector(stocks: list, sector_keyword: str):
    sector_upper = sector_keyword.upper()
    return [s for s in stocks if sector_upper in str(s.get("sector", "")).upper()][:5]


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


def get_similar_stocks(stocks: list, message: str, limit: int = 5):
    query_words = [word.upper() for word in re.findall(r"[A-Za-z&]+", message) if len(word) > 2]
    matches = []
    seen = set()
    for stock in stocks:
        symbol = str(stock.get("symbol", "")).upper()
        name = str(stock.get("name", "")).upper()
        sector = str(stock.get("sector", "")).upper()
        if any(word in symbol or word in name or word in sector for word in query_words):
            if symbol and symbol not in seen:
                matches.append(stock)
                seen.add(symbol)
        if len(matches) >= limit:
            break
    return matches or stocks[:limit]


@api_view(["POST"])
@permission_classes([AllowAny])
def public_chat(request):
    message = request.query_params.get("message", "")
    if not message:
        return Response({"error": "Message is required"}, status=400)

    try:
        stocks = get_all_stocks_data()
        found_stock = find_stock(stocks, message) or find_stock_in_db(message)
        question_type = detect_question_type(message)
        pgvector_results = get_similar_stocks(stocks, message)

        msg_lower = message.lower()
        us_keywords = ["us stock", "us stocks", "us market", "american stock", "american stocks", "nyse", "nasdaq", "s&p", "dow jones", "wall street", "top nyse", "best nyse", "nyse stocks", "top nasdaq", "best nasdaq", "nasdaq stocks"]
        india_keywords = ["nse", "bse", "nse stocks", "best nse", "top nse", "indian stock", "indian stocks", "india market", "india stocks", "sensex", "nifty"]

        if any(k in msg_lower for k in us_keywords):
            pgvector_results = [s for s in pgvector_results if str(s.get("exchange", "")).upper() in ("NYSE", "NASDAQ")]
        elif any(k in msg_lower for k in india_keywords):
            pgvector_results = [s for s in pgvector_results if str(s.get("exchange", "")).upper() == "NSE"]

        live_price_ctx = ""
        stock_news_ctx = ""

        if found_stock:
            symbol = found_stock.get("symbol", "")
            live_price_ctx = build_live_price_context(symbol, found_stock.get("current_price"))
            stock_news_ctx = format_news_context(
                get_stock_news(symbol), label=f"Latest News for {symbol}"
            )

        if question_type == "market_news":
            general_news = get_general_market_news()
            stock_news_ctx = format_news_context(general_news, label="Latest Indian Market News")

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
        elif question_type == "market_news":
            prompt = f"""User asked: {message}

{stock_news_ctx}

Instructions:
- Summarise the news headlines above in a friendly, helpful way
- Explain briefly how this news might affect the market
- Tell user they can ask about any specific stock for more details
- Add disclaimer: This is not financial advice."""
        elif question_type == "price_query":
            words = [w.upper() for w in message.split() if w.isalpha() and len(w) > 2]
            live_results = []
            for w in words:
                live = get_live_price(w)
                if live:
                    live_results.append(f"{w}: Rs{live['live_price']} (52W H: Rs{live['52w_high']} | L: Rs{live['52w_low']})")

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
            sample_stocks = pick_diverse_stocks(pgvector_results, stocks, limit=4)
            sample_text = "\n".join([
                f"- {s.get('symbol')} | {s.get('name')} | Rs{s.get('current_price')} | {s.get('sector')} | {s.get('exchange', 'NSE')}"
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
            sector_map = {
                "it": "Information Technology", "tech": "Information Technology",
                "banking": "Financial Services", "bank": "Financial Services",
                "pharma": "Healthcare", "auto": "Automobile",
                "fmcg": "Fast Moving Consumer Goods", "energy": "Power",
                "real estate": "Realty", "healthcare": "Healthcare",
                "infrastructure": "Construction",
            }
            matched_sector = next((full for key, full in sector_map.items() if key in msg_lower), None)
            sector_stocks = get_stocks_by_sector(stocks, matched_sector or message) if matched_sector else pgvector_results[:5]
            sector_text = "\n".join([
                f"- {s.get('symbol')} | {s.get('name')} | Rs{s.get('current_price')}"
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
        elif question_type == "greeting":
            prompt = f"""User said: {message}

Instructions:
- Greet them warmly as StockSphere AI
- Tell them you can help with: live stock prices, stock news, recommendations, sector analysis, IPO info, dividend stocks, long/short term investing
- Mention both public and personal (post-login) chatbot modes
- Keep it short, friendly, and welcoming."""
        elif question_type == "compare_stocks":
            symbols_in_msg = [w.upper() for w in message.split() if w.isalpha() and len(w) > 2]
            live_compare = []
            for sym in symbols_in_msg[:2]:
                live = get_live_price(sym)
                if live:
                    live_compare.append(f"{sym} - Live: Rs{live['live_price']} | 52W H: Rs{live['52w_high']} | L: Rs{live['52w_low']}")

            live_compare_text = "\n".join(live_compare) if live_compare else "Live prices not available for comparison."
            prompt = f"""User asked: {message}

Live Prices:
{live_compare_text}

Similar stocks: {pgvector_results}

Instructions:
- Compare the stocks using live price data above
- Talk about sector, price range, strengths and weaknesses
- Give a balanced recommendation
- Add disclaimer: This is not financial advice."""
        elif question_type == "longterm_advice":
            sample_stocks = pgvector_results if pgvector_results else stocks[:20]
            sample_text = "\n".join([
                f"- {s.get('symbol')} | {s.get('name')} | {'Rs' if str(s.get('exchange', '')).upper() == 'NSE' else '$'}{s.get('current_price')} | {s.get('sector')} | {s.get('exchange', 'NSE')}"
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
            sample_stocks = pgvector_results if pgvector_results else stocks[:20]
            sample_text = "\n".join([
                f"- {s.get('symbol')} | {s.get('name')} | {'Rs' if str(s.get('exchange', '')).upper() == 'NSE' else '$'}{s.get('current_price')} | {s.get('sector')} | {s.get('exchange', 'NSE')}"
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
- Answer questions about IPOs in India
- Explain what an IPO is if needed
- Mention that for latest upcoming IPOs users should check NSE, SEBI, and financial news sites
- Do NOT suggest random stocks as IPO recommendations
- Give general advice on how to evaluate and apply for IPOs
- Mention risks of IPO investing
- Add disclaimer: This is not financial advice. Please consult a SEBI-registered advisor."""
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
        user = request.user
        stocks = get_all_stocks_data()
        found_stock = find_stock(stocks, message) or find_stock_in_db(message)
        question_type = detect_question_type(message)

        portfolio_items = PortfolioItem.objects.filter(
            portfolio__user=user
        ).select_related("stock", "portfolio")
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

        if found_stock is not None:
            symbol = found_stock.get("symbol", "")
            live_price_ctx = build_live_price_context(symbol, found_stock.get("current_price"))
            stock_news_ctx = format_news_context(get_stock_news(symbol), label=f"Latest News for {symbol}")
        else:
            live_price_ctx = ""
            stock_news_ctx = ""

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
                f"- Lowest Price Stock: {lowest_price_stock['symbol']} at Rs{lowest_price_stock['live_price']:.2f}"
            )
        else:
            portfolio_stats_text = "No portfolio data available for analysis."

        recommendations_text = "Recommended Stocks to Buy:\n" + "\n".join([
            f"- {stock.get('symbol', '')} | {stock.get('name', '')} | "
            f"Rs{float(stock.get('current_price', 0)):.2f} | Sector: {stock.get('sector', 'Unknown')}"
            for stock in recommended_stocks
        ])

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
