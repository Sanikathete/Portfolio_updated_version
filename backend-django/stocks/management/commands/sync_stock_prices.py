from django.core.management.base import BaseCommand

from stocks.live_prices import sync_stock_prices
from stocks.models import Stock


class Command(BaseCommand):
    help = "Refresh stored stock current_price values from Yahoo Finance."

    def handle(self, *args, **options):
        total = Stock.objects.count()
        self.stdout.write(f"Starting stock price sync for {total} symbols...")
        result = sync_stock_prices()
        self.stdout.write(
            self.style.SUCCESS(
                f"Stock price sync complete. Updated: {result.updated}, skipped: {result.skipped}"
            )
        )
