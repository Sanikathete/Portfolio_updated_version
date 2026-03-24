from fastapi import APIRouter, HTTPException
import httpx
import os
from groq import Groq
from dotenv import load_dotenv
from app.pgvector_setup import search_similar_stocks

# ── Live price & news imports ──────────────────────────────────────────────────
import yfinance as yf
import feedparser
import re

load_dotenv()

router = APIRouter()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
DJANGO_BASE_URL = "http://localhost:8000/api"

mpin_store = {}

# Service account for public chatbot — no user login needed
SERVICE_USERNAME = "testteacher"
SERVICE_PASSWORD = "teacher@123"

async def get_service_token():
    """Gets a backend token using service account so public users don't need to log in."""
    return await get_jwt_token(SERVICE_USERNAME, SERVICE_PASSWORD)

# ══════════════════════════════════════════════════════════════════════════════
# SYSTEM PROMPTS
# ══════════════════════════════════════════════════════════════════════════════

PUBLIC_SYSTEM_PROMPT = """You are StockSphere AI, a helpful Indian stock market assistant.
You help users understand NSE-listed stocks, sectors, and general market concepts.

You can answer:
- Which stocks to consider buying or avoiding (with clear disclaimers)
- Information about specific stocks (price, sector, performance)
- General stock market questions (what is P/E ratio, what is a mutual fund, etc.)
- Sector-based questions (which sector is performing well, IT vs Banking stocks, etc.)
- Beginner questions about investing in Indian stock market
- Latest stock news and market updates

Rules:
- Always add disclaimer: This is not financial advice. Please consult a SEBI-registered advisor.
- If live price is provided in context, always use that — it is real-time from NSE
- If news is provided in context, summarise it naturally in your response
- Be friendly, simple, and helpful
- If asked which stock to buy, suggest 2-3 options with reasons based on sectors
- Always respond in English unless user writes in another language
"""

PERSONAL_SYSTEM_PROMPT = """You are StockSphere Personal AI, a private financial assistant.
You have access to the user's actual portfolio and watchlist data.

You can answer:
- Analysis of their current portfolio (is it diversified? too risky?)
- Whether a specific stock fits their portfolio
- Which stocks in their watchlist look promising
- Suggestions to improve their portfolio
- Questions about stocks they already own
- General market questions with live price context

Rules:
- Always reference their actual portfolio data when answering
- If live price is provided, use it — do not guess prices
- Point out if their portfolio is too concentrated in one sector
- Suggest diversification if needed
- Add disclaimer: This is not financial advice. Please consult a SEBI-registered advisor.
- Be personal and specific — use their actual stock names and quantities
- Be friendly and encouraging
"""

# ══════════════════════════════════════════════════════════════════════════════
# LIVE PRICE — yfinance
# ══════════════════════════════════════════════════════════════════════════════

def get_live_price(symbol: str) -> dict:
    try:
        ticker = yf.Ticker(f"{symbol.upper()}.NS")

        # Method 1: fast_info (quickest)
        try:
            fi    = ticker.fast_info
            price = round(float(fi.last_price), 2)
            high  = round(float(fi.fifty_two_week_high), 2)
            low   = round(float(fi.fifty_two_week_low), 2)
            if price and price > 0:
                return {
                    "live_price": price,
                    "52w_high":   high,
                    "52w_low":    low,
                    "volume":     getattr(fi, "three_month_average_volume", "N/A")
                }
        except Exception:
            pass

        # Method 2: ticker.info fallback
        try:
            info  = ticker.info
            price = info.get("regularMarketPrice") or info.get("currentPrice")
            if price and float(price) > 0:
                return {
                    "live_price": round(float(price), 2),
                    "52w_high":   info.get("fiftyTwoWeekHigh", "N/A"),
                    "52w_low":    info.get("fiftyTwoWeekLow", "N/A"),
                    "volume":     info.get("averageVolume", "N/A")
                }
        except Exception:
            pass

        return {}
    except Exception:
        return {}


