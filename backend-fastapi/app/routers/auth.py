from fastapi import APIRouter
import httpx

router = APIRouter()

DJANGO_BASE_URL = "http://localhost:8000/api/users"

@router.post("/register")
async def register(username: str, email: str, password: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{DJANGO_BASE_URL}/register/",
            json={
                "username": username,
                "email": email,
                "password": password
            }
        )
    return response.json()

@router.post("/login")
async def login(username: str, password: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{DJANGO_BASE_URL}/login/",
            json={
                "username": username,
                "password": password
            }
        )
    return response.json()


