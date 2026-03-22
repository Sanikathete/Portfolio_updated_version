from fastapi import APIRouter, HTTPException
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

DJANGO_CHATBOT_URL = "http://localhost:8000/api/chatbot/ask/"

# Simple in-memory MPin storage
mpin_store = {}

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
async def chat(username: str, mpin: str, message: str):
    if username not in mpin_store or mpin_store[username] != mpin:
        raise HTTPException(status_code=401, detail="Invalid MPin - access denied")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            DJANGO_CHATBOT_URL,
            json={"question": message},
            timeout=30.0
        )
    return {
        "username": username,
        "message": message,
        "reply": response.json()
    }

@router.post("/voice-chat")
async def voice_chat(username: str, mpin: str, voice_text: str):
    if username not in mpin_store or mpin_store[username] != mpin:
        raise HTTPException(status_code=401, detail="Invalid MPin - access denied")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            DJANGO_CHATBOT_URL,
            json={"question": voice_text},
            timeout=30.0
        )
    return {
        "username": username,
        "voice_input": voice_text,
        "reply": response.json()
    }