def build_live_price_context(symbol: str, db_price) -> str:
    """
    Returns a formatted string for Groq prompt context.
    Uses live price if available, falls back to DB price.
    """
    live = get_live_price(symbol)
    if live:
        return (
            f"LIVE Price (real-time NSE): ₹{live['live_price']}\n"
            f"52-Week High: ₹{live['52w_high']} | 52-Week Low: ₹{live['52w_low']}\n"
            f"3-Month Avg Volume: {live['volume']}"
        )
    return f"Price (from StockSphere DB): ₹{db_price} (live price unavailable)"


# ══════════════════════════════════════════════════════════════════════════════
# LIVE NEWS — RSS feeds (no API key needed)
# ══════════════════════════════════════════════════════════════════════════════

NEWS_FEEDS = {
    "general": [
        "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms",
        "https://www.moneycontrol.com/rss/marketreports.xml",
    ],
    "stock": "https://feeds.finance.yahoo.com/rss/2.0/headline?s={symbol}.NS&region=IN&lang=en-IN"
}


def get_general_market_news(max_items: int = 5) -> list[str]:
    """
    Fetch top market headlines from Economic Times / Moneycontrol RSS.
    """
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
    """
    Fetch news headlines for a specific NSE stock via Yahoo Finance RSS.
    """
    try:
        url = NEWS_FEEDS["stock"].format(symbol=symbol.upper())
        feed = feedparser.parse(url)
        return [entry.title for entry in feed.entries[:max_items]]
    except Exception:
        return []


def format_news_context(headlines: list[str], label: str = "Latest Market News") -> str:
    if not headlines:
        return f"{label}: Not available right now."
    numbered = "\n".join([f"{i+1}. {h}" for i, h in enumerate(headlines)])
    return f"{label}:\n{numbered}"


# ══════════════════════════════════════════════════════════════════════════════
# DJANGO API HELPERS
# ══════════════════════════════════════════════════════════════════════════════

async def get_jwt_token(username: str, password: str):
    async with httpx.AsyncClient() as http:
        response = await http.post(
            f"{DJANGO_BASE_URL}/users/login/",
            json={"username": username, "password": password}
        )
        data = response.json()
        return data.get("access")


async def get_all_stocks(token: str):
    async with httpx.AsyncClient() as http:
        response = await http.get(
            f"{DJANGO_BASE_URL}/stocks/",
            headers={"Authorization": f"Bearer {token}"}
        )
        return response.json()


async def get_user_portfolio(token: str):
    async with httpx.AsyncClient() as http:
        response = await http.get(
            f"{DJANGO_BASE_URL}/portfolio/",
            headers={"Authorization": f"Bearer {token}"}
        )
        return response.json()


async def get_user_watchlist(token: str):
    async with httpx.AsyncClient() as http:
        response = await http.get(
            f"{DJANGO_BASE_URL}/watchlist/",
            headers={"Authorization": f"Bearer {token}"}
        )
        return response.json()


# ══════════════════════════════════════════════════════════════════════════════
# STOCK HELPERS
# ══════════════════════════════════════════════════════════════════════════════

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
        symbol = stock.get("symbol", "").upper()
        if symbol in query_words:
            return stock

    for stock in stocks:
        name = stock.get("name", "").upper()
        name_words = name.split()
        for word in query_words:
            if word in name_words and len(word) > 3:
                return stock

    return None


def get_stocks_by_sector(stocks: list, sector_keyword: str):
    sector_upper = sector_keyword.upper()
    return [s for s in stocks if sector_upper in s.get("sector", "").upper()][:5]


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


# ══════════════════════════════════════════════════════════════════════════════
# QUESTION TYPE DETECTOR  (14 types + greeting)
# ══════════════════════════════════════════════════════════════════════════════

