FROM python:3.12-slim

WORKDIR /app

COPY backend-django/requirements.txt .
RUN pip install -r requirements.txt

COPY backend-django/ .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
