from fastapi import APIRouter, HTTPException
import httpx
import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
DJANGO_BASE_URL = "http://localhost:8000/api"

# Simple in-memory MPin storage
mpin_store = {}

# ─── Helper: Get JWT Token ───────────────────────────────────────
async def get_jwt_token(username: str, password: str):
    async with httpx.AsyncClient() as http:
        response = await http.post(
            f"{DJANGO_BASE_URL}/users/login/",
            json={"username": username, "password": password}
        )
        data = response.json()
        return data.get("access")

# ─── Helper: Get All Stocks ──────────────────────────────────────
async def get_all_stocks(token: str):
    async with httpx.AsyncClient() as http:
        response = await http.get(
            f"{DJANGO_BASE_URL}/stocks/",
            headers={"Authorization": f"Bearer {token}"}
        )
        return response.json()

# ─── Helper: Get User Portfolio ──────────────────────────────────
async def get_user_portfolio(token: str):
    async with httpx.AsyncClient() as http:
        response = await http.get(
            f"{DJANGO_BASE_URL}/portfolio/",
            headers={"Authorization": f"Bearer {token}"}
        )
        return response.json()

# ─── Helper: Get User Watchlist ──────────────────────────────────
async def get_user_watchlist(token: str):
    async with httpx.AsyncClient() as http:
        response = await http.get(
            f"{DJANGO_BASE_URL}/watchlist/",
            headers={"Authorization": f"Bearer {token}"}
        )
        return response.json()

# ─── Helper: Find Stock In List ──────────────────────────────────
def find_stock(stocks: list, query: str):
    query_upper = query.upper()
    query_words = [w for w in query_upper.split() if len(w) > 2]
    
    # First priority — exact symbol match
    for stock in stocks:
        symbol = stock.get("symbol", "").upper()
        if symbol in query_words:
            return stock
    
    # Second priority — exact name word match
    for stock in stocks:
        name = stock.get("name", "").upper()
        name_words = name.split()
        for word in query_words:
            if word in name_words and len(word) > 3:
                return stock
    
    return None
    
# ─── MPin Routes ─────────────────────────────────────────────────
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

# ─── PUBLIC CHATBOT (No MPin Required) ───────────────────────────
@router.post("/public-chat")
async def public_chat(username: str, password: str, message: str):
    token = await get_jwt_token(username, password)
    if not token:
        raise HTTPException(status_code=401, detail="Could not authenticate")

    stocks = await get_all_stocks(token)
    found_stock = find_stock(stocks, message)

    if found_stock:
        stock_context = f"""
        Symbol: {found_stock.get('symbol')}
        Name: {found_stock.get('name')}
        Current Price: ₹{found_stock.get('current_price')}
        Sector: {found_stock.get('sector')}
        Exchange: {found_stock.get('exchange')}
        """
        prompt = f"""You are a helpful stock market assistant for StockSphere.
        User asked: {message}
        Stock data from our database:
        {stock_context}
        Give a helpful general overview. Do not give personalized investment advice."""
    else:
        similar = [s for s in stocks if
                   any(word.upper() in s.get("name", "").upper()
                       for word in message.split() if len(word) > 3)][:3]
        similar_text = ", ".join([f"{s['symbol']} ({s['name']})" for s in similar]) if similar else "None found"
        prompt = f"""You are a helpful stock market assistant for StockSphere.
        User asked about: {message}
        This stock is NOT in our database of 388 NSE stocks.
        Similar stocks we found: {similar_text}
        Politely inform the user this stock is not in our database.
        Suggest similar stocks if found. Give general information if you know about it."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are StockSphere AI assistant helping users with stock market queries."},
            {"role": "user", "content": prompt}
        ]
    )
    return {
        "mode": "public",
        "message": message,
        "stock_found": found_stock is not None,
        "stock_data": found_stock,
        "reply": response.choices[0].message.content
    }

# ─── PERSONAL CHATBOT (MPin Required) ────────────────────────────
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

    portfolio_text = f"User portfolio: {portfolio}" if portfolio else "User has no portfolio yet"
    watchlist_text = f"User watchlist: {watchlist}" if watchlist else "User has no watchlist yet"
    stock_text = f"Stock details: {found_stock}" if found_stock else "Stock not in database"

    prompt = f"""You are a personal stock market assistant for StockSphere.
    User asked: {message}
    Personal Data:
    {portfolio_text}
    {watchlist_text}
    {stock_text}
    Give personalized advice based on their portfolio and watchlist.
    If stock not found suggest similar ones from our 388 NSE stocks."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are a personal StockSphere AI assistant. Give personalized advice based on user's portfolio and watchlist."},
            {"role": "user", "content": prompt}
        ]
    )
    return {
        "mode": "personal",
        "message": message,
        "stock_found": found_stock is not None,
        "portfolio": portfolio,
        "watchlist": watchlist,
        "reply": response.choices[0].message.content
    }

# ─── VOICE CHAT (MPin Required) ──────────────────────────────────
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

# ─── LEGACY CHAT (MPin Required) ─────────────────────────────────
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