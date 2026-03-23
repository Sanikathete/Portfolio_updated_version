from fastapi import FastAPI
from dotenv import load_dotenv
from app.routers import watchlist
from app.routers import news
from app.routers import auth
from app.routers import news_summary
from app.routers import reports
from app.routers import chatbot
from app.routers import stocks

load_dotenv()

app = FastAPI(title="StockSphere API", version="1.0.0")

app.include_router(watchlist.router, prefix="/watchlist", tags=["Watchlist"])
app.include_router(news.router, prefix="/news", tags=["News"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(news_summary.router, prefix="/news-summary", tags=["News Summary"])
app.include_router(reports.router, prefix="/reports", tags=["Reports"])
app.include_router(chatbot.router, prefix="/chatbot", tags=["Chatbot"])
app.include_router(stocks.router, prefix="/data", tags=["Stocks & Portfolio"])

@app.get("/")
def home():
    return {"message": "StockSphere FastAPI is running!"}

@app.get("/health")
def health():
    return {"status": "ok"}