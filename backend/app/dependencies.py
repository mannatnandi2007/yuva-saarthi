# YUVAA Saarthi — FastAPI Dependencies
# Reference: PRD §3.1 (Auth) & Execution Plan Phase 2
#
# This module provides reusable FastAPI dependencies.  The most important one is
# get_current_user(), which every protected endpoint injects to enforce that the
# caller holds a valid Supabase session token.
#
# DEV BYPASS:
#   When the environment variable DEV_BYPASS_AUTH=true is set, the dependency
#   accepts a special header X-Dev-User-Id containing a raw user UUID.
#   This ONLY works if DEV_BYPASS_AUTH=true — it must never reach production.

import os
from fastapi import Depends, HTTPException, Header, status
from typing import Optional
from app.supabase_client import supabase


# ---------------------------------------------------------------------------
# Typed holder for the authenticated user
# ---------------------------------------------------------------------------

class AuthenticatedUser:
    """
    Lightweight container for the verified user identity.
    Passed into every protected route via Depends(get_current_user).
    """
    def __init__(self, user_id: str, phone: Optional[str] = None):
        self.user_id = user_id
        self.phone = phone

    def __repr__(self) -> str:
        return f"AuthenticatedUser(user_id={self.user_id})"


# ---------------------------------------------------------------------------
# Core authentication dependency
# ---------------------------------------------------------------------------

async def get_current_user(
    authorization: Optional[str] = Header(default=None),
    x_dev_user_id: Optional[str] = Header(default=None),
) -> AuthenticatedUser:
    """
    FastAPI dependency: validates the caller's identity.

    Normal flow:
      1. Reads 'Authorization: Bearer <supabase_access_token>' header.
      2. Calls supabase.auth.get_user(token) to validate with Supabase.
      3. Returns an AuthenticatedUser with the verified user_id.

    Dev-bypass flow (only when DEV_BYPASS_AUTH=true in environment):
      - Accepts 'X-Dev-User-Id: <uuid>' header directly — no token needed.
      - USE ONLY FOR LOCAL TESTING. Never deploy with DEV_BYPASS_AUTH=true.

    Raises:
      HTTP 401 if no valid token is provided.
      HTTP 401 if Supabase token validation fails.
    """
    # -----------------------------------------------------------------------
    # Dev bypass — only active when explicitly configured
    # -----------------------------------------------------------------------
    dev_bypass = os.environ.get("DEV_BYPASS_AUTH", "false").lower() == "true"
    if dev_bypass:
        if x_dev_user_id:
            return AuthenticatedUser(user_id=x_dev_user_id)
        if authorization and "dev-" in authorization:
            return AuthenticatedUser(user_id="00000000-0000-0000-0000-000000000001")
        # Even in dev mode, still fall through to real auth if no bypass header

    # -----------------------------------------------------------------------
    # Normal production auth path
    # -----------------------------------------------------------------------
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header. Expected: 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format. Expected: 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]

    try:
        # Validate token with Supabase — this is a network call but ensures
        # the token is live and not revoked.
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user = response.user
        return AuthenticatedUser(
            user_id=str(user.id),
            phone=getattr(user, "phone", None)
        )
    except HTTPException:
        # Re-raise FastAPI exceptions without wrapping
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
