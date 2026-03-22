from fastapi import APIRouter, HTTPException
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

DJANGO_BASE_URL = "http://localhost:8000/api"

# Simple in-memory MPin storage
mpin_store = {}

async def get_jwt_token(username: str, password: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{DJANGO_BASE_URL}/users/login/",
            json={"username": username, "password": password}
        )
        data = response.json()
        return data.get("access") or data.get("token")

@router.post("/set-mpin")
def set_mpin(username: str, mpin: str):
    if len(mpin) != 6 or not mpin.isdigit():
        raise HTTPException(status_code=400, detail="MPin must be exactly 6 digits")
    mpin_store[username] = mpin
    return {"message": f"MPin set successfully for {username}"}

@router.post("/verify-mpin")
def verify_mpin(username: str, mpin: str):
    if username not in mpin_store:
        raise HTTPException(status_code=404, detail="User not found")
    if mpin_store[username] != mpin:
        raise HTTPException(status_code=401, detail="Invalid MPin")
    return {"message": "MPin verified!", "access": True}

@router.post("/chat")
async def chat(username: str, password: str, mpin: str, message: str):
    # Verify MPin first
    if username not in mpin_store or mpin_store[username] != mpin:
        raise HTTPException(status_code=401, detail="Invalid MPin - access denied")

    # Get JWT token from Django
    token = await get_jwt_token(username, password)
    if not token:
        raise HTTPException(status_code=401, detail="Could not authenticate with Django")

    # Call Django chatbot with JWT token
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{DJANGO_BASE_URL}/chatbot/ask/",
            json={"question": message},
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0
        )
    return {
        "username": username,
        "message": message,
        "reply": response.json()
    }

@router.post("/voice-chat")
async def voice_chat(username: str, password: str, mpin: str, voice_text: str):
    # Verify MPin first
    if username not in mpin_store or mpin_store[username] != mpin:
        raise HTTPException(status_code=401, detail="Invalid MPin - access denied")

    # Get JWT token from Django
    token = await get_jwt_token(username, password)
    if not token:
        raise HTTPException(status_code=401, detail="Could not authenticate with Django")

    # Call Django chatbot with JWT token
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{DJANGO_BASE_URL}/chatbot/ask/",
            json={"question": voice_text},
            headers={"Authorization": f"Bearer {token}"},
            timeout=30.0
        )
    return {
        "username": username,
        "voice_input": voice_text,
        "reply": response.json()
    }