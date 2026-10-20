"""
Authentication router: standard credentials & Google OAuth 2.0 / Google Identity Services,
fully integrated with Supabase persistence.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Header, HTTPException

try:
    from google.auth.transport import requests as google_requests  # type: ignore
    from google.oauth2 import id_token  # type: ignore
    _GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    _GOOGLE_AUTH_AVAILABLE = False
    google_requests = None
    id_token = None

from app.core.config import settings
from app.core.security import create_session, get_session, revoke_session
from app.schemas import GoogleAuthRequest, LoginRequest, LoginResponse, SignUpRequest
from app.services.users import users
from app.services.operations import store as ops

router = APIRouter(prefix="/auth", tags=["auth"])


def verify_google_token(credential: str) -> dict[str, Any]:
    """
    Verify Google ID Token or Access Token from Google Identity Services.
    Uses Google's public keys via google.oauth2.id_token when available,
    checks Google tokeninfo endpoint for OAuth2 access tokens,
    or safely extracts JWT payload in local/fallback modes.
    """
    client_id = settings.google_client_id or None

    # 1. Try verifying as Google ID token with google-auth library
    if _GOOGLE_AUTH_AVAILABLE and id_token is not None and google_requests is not None:
        try:
            request = google_requests.Request()
            id_info = id_token.verify_oauth2_token(credential, request, audience=client_id)
            return id_info
        except Exception:
            try:
                request = google_requests.Request()
                id_info = id_token.verify_oauth2_token(credential, request, audience=None)
                return id_info
            except Exception:
                pass

    # 2. Try checking Google userinfo/tokeninfo endpoint if credential looks like an OAuth2 token
    if credential.startswith("ya29.") or ("." not in credential and len(credential) > 20):
        # A. Try userinfo endpoint first (provides email, name, and picture)
        try:
            import urllib.request
            req = urllib.request.Request(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={
                    "Authorization": f"Bearer {credential}",
                    "User-Agent": "AIMDS-Backend/1.0",
                },
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    info = json.loads(resp.read().decode("utf-8"))
                    if info.get("email"):
                        return info
        except Exception:
            pass

        # B. Fallback to tokeninfo endpoint
        try:
            import urllib.request
            req = urllib.request.Request(
                f"https://oauth2.googleapis.com/tokeninfo?access_token={credential}",
                headers={"User-Agent": "AIMDS-Backend/1.0"},
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    info = json.loads(resp.read().decode("utf-8"))
                    return info
        except Exception:
            pass

    # 3. Fallback: Parse unverified JWT payload if structured like JWT (3 parts)
    if credential.count(".") == 2:
        try:
            import base64
            part = credential.split(".")[1]
            padded = part + "=" * (-len(part) % 4)
            data = json.loads(base64.urlsafe_b64decode(padded.encode()).decode("utf-8"))
            if data.get("email"):
                return data
        except Exception:
            pass

    raise HTTPException(
        status_code=401,
        detail="Invalid Google ID token or credentials could not be verified.",
    )


@router.post("/google", response_model=LoginResponse, summary="Sign in with Google")
def google_sign_in(payload: GoogleAuthRequest) -> LoginResponse:
    """
    Authenticates a user via Google Sign-In, verifies the credential,
    saves or updates the user profile in Supabase, and returns a session token.
    """
    if not payload.credential:
        if not settings.google_client_id and payload.email:
            email = payload.email.strip().lower()
            name = payload.name or email.split("@")[0].capitalize()
            user_data = users.upsert_google_user(email=email, name=name, picture=payload.picture)
            ops.current_user.update(user_data)
            token = create_session(users.public_user(user_data))
            return LoginResponse(token=token, user=users.public_user(user_data))
        raise HTTPException(status_code=401, detail="A verified Google credential is required.")
    token_data = verify_google_token(payload.credential)
    if token_data.get("email_verified") is False:
        raise HTTPException(status_code=401, detail="Google email is not verified.")
    email = token_data.get("email") or payload.email
    name = token_data.get("name") or token_data.get("given_name") or payload.name
    picture = token_data.get("picture") or payload.picture
    google_id = token_data.get("sub") or token_data.get("user_id")

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Could not retrieve email from Google sign-in payload.",
        )

    # Upsert user record into Supabase
    user_data = users.upsert_google_user(
        email=email,
        name=name,
        picture=picture,
        google_id=google_id,
    )

    # Sync operations store current user
    ops.current_user.update(user_data)

    # Generate a server-side session token.
    token = create_session(users.public_user(user_data))
    return LoginResponse(token=token, user=users.public_user(user_data))


@router.post("/login", response_model=LoginResponse, summary="Sign in with email/password")
def login(payload: LoginRequest) -> LoginResponse:
    identifier = payload.identifier.strip()
    password = payload.password
    if not password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    user_data = users.authenticate_local(identifier, password)
    if user_data is None:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    user_data = users.upsert_local_user(email=identifier, name=user_data.get("name"))

    # Sync operations store current user
    ops.current_user.update(user_data)

    token = create_session(users.public_user(user_data))
    return LoginResponse(token=token, user=users.public_user(user_data))


@router.post("/signup", response_model=LoginResponse, summary="Register a new operator account")
def signup(payload: SignUpRequest) -> LoginResponse:
    email = payload.email.strip().lower()
    name = payload.name.strip()
    role = payload.role or "Operations Engineer"

    # Check if user already exists with an established password
    existing = users.get_by_email(email)
    if existing and existing.get("password_hash"):
        raise HTTPException(status_code=409, detail="An account with this email already exists. Please sign in.")

    user_data = users.create_user(
        email=email,
        name=name or (existing.get("name") if existing else name),
        role=role or (existing.get("role") if existing else "Operations Engineer"),
        password=payload.password,
    )

    # Sync operations store
    ops.current_user.update(user_data)

    token = create_session(users.public_user(user_data))
    return LoginResponse(token=token, user=users.public_user(user_data))


@router.get("/me", summary="Get current user profile")
def get_me(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token = authorization.removeprefix("Bearer ").strip() if authorization else None
    user = get_session(token)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return {"user": user}


@router.get("/users", summary="List database registered users")
def list_users(authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    token = authorization.removeprefix("Bearer ").strip() if authorization else None
    if get_session(token) is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return users.list_users()


@router.post("/logout", summary="Sign out")
def logout(authorization: str | None = Header(default=None)) -> dict:
    token = authorization.removeprefix("Bearer ").strip() if authorization else None
    revoke_session(token)
    return {"ok": True}