def detect_question_type(message: str) -> str:
    msg = message.lower()

    greeting_kw = ["hello", "hi", "hey", "good morning", "good evening", "who are you", "what can you do", "how does this work"]
    compare_kw = ["compare", " vs ", "versus", "which is better", "better between"]
    portfolio_kw = ["my portfolio", "portfolio analysis", "my profit", "my loss", "rebalance", "how is my portfolio"]
    watchlist_kw = ["my watchlist", "show watchlist", "add to watchlist", "remove from watchlist"]
    dividend_kw = ["dividend", "dividend yield", "dividend paying", "regular dividend", "highest dividend", "give dividend", "dividend stocks"]
    ipo_kw = ["ipo", "initial public offering", "upcoming ipo", "new listing", "new ipo"]
    out_of_scope_kw = ["nyse", "nasdaq", "us stock", "us stocks", "us market", "american stock", "american stocks"]
    risk_kw = ["avoid", "risky stock", "overvalued", "stay away", "stocks in loss", "which stocks to avoid", "not buy", "shouldn't buy", "should not buy"]
    buy_kw = ["buy", "invest", "purchase", "should i buy", "good stock", "best stock", "recommend", "suggest", "which stock", "stock for beginner", "safe stock", "stock under", "top nyse", "best nyse", "nyse stocks", "top nasdaq", "best nasdaq", "nasdaq stocks", "best nse", "top nse", "nse stocks"]
    sell_kw = ["sell", "exit", "should i sell", "when to sell", "book profit", "right time to sell"]
    shortterm_kw = ["short term", "swing trading", "intraday", "quick profit", "short term trading", "swing trade", "trading stocks", "stocks to trade"]
    longterm_kw = ["long term", "5 years", "10 years", "hold for", "long term investment", "best returns in 1 year", "hold long"]
    sector_kw = ["sector", "it stocks", "banking stocks", "pharma", "auto stocks", "fmcg", "energy stocks", "top stocks in", "best stocks in", "it sector", "tech sector", "information technology", "banking sector", "pharma sector", "fmcg sector", "auto sector", "realty sector", "energy sector", "finance sector", "healthcare sector"]
    news_kw = ["news", "market news", "what happened", "market today", "market update", "why is", "falling", "rising"]
    price_kw = ["price", "current price", "stock price", "how much", "52 week", "market cap", "pe ratio", "p/e ratio"]
    info_kw = ["what is", "explain", "tell me about", "who is", "what does", "define"]

    if any(re.search(r'\b' + re.escape(k) + r'\b', msg) for k in greeting_kw):      return "greeting"
    if any(k in msg for k in compare_kw):        return "compare_stocks"
    if any(k in msg for k in portfolio_kw):      return "portfolio_analysis"
    if any(k in msg for k in watchlist_kw):      return "watchlist_query"
    if any(k in msg for k in dividend_kw):       return "dividend_query"
    if any(k in msg for k in ipo_kw):            return "ipo_query"
    if any(k in msg for k in risk_kw):           return "avoid_advice"
    if any(k in msg for k in shortterm_kw):      return "shortterm_advice"
    if any(k in msg for k in longterm_kw):       return "longterm_advice"
    if any(k in msg for k in sector_kw):         return "sector_query"
    if any(k in msg for k in out_of_scope_kw):   return "out_of_scope"
    if any(k in msg for k in buy_kw):            return "buy_advice"
    if any(k in msg for k in sell_kw):           return "sell_advice"
    if any(k in msg for k in news_kw):           return "market_news"
    if any(k in msg for k in price_kw):          return "price_query"
    if any(k in msg for k in info_kw):           return "general_info"
    return "general"


# ══════════════════════════════════════════════════════════════════════════════
# MPIN ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/set-mpin")
def set_mpin(username: str, mpin: str):
    if len(mpin) != 6 or not mpin.isdigit():
        raise HTTPException(status_code=400, detail="MPin must be exactly 6 digits")
    mpin_store[username] = mpin
    return {"message": f"MPin set successfully for {username}"}


