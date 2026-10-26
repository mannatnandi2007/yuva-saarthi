# Yuva Saarthi — Users Router
# Reference: PRD §3.1 (User profile) & Execution Plan Phase 2
#
# Endpoints:
#   GET /users/me       — authenticated user's profile from users table
#   GET /contacts       — authenticated user's emergency contacts

import logging
from fastapi import APIRouter, HTTPException, Depends, status
from typing import List

from app.dependencies import get_current_user, AuthenticatedUser
from app.supabase_client import supabase
from app.schemas import UserProfile, ContactResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["users"])


@router.get(
    "/users/me",
    response_model=UserProfile,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated user's profile",
)
def get_my_profile(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Return the authenticated user's basic profile from the users table.

    The user_id is extracted from the verified Supabase token — the client
    never supplies their own ID.

    Returns 404 if the user exists in Supabase Auth but has not completed
    onboarding (i.e., no row in the users table yet).
    """
    try:
        result = (
            supabase.table("users")
            .select("id, phone, age_band, created_at")
            .eq("id", current_user.user_id)
            .single()
            .execute()
        )
        user_data = result.data
    except Exception as e:
        logger.error("get_my_profile DB error for user %s: %s", current_user.user_id, e)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Complete onboarding first.",
        )

    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found. Complete onboarding first.",
        )

    return UserProfile(**user_data)


@router.get(
    "/contacts",
    response_model=List[ContactResponse],
    status_code=status.HTTP_200_OK,
    summary="Get authenticated user's emergency contacts",
)
def get_my_contacts(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Return the authenticated user's emergency contacts, ordered by priority.

    Ownership is enforced by filtering on user_id from the token — a user
    can never retrieve another user's contacts.
    """
    try:
        result = (
            supabase.table("emergency_contacts")
            .select("id, phone, relationship, priority_order")
            .eq("user_id", current_user.user_id)
            .order("priority_order", desc=False)
            .execute()
        )
        contacts = result.data or []
    except Exception as e:
        logger.error("get_my_contacts DB error for user %s: %s", current_user.user_id, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not retrieve contacts.",
        )

    return [ContactResponse(**c) for c in contacts]
