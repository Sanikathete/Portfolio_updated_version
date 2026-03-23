from fastapi import APIRouter
import httpx
import chromadb
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

DJANGO_BASE_URL = "http://localhost:8000/api"

# Initialize ChromaDB
chroma_client = chromadb.Client()
stocks_collection = chroma_client.get_or_create_collection(name="stocks_data")

async def get_jwt_token(username: str, password: str):
    async with httpx.AsyncClient() as http:
        response = await http.post(
            f"{DJANGO_BASE_URL}/users/login/",
            json={"username": username, "password": password}
        )
        data = response.json()
        return data.get("access")

@router.post("/load-stocks")
async def load_stocks_to_chromadb(username: str, password: str):
    # Get JWT token
    token = await get_jwt_token(username, password)
    if not token:
        return {"error": "Could not authenticate"}

    # Fetch all stocks from Django
    async with httpx.AsyncClient() as http:
        response = await http.get(
            f"{DJANGO_BASE_URL}/stocks/",
            headers={"Authorization": f"Bearer {token}"}
        )
        stocks = response.json()

    # Load stocks into ChromaDB
    documents = []
    metadatas = []
    ids = []

    for stock in stocks:
        # Create a text description for each stock
        doc_text = f"""
        Symbol: {stock.get('symbol')}
        Name: {stock.get('name')}
        Sector: {stock.get('sector')}
        Exchange: {stock.get('exchange')}
        """
        documents.append(doc_text)
        metadatas.append({
            "symbol": stock.get('symbol', ''),
            "name": stock.get('name', ''),
            "sector": stock.get('sector', ''),
            "exchange": stock.get('exchange', ''),
            "id": str(stock.get('id', ''))
        })
        ids.append(f"stock_{stock.get('id')}")

    # Add to ChromaDB in batches
    batch_size = 50
    for i in range(0, len(documents), batch_size):
        stocks_collection.add(
            documents=documents[i:i+batch_size],
            metadatas=metadatas[i:i+batch_size],
            ids=ids[i:i+batch_size]
        )

    return {
        "message": f"Successfully loaded {len(stocks)} stocks into ChromaDB!",
        "total_stocks": len(stocks)
    }

@router.get("/search-stocks")
async def search_stocks_in_chromadb(query: str, n_results: int = 5):
    results = stocks_collection.query(
        query_texts=[query],
        n_results=n_results
    )
    return {
        "query": query,
        "results": results
    }

@router.get("/stock-count")
def get_stock_count():
    count = stocks_collection.count()
    return {"stocks_in_chromadb": count}