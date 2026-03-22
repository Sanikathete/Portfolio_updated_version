from fastapi import APIRouter
from openai import OpenAI
from app.routers.chromadb_setup import add_news, search_news
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@router.post("/summarise")
async def summarise_news(text: str, doc_id: str, source: str = ""):
    # Save to ChromaDB
    add_news(doc_id=doc_id, text=text, metadata={"source": source})

    # Summarise using OpenAI
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a financial news summariser. Summarise the following stock news in 2-3 sentences."},
            {"role": "user", "content": text}
        ]
    )
    summary = response.choices[0].message.content
    return {
        "doc_id": doc_id,
        "original": text,
        "summary": summary,
        "source": source
    }

@router.get("/search-summary")
async def search_and_summarise(query: str):
    # Search ChromaDB for relevant news
    results = search_news(query=query)
    documents = results.get("documents", [[]])[0]

    if not documents:
        return {"message": "No relevant news found"}

    # Summarise all found articles together
    combined = " ".join(documents)
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a financial news summariser. Summarise these stock news articles in 3-4 sentences."},
            {"role": "user", "content": combined}
        ]
    )
    summary = response.choices[0].message.content
    return {
        "query": query,
        "summary": summary,
        "articles_found": len(documents)
    }