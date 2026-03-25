# StockSphere Django API

This document describes the Django backend APIs currently defined under [backend-django/stocksphere/urls.py](/home/azureuser/stocksphere/backend-django/stocksphere/urls.py).

## Base URL

Local development:

```text
http://127.0.0.1:8000
```

All Django endpoints are mounted under:

```text
/api/users/
/api/stocks/
/api/portfolio/
/api/watchlist/
/api/chatbot/
```

## Authentication

Most Django APIs require JWT bearer authentication.

Use:

```http
Authorization: Bearer <access_token>
```

Token flow:

1. `POST /api/users/login/` to get `access` and `refresh`
2. Send `Authorization: Bearer <access>` on protected requests
3. `POST /api/users/token/refresh/` to refresh the access token

Exception:

- The simple watchlist helpers use `username` and `password` query params instead of JWT.

## Users

### Register

`POST /api/users/register/`

Auth:

- Public

Request body:

```json
{
  "username": "testteacher",
  "email": "testteacher@example.com",
  "password": "teacher@123",
  "phone": "9999999999"
}
```

Response:

- Creates a new user

### Login

`POST /api/users/login/`

Auth:

- Public

Request body:

```json
{
  "username": "testteacher",
  "password": "teacher@123"
}
```

Success response:

```json
{
  "refresh": "<jwt_refresh_token>",
  "access": "<jwt_access_token>"
}
```

### Refresh Token

`POST /api/users/token/refresh/`

Auth:

- Public

Request body:

```json
{
  "refresh": "<jwt_refresh_token>"
}
```

### Get Profile

`GET /api/users/profile/`

Auth:

- JWT required

Response shape:

```json
{
  "id": 1,
  "username": "testteacher",
  "email": "testteacher@example.com",
  "phone": "9999999999",
  "created_at": "2026-03-25T10:00:00Z"
}
```

### Update Profile

`PUT /api/users/profile/`

Auth:

- JWT required

Request body:

```json
{
  "username": "testteacher",
  "email": "testteacher@example.com",
  "phone": "9999999999"
}
```

## Stocks

### List Stocks

`GET /api/stocks/`

Auth:

- JWT required

Response shape:

```json
[
  {
    "id": 1,
    "symbol": "INFY",
    "name": "Infosys Ltd",
    "current_price": "1500.00",
    "currency": "INR",
    "exchange": "NSE",
    "sector": "Information Technology",
    "updated_at": "2026-03-25T10:00:00Z"
  }
]
```

Fields come from [stocks/serializers.py](/home/azureuser/stocksphere/backend-django/stocks/serializers.py).

### Get Stock Detail

`GET /api/stocks/{pk}/`

Auth:

- JWT required

Path params:

- `pk`: stock primary key

Response:

- Same stock object shape as list response

## Portfolio

### List Portfolios

`GET /api/portfolio/`

Auth:

- JWT required

Response shape:

```json
[
  {
    "id": 1,
    "name": "My Portfolio",
    "items": [
      {
        "id": 10,
        "stock": {
          "id": 1,
          "symbol": "INFY",
          "name": "Infosys Ltd",
          "current_price": "1500.00",
          "sector": "Information Technology",
          "exchange": "NSE",
          "currency": "INR"
        },
        "quantity": "2.00",
        "buy_price": "1450.00"
      }
    ]
  }
]
```

### Create Portfolio

`POST /api/portfolio/`

Auth:

- JWT required

Request body:

```json
{
  "name": "My Portfolio"
}
```

Response shape:

```json
{
  "id": 1,
  "name": "My Portfolio"
}
```

### Get Portfolio Detail

`GET /api/portfolio/{pk}/`

Auth:

- JWT required

Path params:

- `pk`: portfolio primary key

Response:

- Same object shape as portfolio list item

### Update Portfolio

`PUT /api/portfolio/{pk}/`

Auth:

- JWT required

Request body:

```json
{
  "name": "Updated Portfolio"
}
```

### Delete Portfolio

`DELETE /api/portfolio/{pk}/`

Auth:

- JWT required

### Add Stock To Portfolio

`POST /api/portfolio/{pk}/add_stock/`

Auth:

- JWT required

Path params:

- `pk`: portfolio primary key

Request body:

```json
{
  "stock_symbol": "INFY",
  "quantity": 1,
  "buy_price": 1450.0
}
```

You may send `stock_id` instead of `stock_symbol`.

Behavior:

- If `buy_price` is omitted, the API uses the current stock price
- If the stock is already in the portfolio, quantity is incremented

Success response shape:

```json
{
  "id": 10,
  "stock": {
    "id": 1,
    "symbol": "INFY",
    "name": "Infosys Ltd",
    "current_price": "1500.00",
    "sector": "Information Technology",
    "exchange": "NSE",
    "currency": "INR"
  },
  "quantity": "2.00",
  "buy_price": "1450.00"
}
```

