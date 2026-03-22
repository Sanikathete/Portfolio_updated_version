from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_watchlist():
    return {"message": "Watchlist is working!"}

@router.post("/add")
def add_to_watchlist(stock_symbol: str):
    return {"message": f"{stock_symbol} added to watchlist!"}

@router.delete("/remove")
def remove_from_watchlist(stock_symbol: str):
    return {"message": f"{stock_symbol} removed from watchlist!"}