@router.post("/verify-mpin")
def verify_mpin(username: str, mpin: str):
    if username not in mpin_store:
        raise HTTPException(status_code=404, detail="User not found")
    if mpin_store[username] != mpin:
        raise HTTPException(status_code=401, detail="Invalid MPin")
    return {"message": "MPin verified!", "access": True}


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC CHAT  (no login required beyond basic auth)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/public-chat")
async def public_chat(message: str):
    token = await get_jwt_token("testteacher", "teacher@123")
    if not token:
        raise HTTPException(status_code=500, detail="Internal server error")

    stocks         = await get_all_stocks(token)
    found_stock    = find_stock(stocks, message)
    question_type  = detect_question_type(message)
    pgvector_results = search_similar_stocks(message)
    msg_lower = message.lower()
    us_keywords = ["us stock", "us stocks", "us market", "american stock", "american stocks", "nyse", "nasdaq", "s&p", "dow jones", "wall street", "top nyse", "best nyse", "nyse stocks", "top nasdaq", "best nasdaq", "nasdaq stocks"]
    india_keywords = ["nse", "bse", "nse stocks", "best nse", "top nse", "indian stock", "indian stocks", "india market", "india stocks", "sensex", "nifty"]

    if any(k in msg_lower for k in us_keywords):
        pgvector_results = [s for s in pgvector_results if s.get("exchange", "").upper() in ("NYSE", "NASDAQ")]
    elif any(k in msg_lower for k in india_keywords):
        pgvector_results = [s for s in pgvector_results if s.get("exchange", "").upper() == "NSE"]
    # else: no filter — return mixed results for generic queries

    # ── Fetch live data based on context ──────────────────────────────────────
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

    # ── Build prompt ──────────────────────────────────────────────────────────

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
- Use the LIVE price provided above — do not guess prices
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
        # Try to extract a stock symbol from the message
        words = [w.upper() for w in message.split() if w.isalpha() and len(w) > 2]
        live_results = []
        for w in words:
            live = get_live_price(w)
            if live:
                live_results.append(f"{w}: ₹{live['live_price']} (52W H: ₹{live['52w_high']} | L: ₹{live['52w_low']})")

        live_text = "\n".join(live_results) if live_results else "Could not fetch live price for the requested stock."
        prompt = f"""User asked: {message}

Live NSE Price Data:
{live_text}

PGVector similar stocks: {[s.get('symbol') for s in pgvector_results]}

Instructions:
- State the live price clearly
- Mention 52-week high/low for context
- If price not found, suggest checking the symbol spelling
- Add disclaimer: Prices are live from NSE via yfinance."""

    elif question_type == "avoid_advice":
        sample_text = "\n".join([
            f"- {s.get('symbol')} | {s.get('name')} | {'₹' if s.get('exchange','').upper() == 'NSE' else '$'}{s.get('current_price')} | {s.get('sector')} | {s.get('exchange','NSE')}"
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
- Tell them they can explore 388 NSE stocks on StockSphere
- Suggest they check Yahoo Finance or Google Finance for US stock data
- Keep it short, friendly, and helpful
- Add disclaimer: This is not financial advice."""

    elif question_type == "buy_advice":
        sample_stocks = pick_diverse_stocks(pgvector_results, stocks, limit=4)
        sample_text = "\n".join([
            f"- {s.get('symbol')} | {s.get('name')} | ₹{s.get('current_price')} | {s.get('sector')} | {s.get('exchange','NSE')}"
            for s in sample_stocks
        ])
        prompt = f"""User asked: {message}

Relevant stocks (PGVector smart search):
{sample_text}

Instructions:
- Suggest 3-4 stocks from different sectors
- Explain briefly why each might be worth looking at
- Mention StockSphere has 388 NSE stocks to explore
- Always add: This is not financial advice. Do your own research and consult a SEBI-registered advisor.""" 
    elif question_type == "sector_query":
        sector_map = {
            "it": "Information Technology", "tech": "Information Technology",
            "banking": "Banking", "bank": "Banking",
            "pharma": "Pharmaceutical", "auto": "Automobile",
            "fmcg": "FMCG", "energy": "Energy",
            "real estate": "Real Estate", "healthcare": "Healthcare",
            "infrastructure": "Infrastructure",
        }
        msg_lower = message.lower()
        matched_sector = next((full for key, full in sector_map.items() if key in msg_lower), None)
        sector_stocks  = get_stocks_by_sector(stocks, matched_sector or message) if matched_sector else pgvector_results[:5]
        sector_text    = "\n".join([
            f"- {s.get('symbol')} | {s.get('name')} | ₹{s.get('current_price')}"
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
        # Fetch live prices for both stocks if possible
        symbols_in_msg = [w.upper() for w in message.split() if w.isalpha() and len(w) > 2]
        live_compare = []
        for sym in symbols_in_msg[:2]:
            live = get_live_price(sym)
            if live:
                live_compare.append(f"{sym} — Live: ₹{live['live_price']} | 52W H: ₹{live['52w_high']} | L: ₹{live['52w_low']}")

        live_compare_text = "\n".join(live_compare) if live_compare else "Live prices not available for comparison."
        prompt = f"""User asked: {message}

Live Prices:
{live_compare_text}

PGVector similar stocks: {pgvector_results}

Instructions:
- Compare the stocks using live price data above
- Talk about sector, price range, strengths and weaknesses
- Give a balanced recommendation
- Add disclaimer: This is not financial advice."""

    elif question_type == "longterm_advice":
        sample_stocks = pgvector_results if pgvector_results else stocks[:20]
        sample_text   = "\n".join([
            f"- {s.get('symbol')} | {s.get('name')} | {'₹' if s.get('exchange','').upper() == 'NSE' else '$'}{s.get('current_price')} | {s.get('sector')} | {s.get('exchange','NSE')}"
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
            f"- {s.get('symbol')} | {s.get('name')} | {'₹' if s.get('exchange','').upper() == 'NSE' else '$'}{s.get('current_price')} | {s.get('sector')} | {s.get('exchange','NSE')}"
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
            f"- {s.get('symbol')} | {s.get('name')} | {'₹' if s.get('exchange','').upper() == 'NSE' else '$'}{s.get('current_price')} | {s.get('sector')} | {s.get('exchange','NSE')}"
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
- Answer questions about IPOs in India or US
- Explain what an IPO is if needed
- Mention that for latest upcoming IPOs users should check:
  1. NSE website: https://www.nseindia.com
  2. SEBI website: https://www.sebi.gov.in
  3. Financial news sites like Moneycontrol, Economic Times
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
        # Unknown stock fallback
        upper_words = [w for w in message.split() if w.isupper() and len(w) > 2]
        if not found_stock and upper_words:
            stock_name = upper_words[0]
            similar_symbols = [s.get('symbol') for s in pgvector_results]
            prompt = f"""User asked about: {message}

The stock "{stock_name}" was not found in our StockSphere database of 388 NSE stocks.

Instructions:
- Politely tell the user this stock is not in our database
- Suggest they verify the NSE symbol spelling
- Suggest these similar stocks from PGVector: {similar_symbols}
- Tell them they can explore our 388 NSE stocks
- Be helpful and friendly."""
        else:
            prompt = f"""User asked: {message}

Instructions:
- Answer this general stock market or finance question clearly
- Use simple language suitable for Indian investors
- If relevant, mention StockSphere has 388 NSE stocks to explore
- Add disclaimer if any investment advice is given."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": PUBLIC_SYSTEM_PROMPT},
            {"role": "user",   "content": prompt}
        ],
        max_tokens=600,
        temperature=0.7
    )

    return {
        "mode": "public",
        "message": message,
        "question_type": question_type,
        "stock_found": found_stock is not None,
        "stock_data": found_stock,
        "live_price": live_price_ctx if live_price_ctx else None,
        "reply": response.choices[0].message.content
    }


