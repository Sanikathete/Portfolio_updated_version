from django.db import models
from django.conf import settings
from pgvector.django import VectorField

class Stock(models.Model):
    symbol = models.CharField(max_length=10, unique=True)
    name = models.CharField(max_length=100)
    current_price = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    currency = models.CharField(max_length=5, default='INR')
    exchange = models.CharField(max_length=50, blank=True)
    sector = models.CharField(max_length=100, blank=True)
    embedding = VectorField(dimensions=768, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def embedding_text(self) -> str:
        parts = [
            f"Symbol: {self.symbol}",
            f"Name: {self.name}",
            f"Sector: {self.sector}" if self.sector else "",
            f"Industry: {getattr(self, 'industry', '')}" if getattr(self, 'industry', None) else "",
            f"Description: {getattr(self, 'description', '')}" if getattr(self, 'description', None) else "",
        ]
        return " | ".join(p for p in parts if p)

    def save(self, *args, **kwargs):
        if not self.embedding and getattr(settings, "GEMINI_API_KEY", None):
            from chatbot.embeddings import get_embedding
            self.embedding = get_embedding(self.embedding_text())
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.symbol} - {self.name}"
