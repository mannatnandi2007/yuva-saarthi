# YUVAA Saarthi Auth Router
# Reference: PRD §3.1 (Auth & Onboarding) & Execution Plan Day 1

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from app.supabase_client import supabase

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

class VerifyRequest(BaseModel):
    phone: str
    otp_code: str
    age_band: str
    emergency_contacts: List[EmergencyContactSchema]

@router.post("/signup", status_code=status.HTTP_200_OK)
async def signup(payload: SignUpRequest):
    """
    Onboard a user with phone and emergency contacts.
    Triggers Supabase Auth phone-OTP.
    """
    contact_relationships = [c.relationship for c in payload.emergency_contacts]
    has_adult = any(r in ["Parent", "Guardian", "Other"] for r in contact_relationships)
    
    warning = None
    if not has_adult:
        warning = "For safety emergencies, having an adult contact can help us get you support faster — want to add one too?"

    try:
        response = supabase.auth.sign_in_with_otp({"phone": payload.phone})
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "message": "Verification code sent to user phone",
        "phone": payload.phone,
        "warning": warning
    }

@router.post("/verify", status_code=status.HTTP_200_OK)
async def verify_user_otp(payload: VerifyRequest):
    """
    Verify user OTP token using Supabase Auth.
    On success, stores user and emergency contact details in the DB.
    """
    try:
        res = supabase.auth.verify_otp({"phone": payload.phone, "token": payload.otp_code, "type": 'sms'})
        user = res.user
        if not user:
            raise HTTPException(status_code=400, detail="Invalid OTP")
            
        # Store user in the custom users table
        supabase.table("users").upsert({
            "id": user.id,
            "phone": payload.phone,
            "age_band": payload.age_band
        }).execute()
        
        # Clear existing contacts to prevent duplicates on re-verification
        supabase.table("emergency_contacts").delete().eq("user_id", user.id).execute()
        
        # Store emergency contacts
        contacts_data = [
            {
                "user_id": user.id,
                "phone": c.phone,
                "relationship": c.relationship,
                "priority_order": c.priority_order
            }
            for c in payload.emergency_contacts
        ]
        if contacts_data:
            supabase.table("emergency_contacts").insert(contacts_data).execute()
            
        return {
            "status": "success",
            "session_id": res.session.access_token
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