# ══════════════════════════════════════════════════════════════════════════════
# PERSONAL CHAT  (post-login + MPIN)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/personal-chat")
async def personal_chat(username: str, password: str, message: str):
    token = await get_jwt_token(username, password)
    if token is None or token == "":
        raise HTTPException(status_code=401, detail="Could not authenticate")

    stocks = await get_all_stocks(token)
    portfolio = await get_user_portfolio(token)
    watchlist = await get_user_watchlist(token)

    found_stock = find_stock(stocks, message)
    question_type = detect_question_type(message)

    portfolio_analysis = []
    if isinstance(portfolio, list) and portfolio:
        for item in portfolio:
            symbol = item.get("stock_symbol", item.get("symbol", ""))
            try:
                avg_buy_price = float(item.get("average_price", item.get("buy_price", 0)))
            except (TypeError, ValueError):
                avg_buy_price = 0.0
            try:
                quantity = float(item.get("quantity", 0))
            except (TypeError, ValueError):
                quantity = 0.0

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
                "live_price": live_price,
                "avg_buy_price": avg_buy_price,
                "quantity": quantity,
                "profit_pct": profit_pct,
                "abs_profit": abs_profit
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
    if isinstance(stocks, list):
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
            f"- {item['symbol']} | Qty: {item['quantity']:g} | Bought @ Rs{item['avg_buy_price']:.2f} | "
            f"Live: Rs{item['live_price']:.2f} | Profit: {item['profit_pct']:+.2f}% | "
            f"Abs Profit: Rs{item['abs_profit']:.2f}"
            for item in portfolio_analysis
        ])
    else:
        portfolio_text = "User has no portfolio items yet."

    if isinstance(watchlist, list) and watchlist:
        watchlist_text = "User's Watchlist:\n" + "\n".join([
            f"- {item.get('stock_symbol', item.get('symbol', ''))} | {item.get('stock_name', item.get('name', ''))}"
            for item in watchlist
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
            {"role": "user", "content": prompt}
        ],
        max_tokens=800,
        temperature=0.7
    )

    return {
        "mode": "personal",
        "message": message,
        "question_type": question_type,
        "stock_found": found_stock is not None,
        "live_price": live_price_ctx if live_price_ctx else None,
        "portfolio": portfolio,
        "watchlist": watchlist,
        "portfolio_stats": {
            "best_performing": best_performing,
            "most_profitable": most_profitable,
            "highest_price_stock": highest_price_stock,
            "lowest_price_stock": lowest_price_stock
        },
        "recommendations": recommended_stocks,
        "reply": response.choices[0].message.content
    }