Common error responses:

```json
{
  "error": "Portfolio not found"
}
```

```json
{
  "error": "Provide stock_id or stock_symbol"
}
```

```json
{
  "error": "Stock not found"
}
```

### Remove Stock From Portfolio

`POST /api/portfolio/{pk}/remove_stock/`

Auth:

- JWT required

Request body:

```json
{
  "stock_symbol": "INFY"
}
```

You may send `stock_id` instead of `stock_symbol`.

Success response:

```json
{
  "removed": true
}
```

## Watchlist

There are two watchlist API styles in this codebase:

1. Standard JWT-protected CRUD endpoints
2. Simple username/password query-param endpoints

### List Watchlists

`GET /api/watchlist/`

Auth:

- JWT required

Response shape:

```json
[
  {
    "id": 1,
    "name": "My Watchlist",
    "items": []
  }
]
```

### Create Watchlist

`POST /api/watchlist/`

Auth:

- JWT required

Request body:

```json
{
  "name": "My Watchlist"
}
```

### Get Watchlist Detail

`GET /api/watchlist/{pk}/`

Auth:

- JWT required

### Update Watchlist

`PUT /api/watchlist/{pk}/`

Auth:

- JWT required

Request body:

```json
{
  "name": "Updated Watchlist"
}
```

### Delete Watchlist

`DELETE /api/watchlist/{pk}/`

Auth:

- JWT required

### Add Stock To Watchlist

`POST /api/watchlist/{pk}/add_stock/`

Auth:

- JWT required

Request body:

```json
{
  "stock_symbol": "INFY"
}
```

You may send `stock_id` instead of `stock_symbol`.

Success response:

```json
{
  "id": 12,
  "created": true,
  "stock_symbol": "INFY"
}
```

### Remove Stock From Watchlist

`POST /api/watchlist/{pk}/remove_stock/`

Auth:

- JWT required

Request body:

```json
{
  "stock_symbol": "INFY"
}
```

Success response:

```json
{
  "removed": true
}
```

### Get Watchlist Simple

`GET /api/watchlist/watchlist/?username={username}&password={password}`

Auth:

- No JWT
- Uses `username` and `password` query params

Behavior:

- Authenticates the user via Django `authenticate`
- Creates a default watchlist named `My Watchlist` if none exists

Response shape:

```json
{
  "id": 1,
  "name": "My Watchlist",
  "items": [
    {
      "id": 12,
      "stock": {
        "id": 1,
        "symbol": "INFY",
        "name": "Infosys Ltd",
        "current_price": "1500.00",
        "sector": "Information Technology",
        "exchange": "NSE",
        "currency": "INR"
      },
      "created_at": "2026-03-25T10:00:00Z"
    }
  ]
}
```

Possible error:

```json
{
  "error": "Invalid credentials"
}
```

### Add Stock Simple

`POST /api/watchlist/watchlist/add?username={username}&password={password}&stock_symbol={symbol}`

Auth:

- No JWT
- Uses `username`, `password`, and `stock_symbol` query params

Behavior:

- Authenticates the user
- Creates a default watchlist if needed
- Adds the stock if it is not already present

Success response:

```json
{
  "created": true,
  "stock_symbol": "INFY"
}
```

Possible errors:

```json
{
  "error": "Invalid credentials"
}
```

```json
{
  "error": "Stock not found"
}
```

## Chatbot

### Ask Chatbot

`POST /api/chatbot/ask/`

Auth:

- JWT required

Request body:

```json
{
  "question": "What is the outlook for INFY?"
}
```

Success response:

```json
{
  "question": "What is the outlook for INFY?",
  "answer": "Generated answer text",
  "agent_type": "market_analyst"
}
```

Error responses:

```json
{
  "error": "Question is required"
}
```

```json
{
  "error": "Internal error message"
}
```

## Common Status Codes

- `200 OK`: Successful read or update
- `201 Created`: Resource created or stock newly added
- `400 Bad Request`: Missing required fields
- `401 Unauthorized`: Missing/invalid JWT or invalid query-param credentials
- `404 Not Found`: Resource or stock not found
- `500 Internal Server Error`: Server-side failure

## Notes

- The simple watchlist routes are currently nested under the Django watchlist include, so their actual paths are `/api/watchlist/watchlist/` and `/api/watchlist/watchlist/add`.
- Most stock, portfolio, watchlist, and chatbot APIs are protected by JWT.
- The watchlist serializer references `created_at` for watchlist items, while the model defines `added_at`. This document reflects the current serializer/view code, but that field should be sanity-checked in runtime responses.
