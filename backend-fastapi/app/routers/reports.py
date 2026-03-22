from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
import io

router = APIRouter()

# Sample data for now — later this will come from database
SAMPLE_WATCHLIST = [
    {"symbol": "AAPL", "name": "Apple Inc", "price": 178.5},
    {"symbol": "TSLA", "name": "Tesla Inc", "price": 245.3},
    {"symbol": "GOOGL", "name": "Alphabet Inc", "price": 141.8},
]

@router.get("/watchlist/csv")
def download_watchlist_csv():
    df = pd.DataFrame(SAMPLE_WATCHLIST)
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=watchlist.csv"}
    )

@router.get("/watchlist/pdf")
def download_watchlist_pdf():
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, "StockSphere — My Watchlist")
    c.setFont("Helvetica-Bold", 12)
    c.drawString(50, 720, "Symbol")
    c.drawString(200, 720, "Company")
    c.drawString(400, 720, "Price (USD)")
    c.setFont("Helvetica", 12)
    y = 700
    for stock in SAMPLE_WATCHLIST:
        c.drawString(50, y, stock["symbol"])
        c.drawString(200, y, stock["name"])
        c.drawString(400, y, str(stock["price"]))
        y -= 25
    c.save()
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=watchlist.pdf"}
    )