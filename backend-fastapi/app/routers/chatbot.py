from fastapi import APIRouter, HTTPException
import httpx
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
DJANGO_BASE_URL = "http://localhost:8000/api"

mpin_store = {}
PUBLIC_SYSTEM_PROMPT = """You are StockSphere AI, a helpful Indian stock market assistant.
You help users understand NSE-listed stocks, sectors, and general market concepts.

You can answer:
- Which stocks to consider buying or avoiding (with clear disclaimers)
- Information about specific stocks (price, sector, performance)
- General stock market questions (what is P/E ratio, what is a mutual fund, etc.)
- Sector-based questions (which sector is performing well, IT vs Banking stocks, etc.)
- Beginner questions about investing in Indian stock market

Rules:
- Always add disclaimer: This is not financial advice. Please consult a SEBI-registered advisor.
- Prices shown are from our database and may not be real-time
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
- General market questions

Rules:
- Always reference their actual portfolio data when answering
- Point out if their portfolio is too concentrated in one sector
- Suggest diversification if needed
- Add disclaimer: This is not financial advice. Please consult a SEBI-registered advisor.
- Be personal and specific — use their actual stock names and quantities
- Be friendly and encouraging
"""
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
def find_stock(stocks: list, query: str):
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

def detect_question_type(message: str):
    message_lower = message.lower()
    
    avoid_keywords = ["not buy", "avoid", "should not buy", "shouldn't buy", "stay away", "risky stock", "bad stock", "which stock not"]
    buy_keywords = ["buy", "invest", "purchase", "should i", "good stock", "best stock", "recommend", "suggest", "which stock"]
    sell_keywords = ["sell", "exit", "should i sell", "when to sell", "book profit"]
    sector_keywords = ["sector", "it stocks", "banking stocks", "pharma", "auto stocks", "fmcg", "energy"]
    info_keywords = ["what is", "explain", "tell me about", "p/e", "ratio", "market cap", "dividend", "ipo", "nse", "bse"]
    price_keywords = ["price", "current price", "stock price", "how much"]
    
    if any(k in message_lower for k in avoid_keywords):
        return "avoid_advice"
    if any(k in message_lower for k in buy_keywords):
        return "buy_advice"
    elif any(k in message_lower for k in sell_keywords):
        return "sell_advice"
    elif any(k in message_lower for k in sector_keywords):
        return "sector_query"
    elif any(k in message_lower for k in info_keywords):
        return "general_info"
    elif any(k in message_lower for k in price_keywords):
        return "price_query"
    else:
        return "general"
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
@router.post("/public-chat")
async def public_chat(username: str, password: str, message: str):
    token = await get_jwt_token(username, password)
    if not token:
        raise HTTPException(status_code=401, detail="Could not authenticate")

    stocks = await get_all_stocks(token)
    found_stock = find_stock(stocks, message)
    question_type = detect_question_type(message)

    if found_stock:
        stock_context = f"""
        Symbol: {found_stock.get('symbol')}
        Name: {found_stock.get('name')}
        Current Price: {found_stock.get('current_price')}
        Sector: {found_stock.get('sector')}
        Exchange: {found_stock.get('exchange')}
        Market Cap: {found_stock.get('market_cap', 'N/A')}
        P/E Ratio: {found_stock.get('pe_ratio', 'N/A')}
        52 Week High: {found_stock.get('week_52_high', 'N/A')}
        52 Week Low: {found_stock.get('week_52_low', 'N/A')}
        """
        prompt = f"""User asked: {message}

Stock data from StockSphere database:
{stock_context}

Question type detected: {question_type}

Instructions:
- If asking for buy/sell advice: Give a balanced view mentioning sector outlook, current price vs 52-week range, and general sentiment. Always add disclaimer.
- If asking for price: Clearly state the current price from our database.
- If asking general info about this stock: Explain what the company does, its sector, and key metrics.
- Be helpful, clear, and friendly."""
    elif question_type == "avoid_advice":
        sample_stocks = stocks[:20]
        sample_text = "\n".join([
            f"- {s.get('symbol')} | {s.get('name')} | {s.get('current_price')} | Sector: {s.get('sector')}"
            for s in sample_stocks
        ])
        prompt = f"""User asked: {message}

Here are some stocks from our database:
{sample_text}

Instructions:
- Explain what types of stocks beginners should be careful about
- Mention risky sectors like highly volatile or speculative stocks
- Explain warning signs like very low price stocks, unknown companies
- Suggest safer alternatives from blue chip or large cap stocks
- Always add: This is not financial advice. Please consult a SEBI-registered advisor.
- Be helpful and educational"""

    elif question_type == "buy_advice":
        sample_stocks = stocks[:20]
        sample_text = "\n".join([
            f"- {s.get('symbol')} | {s.get('name')} | {s.get('current_price')} | Sector: {s.get('sector')}"
            for s in sample_stocks
        ])
        prompt = f"""User asked: {message}

Here are some stocks available in our StockSphere database (388 NSE stocks total):
{sample_text}

Instructions:
- Suggest 3-4 stocks from different sectors as examples
- Explain briefly why each might be worth looking at
- Mention the user can search any of our 388 stocks for more details
- Always add: This is not financial advice. Please do your own research and consult a SEBI-registered advisor.
- Be helpful and educational"""

    elif question_type == "sector_query":
        message_lower = message.lower()
        sector_map = {
            "it": "Information Technology",
            "tech": "Information Technology",
            "banking": "Banking",
            "bank": "Banking",
            "pharma": "Pharmaceutical",
            "auto": "Automobile",
            "fmcg": "FMCG",
            "energy": "Energy",
        }
        matched_sector = next(
            (full for key, full in sector_map.items() if key in message_lower), None
        )
        sector_stocks = get_stocks_by_sector(stocks, matched_sector or message) if matched_sector else []
        sector_text = "\n".join([
            f"- {s.get('symbol')} | {s.get('name')} | {s.get('current_price')}"
            for s in sector_stocks
        ]) if sector_stocks else "No specific sector stocks found."

        prompt = f"""User asked: {message}

Sector stocks from our database:
{sector_text}

Instructions:
- Explain the current outlook for this sector in India
- Mention 2-3 stocks from the list above as examples
- Explain what factors affect this sector
- Add disclaimer about investment advice"""

    else:
        prompt = f"""User asked: {message}

Instructions:
- Answer this general stock market or finance question clearly
- Use simple language suitable for Indian investors
- If relevant, mention that StockSphere has 388 NSE stocks they can explore
- Add disclaimer if any investment advice is given"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": PUBLIC_SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
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
        "reply": response.choices[0].message.content
    }
@router.post("/personal-chat")
async def personal_chat(username: str, password: str, mpin: str, message: str):
    if username not in mpin_store or mpin_store[username] != mpin:
        raise HTTPException(status_code=401, detail="Invalid MPin - access denied")

    token = await get_jwt_token(username, password)
    if not token:
        raise HTTPException(status_code=401, detail="Could not authenticate")

    stocks = await get_all_stocks(token)
    portfolio = await get_user_portfolio(token)
    watchlist = await get_user_watchlist(token)
    found_stock = find_stock(stocks, message)
    question_type = detect_question_type(message)

    if portfolio and isinstance(portfolio, list) and len(portfolio) > 0:
        portfolio_text = "User's current portfolio:\n" + "\n".join([
            f"- {item.get('stock_symbol', item.get('symbol', 'N/A'))} | Qty: {item.get('quantity', 'N/A')} | Avg Price: {item.get('average_price', item.get('buy_price', 'N/A'))}"
            for item in portfolio
        ])
    else:
        portfolio_text = "User has no portfolio items yet."

    if watchlist and isinstance(watchlist, list) and len(watchlist) > 0:
        watchlist_text = "User's watchlist:\n" + "\n".join([
            f"- {item.get('stock_symbol', item.get('symbol', 'N/A'))} | {item.get('stock_name', item.get('name', ''))}"
            for item in watchlist
        ])
    else:
        watchlist_text = "User has no watchlist items yet."

    stock_text = f"""Specific stock asked about:
Symbol: {found_stock.get('symbol')} | Name: {found_stock.get('name')} | Price: {found_stock.get('current_price')} | Sector: {found_stock.get('sector')}""" if found_stock else "No specific stock mentioned."

    prompt = f"""User asked: {message}

{portfolio_text}

{watchlist_text}

{stock_text}

Question type: {question_type}

Instructions:
- If asking about buy/sell: Reference their actual portfolio. Is this stock already in their portfolio? Does it complement what they have?
- If asking about their portfolio: Analyze sector diversification, suggest improvements
- If asking about watchlist: Give opinion on whether watchlist stocks look promising
- If portfolio is empty: Acknowledge it and suggest they start with 2-3 diversified stocks
- Always be personal — use their actual stock names
- Add disclaimer: This is not financial advice."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": PERSONAL_SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        max_tokens=700,
        temperature=0.7
    )

    return {
        "mode": "personal",
        "message": message,
        "question_type": question_type,
        "stock_found": found_stock is not None,
        "portfolio": portfolio,
        "watchlist": watchlist,
        "reply": response.choices[0].message.content
    }
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

