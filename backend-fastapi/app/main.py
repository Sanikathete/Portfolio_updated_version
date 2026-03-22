from fastapi import FastAPI
from dotenv import load_dotenv
from app.routers import watchlist

load_dotenv()

app = FastAPI(title="StockSphere API", version="1.0.0")

app.include_router(watchlist.router, prefix="/watchlist", tags=["Watchlist"])

@app.get("/")
def home():
    return {"message": "StockSphere FastAPI is running!"}

@app.get("/health")
def health():
    return {"status": "ok"}