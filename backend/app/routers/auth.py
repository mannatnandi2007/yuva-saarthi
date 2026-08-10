# YUVAA Saarthi Auth Router
# Reference: PRD §3.1 (Auth & Onboarding) & Execution Plan Day 1

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional

router = APIRouter(prefix="/auth", tags=["auth"])

class EmergencyContactSchema(BaseModel):
    phone: str = Field(..., description="Mobile number for contact")
    relationship: str = Field(..., description="Relationship: Parent, Guardian, Sibling, Friend, Other")
    priority_order: int = Field(..., ge=1, le=3, description="Priority list order 1-3")

class SignUpRequest(BaseModel):
    phone: str = Field(..., description="User verified phone number")
    age_band: str = Field(..., description="Age bands: under-13, 13-15, 16-17, 18-plus, other")
    consent_given: bool = Field(..., description="Safety promise consent")
    policy_ack: bool = Field(..., description="Ack of policy details")
    emergency_contacts: List[EmergencyContactSchema] = Field(..., max_items=3, min_items=1)

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(payload: SignUpRequest):
    """
    Onboard a user with phone and emergency contacts.
    TODO: Implement Supabase Auth phone-OTP trigger for user and emergency contact validation (PRD §3.1).
    Validation warning logic:
        - If only 'Sibling' or 'Friend' are added as contacts, return warning flag suggesting adding an adult.
    """
    contact_relationships = [c.relationship for c in payload.emergency_contacts]
    has_adult = any(r in ["Parent", "Guardian", "Other"] for r in contact_relationships)
    
    warning = None
    if not has_adult:
        # Soft validation prompt suggestion (PRD §3.1)
        warning = "For safety emergencies, having an adult contact can help us get you support faster — want to add one too?"

    # Placeholder for database inserts into 'users' and 'emergency_contacts' tables
    return {
        "message": "Verification code sent to user phone",
        "phone": payload.phone,
        "warning": warning
    }

@router.post("/verify", status_code=status.HTTP_200_OK)
async def verify_user_otp(phone: str, otp_code: str):
    """
    Verify user OTP token using Supabase Auth.
    TODO: Complete OTP validation checks (PRD §3.1).
    """
    return {
        "status": "success",
        "session_id": "dummy-session-id-token"
    }
