from fastapi import APIRouter
from app.routers.chromadb_setup import add_news, search_news

router = APIRouter()

@router.post("/add")
def add_news_article(doc_id: str, text: str, source: str = ""):
    add_news(doc_id=doc_id, text=text, metadata={"source": source})
    return {"message": f"News article '{doc_id}' added successfully!"}

@router.get("/search")
def search_news_articles(query: str):
    results = search_news(query=query)
    return {"results": results}