# ══════════════════════════════════════════════════════════════════════════════
# VOICE CHAT & LEGACY CHAT  (unchanged)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/voice-chat")
async def voice_chat(username: str, password: str, mpin: str, voice_text: str):
    if username not in mpin_store or mpin_store[username] != mpin:
        raise HTTPException(status_code=401, detail="Invalid MPin - access denied")

    token = await get_jwt_token(username, password)
    if not token:
        raise HTTPException(status_code=401, detail="Could not authenticate")

    async with httpx.AsyncClient() as http:
        response = await http.post(
            f"{DJANGO_BASE_URL}/chatbot/ask/",
            json={"question": voice_text},
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0
        )
    return {
        "username": username,
        "voice_input": voice_text,
        "reply": response.json()
    }


@router.post("/chat")
async def chat(username: str, password: str, mpin: str, message: str):
    if username not in mpin_store or mpin_store[username] != mpin:
        raise HTTPException(status_code=401, detail="Invalid MPin - access denied")

    token = await get_jwt_token(username, password)
    if not token:
        raise HTTPException(status_code=401, detail="Could not authenticate")

    async with httpx.AsyncClient() as http:
        response = await http.post(
            f"{DJANGO_BASE_URL}/chatbot/ask/",
            json={"question": message},
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0
        )
    return {
        "username": username,
        "message": message,
        "reply": response.json()
    }
