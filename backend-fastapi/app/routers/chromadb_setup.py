import chromadb
from chromadb.config import Settings

client = chromadb.Client()

collection = client.get_or_create_collection(name="stock_news")

def add_news(doc_id: str, text: str, metadata: dict = {}):
    collection.add(
        documents=[text],
        metadatas=[metadata],
        ids=[doc_id]
    )

def search_news(query: str, n_results: int = 3):
    results = collection.query(
        query_texts=[query],
        n_results=n_results
    )
    return results