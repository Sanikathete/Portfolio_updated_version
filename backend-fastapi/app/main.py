from fastapi import FastAPI
from dotenv import load_dotenv
from app.routers import watchlist
from app.routers import news

load_dotenv()

app = FastAPI(title="StockSphere API", version="1.0.0")

app.include_router(watchlist.router, prefix="/watchlist", tags=["Watchlist"])
app.include_router(news.router, prefix="/news", tags=["News"])

@app.get("/")
def home():
    return {"message": "StockSphere FastAPI is running!"}

@app.get("/health")
def health():
    return {"status": "ok"}