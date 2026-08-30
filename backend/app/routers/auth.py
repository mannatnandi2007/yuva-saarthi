# YUVAA Saarthi Auth Router
# Reference: PRD §3.1 (Auth & Onboarding)
# Direct username/name registration with unique username check and contact names

import re
import uuid
from typing import List, Optional, Dict
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.supabase_client import supabase
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

# In-memory registry to ensure instant username uniqueness & offline dev persistence
_REGISTERED_USERS: Dict[str, dict] = {}

class EmergencyContactSchema(BaseModel):
    first_name: str = Field(..., description="First name of emergency contact")
    last_name: str = Field(..., description="Last name of emergency contact")
    relationship: str = Field(..., description="Relationship: Parent, Guardian, Sibling, Friend, Other")
    phone: str = Field(..., description="Mobile number for contact")
    priority_order: int = Field(..., ge=1, le=3, description="Priority list order 1-3")


class SignUpRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30, description="Unique username")
    first_name: str = Field(..., min_length=1, max_length=50, description="User's first name")
    last_name: str = Field(..., min_length=1, max_length=50, description="User's last name")
    phone: str = Field(..., description="User mobile number for safety matching")
    age_band: str = Field("16-17", description="Age bands: under-13, 13-15, 16-17, 18-plus, other")
    consent_given: bool = Field(True, description="Safety promise consent")
    policy_ack: bool = Field(True, description="Ack of policy details")
    emergency_contacts: List[EmergencyContactSchema] = Field(..., max_length=3, min_length=1)


class LoginRequest(BaseModel):
    username: str = Field(..., description="Existing unique username")


class VerifyRequest(BaseModel):
    phone: str
    otp_code: str
    age_band: Optional[str] = "16-17"
    emergency_contacts: Optional[List[EmergencyContactSchema]] = None


def get_10_digit_key(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    return digits[-10:] if len(digits) >= 10 else digits


def normalize_phone_number(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) >= 10:
        return f"+91{digits[-10:]}"
    return f"+{digits}" if digits else ""


def validate_emergency_contacts(user_phone: str, contacts: List[EmergencyContactSchema]):
    user_key = get_10_digit_key(user_phone)
    if len(user_key) != 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid 10-digit phone number for yourself."
        )
    seen_contacts = set()

    for c in contacts:
        contact_key = get_10_digit_key(c.phone)
        if len(contact_key) != 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Please enter a valid 10-digit phone number for {c.first_name} ({c.relationship})."
            )
        if contact_key == user_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Emergency contact phone cannot be the same as your own phone number. Your safety contacts must be someone who can be reached on your behalf during an emergency."
            )
        if contact_key in seen_contacts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate emergency contact numbers are not allowed. Please provide distinct phone numbers."
            )
        seen_contacts.add(contact_key)


@router.post("/signup", status_code=status.HTTP_200_OK)
async def signup(payload: SignUpRequest):
    """
    Onboard a user with username, first name, last name, phone, and emergency contacts.
    Enforces unique username and bypasses OTP requirement directly into chat.
    """
    clean_username = payload.username.strip().lower()
    if not re.match(r"^[a-zA-Z0-9_.-]+$", clean_username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username can only contain letters, numbers, underscores, and hyphens."
        )

    # 1. Enforce unique username check
    if clean_username in _REGISTERED_USERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '@{payload.username}' is already taken. Please pick another one."
        )

    # Check Supabase if reachable
    try:
        existing = supabase.table("users").select("id").eq("username", clean_username).execute()
        if existing.data and len(existing.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Username '@{payload.username}' is already taken. Please pick another one."
            )
    except HTTPException:
        raise
    except Exception:
        pass  # Supabase offline / local dev

    # 2. Validate emergency contacts
    validate_emergency_contacts(payload.phone, payload.emergency_contacts)

    user_id = str(uuid.uuid4())
    user_record = {
        "id": user_id,
        "username": clean_username,
        "first_name": payload.first_name.strip(),
        "last_name": payload.last_name.strip(),
        "phone": payload.phone.strip(),
        "age_band": payload.age_band,
        "emergency_contacts": [c.model_dump() for c in payload.emergency_contacts]
    }
    _REGISTERED_USERS[clean_username] = user_record

    # Try storing to Supabase
    try:
        supabase.table("users").upsert({
            "id": user_id,
            "username": clean_username,
            "first_name": user_record["first_name"],
            "last_name": user_record["last_name"],
            "phone": user_record["phone"],
            "age_band": user_record["age_band"]
        }).execute()

        contacts_rows = [
            {
                "user_id": user_id,
                "phone": c.phone,
                "relationship": c.relationship,
                "priority_order": c.priority_order
            }
            for c in payload.emergency_contacts
        ]
        supabase.table("emergency_contacts").insert(contacts_rows).execute()
    except Exception:
        pass

    session_token = f"user-token-{user_id}"
    return {
        "status": "success",
        "message": "Account created successfully",
        "user_id": user_id,
        "username": clean_username,
        "first_name": user_record["first_name"],
        "last_name": user_record["last_name"],
        "phone": user_record["phone"],
        "session_id": session_token,
        "access_token": session_token,
        "is_verified": True
    }


@router.post("/login", status_code=status.HTTP_200_OK)
async def login(payload: LoginRequest):
    """
    Direct login with unique username without OTP barrier.
    """
    clean_username = payload.username.strip().lower()
    user_record = _REGISTERED_USERS.get(clean_username)

    if not user_record:
        # Check Supabase
        try:
            res = supabase.table("users").select("*").eq("username", clean_username).single().execute()
            if res.data:
                user_record = res.data
                _REGISTERED_USERS[clean_username] = user_record
        except Exception:
            pass

    if not user_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '@{payload.username}' not found. Please sign up first."
        )

    user_id = user_record.get("id", str(uuid.uuid4()))
    session_token = f"user-token-{user_id}"
    return {
        "status": "success",
        "message": "Logged in successfully",
        "user_id": user_id,
        "username": clean_username,
        "first_name": user_record.get("first_name", ""),
        "last_name": user_record.get("last_name", ""),
        "phone": user_record.get("phone", ""),
        "session_id": session_token,
        "access_token": session_token,
        "is_verified": True
    }


@router.post("/verify", status_code=status.HTTP_200_OK)
async def verify_user_otp(payload: VerifyRequest):
    """
    Moved to end / optional: legacy OTP verification stub.
    """
    return {
        "status": "success",
        "message": "Verification confirmed",
        "session_id": f"verified-token-{payload.phone}"
    }
