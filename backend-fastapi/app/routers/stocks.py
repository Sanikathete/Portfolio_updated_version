from fastapi import APIRouter, HTTPException
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

DJANGO_BASE_URL = "http://localhost:8000/api"

async def get_jwt_token(username: str, password: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{DJANGO_BASE_URL}/users/login/",
            json={"username": username, "password": password}
        )
        data = response.json()
        return data.get("access") or data.get("token")

@router.get("/stocks")
async def get_stocks(username: str, password: str):
    token = await get_jwt_token(username, password)
    if not token:
        raise HTTPException(status_code=401, detail="Could not authenticate")
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{DJANGO_BASE_URL}/stocks/",
            headers={"Authorization": f"Bearer {token}"}
        )
    return response.json()

@router.get("/portfolio")
async def get_portfolio(username: str, password: str):
    token = await get_jwt_token(username, password)
    if not token:
        raise HTTPException(status_code=401, detail="Could not authenticate")
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{DJANGO_BASE_URL}/portfolio/",
            headers={"Authorization": f"Bearer {token}"}
        )
    return response.json()