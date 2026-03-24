from fastapi import APIRouter, HTTPException
import httpx
from app.pgvector_setup import setup_vector_table, load_stocks_to_pgvector, search_similar_stocks

router = APIRouter()

DJANGO_BASE_URL = "http://localhost:8000/api"

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
@router.post("/setup")
async def setup_pgvector():
    try:
        setup_vector_table()
        return {"message": "PGVector table created successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/load-stocks")
async def load_stocks(username: str, password: str):
    try:
        token = await get_jwt_token(username, password)
        if not token:
            raise HTTPException(status_code=401, detail="Could not authenticate")
        stocks = await get_all_stocks(token)
        load_stocks_to_pgvector(stocks)
        return {"message": f"Successfully loaded {len(stocks)} stocks into PGVector!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_stocks(query: str, limit: int = 5):
    try:
        results = search_similar_stocks(query, limit)
        return {"query": query, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

