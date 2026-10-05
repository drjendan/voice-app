from __future__ import annotations

import os
from functools import lru_cache
from typing import Annotated

import httpx
import jwt
from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from jwt import PyJWKClient
from pydantic import BaseModel, UUID4

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
ALLOWED_ORIGINS = [
    value.strip()
    for value in os.getenv(
        "ALLOWED_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173",
    ).split(",")
    if value.strip()
]

app = FastAPI(
    title="Evolve AI Vocal Audio API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


class RestorationRequest(BaseModel):
    artist_id: UUID4
    authorization_id: UUID4
    model_id: UUID4
    input_recording_id: UUID4


class AuthenticatedUser(BaseModel):
    id: UUID4
    aal: str | None = None


@lru_cache
def jwks_client() -> PyJWKClient:
    if not SUPABASE_URL:
        raise RuntimeError("SUPABASE_URL is not configured")
    return PyJWKClient(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json")


def get_bearer_token(authorization: Annotated[str | None, Header()] = None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token required")
    return authorization.removeprefix("Bearer ").strip()


def current_user(token: Annotated[str, Depends(get_bearer_token)]) -> AuthenticatedUser:
    try:
        signing_key = jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
            issuer=f"{SUPABASE_URL}/auth/v1",
        )
        return AuthenticatedUser(id=claims["sub"], aal=claims.get("aal"))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token") from exc


async def postgrest_get(path: str, token: str, params: dict[str, str]) -> list[dict]:
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=503, detail="API security configuration is incomplete")
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=headers, params=params)
    if response.status_code >= 400:
        raise HTTPException(status_code=403, detail="Authorization check failed")
    return response.json()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "audio-api"}


@app.get("/v1/security/session")
async def security_session(user: Annotated[AuthenticatedUser, Depends(current_user)]) -> dict[str, str | None]:
    return {"user_id": str(user.id), "aal": user.aal}


@app.post("/v1/restoration/jobs", status_code=501)
async def create_restoration_job(
    request: RestorationRequest,
    token: Annotated[str, Depends(get_bearer_token)],
    user: Annotated[AuthenticatedUser, Depends(current_user)],
) -> dict[str, str]:
    # 1) RLS-backed artist membership check.
    artists = await postgrest_get(
        "artists",
        token,
        {"select": "id,organization_id", "id": f"eq.{request.artist_id}", "limit": "1"},
    )
    if not artists:
        raise HTTPException(status_code=403, detail="Artist access denied")

    # 2) Active authorization must belong to the same artist and cover restoration.
    auth_rows = await postgrest_get(
        "artist_authorizations",
        token,
        {
            "select": "id,status,permitted_uses,effective_at,expires_at",
            "id": f"eq.{request.authorization_id}",
            "artist_id": f"eq.{request.artist_id}",
            "status": "eq.approved",
            "limit": "1",
        },
    )
    if not auth_rows:
        raise HTTPException(status_code=403, detail="Active artist authorization required")
    permitted = auth_rows[0].get("permitted_uses") or []
    if "studio_restoration" not in permitted and "live_performance" not in permitted:
        raise HTTPException(status_code=403, detail="Authorization does not permit vocal processing")

    # 3) Model and input recording must resolve through RLS to the same artist.
    models = await postgrest_get(
        "voice_models",
        token,
        {
            "select": "id,status,authorization_id",
            "id": f"eq.{request.model_id}",
            "artist_id": f"eq.{request.artist_id}",
            "authorization_id": f"eq.{request.authorization_id}",
            "limit": "1",
        },
    )
    if not models or models[0].get("status") not in {"approved", "active"}:
        raise HTTPException(status_code=403, detail="Approved model required")

    recordings = await postgrest_get(
        "recordings",
        token,
        {
            "select": "id,artist_id,storage_path",
            "id": f"eq.{request.input_recording_id}",
            "artist_id": f"eq.{request.artist_id}",
            "limit": "1",
        },
    )
    if not recordings:
        raise HTTPException(status_code=403, detail="Input recording access denied")

    # Milestone 1 stops here by design. All security gates are evaluated before
    # a future Milestone 2 processing worker is allowed to receive the asset.
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"Security gate passed for user {user.id}; restoration engine begins in Milestone 2",
    )
