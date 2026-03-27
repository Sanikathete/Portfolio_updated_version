from django.core.management.base import BaseCommand

from chatbot.embeddings import generate_all_embeddings


class Command(BaseCommand):
    help = "Generate missing stock embeddings using Gemini and store them in pgvector."

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch-size",
            type=int,
            default=100,
            help="Number of stocks to embed per batch.",
        )

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        generate_all_embeddings(batch_size=batch_size)
