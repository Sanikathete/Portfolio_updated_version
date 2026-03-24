import psycopg2
from pgvector.psycopg2 import register_vector
from sentence_transformers import SentenceTransformer

DB_NAME = "stocksphere_db"
DB_USER = "stocksphere_user"
DB_PASSWORD = "stocksphere@123"
DB_HOST = "localhost"
DB_PORT = "5432"

print("Loading AI model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Model loaded!")

def get_connection():
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )
    register_vector(conn)
    return conn

def setup_vector_table():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
    cur.execute("""
        CREATE TABLE IF NOT EXISTS stock_vectors (
            id SERIAL PRIMARY KEY,
            symbol VARCHAR(20),
            name VARCHAR(200),
            sector VARCHAR(100),
            exchange VARCHAR(20),
            current_price FLOAT,
            content TEXT,
            embedding vector(384)
        );
    """)
    conn.commit()
    cur.close()
    conn.close()
    print("Vector table created!")
def load_stocks_to_pgvector(stocks: list):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM stock_vectors;")
    for stock in stocks:
        content = f"""
        Stock Symbol: {stock.get('symbol')}
        Company Name: {stock.get('name')}
        Sector: {stock.get('sector')}
        Exchange: {stock.get('exchange')}
        Current Price: {stock.get('current_price')} INR
        """
        embedding = model.encode(content).tolist()
        cur.execute("""
            INSERT INTO stock_vectors
            (symbol, name, sector, exchange, current_price, content, embedding)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            stock.get('symbol'),
            stock.get('name'),
            stock.get('sector'),
            stock.get('exchange'),
            float(stock.get('current_price', 0)),
            content,
            embedding
        ))
    conn.commit()
    cur.close()
    conn.close()
    print(f"Loaded {len(stocks)} stocks into PGVector!")
def search_similar_stocks(query: str, limit: int = 5):
    conn = get_connection()
    cur = conn.cursor()
    query_embedding = model.encode(query).tolist()
    cur.execute("""
        SELECT symbol, name, sector, current_price, content
        FROM stock_vectors
        ORDER BY embedding <-> %s::vector
        LIMIT %s;
    """, (query_embedding, limit))
    results = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {
            "symbol": r[0],
            "name": r[1],
            "sector": r[2],
            "current_price": r[3],
            "content": r[4]
        }
        for r in results
    ]

