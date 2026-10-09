from __future__ import annotations

import io
import os
from functools import lru_cache
from typing import Annotated

import httpx
import jwt
from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from jwt import PyJWKClient
from pydantic import BaseModel, UUID4

from .audio_engine import (
    AudioValidationError,
    analyze,
    decode_pcm_wav,
    encode_pcm16_wav,
    generate_test_wav,
    restore,
    reference_profile,
    restore_to_reference,
)

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
APP_ENV = os.getenv("APP_ENV", "development").lower()
ENABLE_POC_TEST_MODE = os.getenv("ENABLE_POC_TEST_MODE", "false").lower() == "true"
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
    version="0.3.0",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Evolve-Processor", "X-Evolve-Strength"],
)


class RestorationRequest(BaseModel):
    artist_id: UUID4
    authorization_id: UUID4
    model_id: UUID4
    input_recording_id: UUID4


class AuthenticatedUser(BaseModel):
    id: UUID4
    aal: str | None = None


def require_poc_test_mode() -> None:
    if APP_ENV == "production" or not ENABLE_POC_TEST_MODE:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="POC test mode is disabled",
        )


async def read_test_wav(file: UploadFile) -> bytes:
    if file.content_type not in {
        "audio/wav",
        "audio/x-wav",
        "audio/wave",
        "application/octet-stream",
    } and not file.filename.lower().endswith(".wav"):
        raise HTTPException(status_code=415, detail="Milestone 2 POC accepts PCM WAV only")

    data = await file.read()
    if len(data) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="POC WAV limit is 50 MB")
    if len(data) < 44:
        raise HTTPException(status_code=400, detail="Invalid or empty WAV")

    return data


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
async def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "service": "audio-api",
        "poc_test_mode": ENABLE_POC_TEST_MODE and APP_ENV != "production",
    }


@app.get("/v1/security/session")
async def security_session(user: Annotated[AuthenticatedUser, Depends(current_user)]) -> dict[str, str | None]:
    return {"user_id": str(user.id), "aal": user.aal}


@app.get("/v1/poc/test-tone")
async def poc_test_tone(
    duration: Annotated[float, Query(ge=1.0, le=30.0)] = 6.0,
) -> StreamingResponse:
    require_poc_test_mode()
    wav = generate_test_wav(duration_seconds=duration)
    return StreamingResponse(
        io.BytesIO(wav),
        media_type="audio/wav",
        headers={"Content-Disposition": 'inline; filename="evolve-poc-test.wav"'},
    )


@app.post("/v1/poc/analyze")
async def poc_analyze(file: Annotated[UploadFile, File(...)]) -> dict:
    require_poc_test_mode()
    data = await read_test_wav(file)
    try:
        audio = decode_pcm_wav(data)
    except AudioValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return analyze(audio)


@app.post("/v1/poc/restore")
async def poc_restore(
    file: Annotated[UploadFile, File(...)],
    strength: Annotated[float, Query(ge=0.0, le=1.0)] = 0.55,
) -> StreamingResponse:
    require_poc_test_mode()
    data = await read_test_wav(file)
    try:
        audio = decode_pcm_wav(data)
        restored = restore(audio, strength=strength)
        output = encode_pcm16_wav(restored)
    except AudioValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return StreamingResponse(
        io.BytesIO(output),
        media_type="audio/wav",
        headers={
            "Content-Disposition": 'inline; filename="evolve-restored-poc.wav"',
            "X-Evolve-Processor": "milestone2-dsp-poc-v1",
            "X-Evolve-Strength": f"{strength:.2f}",
        },
    )


@app.post("/v1/poc/reference-profile")
async def poc_reference_profile(
    reference: Annotated[UploadFile, File(...)],
) -> dict:
    require_poc_test_mode()
    data = await read_test_wav(reference)
    try:
        audio = decode_pcm_wav(data)
    except AudioValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {
        "processor": "milestone2-reference-profile-v1",
        "profile": reference_profile(audio),
        "analysis": analyze(audio),
    }


@app.post("/v1/poc/restore-reference")
async def poc_restore_reference(
    current: Annotated[UploadFile, File(...)],
    reference: Annotated[UploadFile, File(...)],
    strength: Annotated[float, Query(ge=0.0, le=1.0)] = 0.55,
) -> StreamingResponse:
    require_poc_test_mode()
    current_data = await read_test_wav(current)
    reference_data = await read_test_wav(reference)
    try:
        current_audio = decode_pcm_wav(current_data)
        reference_audio = decode_pcm_wav(reference_data)
        restored, _ = restore_to_reference(current_audio, reference_audio, strength=strength)
        output = encode_pcm16_wav(restored)
    except AudioValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return StreamingResponse(
        io.BytesIO(output),
        media_type="audio/wav",
        headers={
            "Content-Disposition": 'inline; filename="evolve-reference-restored-poc.wav"',
            "X-Evolve-Processor": "milestone2-reference-conditioned-dsp-v1",
            "X-Evolve-Strength": f"{strength:.2f}",
        },
    )


@app.post("/v1/restoration/jobs", status_code=501)
async def create_restoration_job(
    request: RestorationRequest,
    token: Annotated[str, Depends(get_bearer_token)],
    user: Annotated[AuthenticatedUser, Depends(current_user)],
) -> dict[str, str]:
    artists = await postgrest_get(
        "artists",
        token,
        {"select": "id,organization_id", "id": f"eq.{request.artist_id}", "limit": "1"},
    )
    if not artists:
        raise HTTPException(status_code=403, detail="Artist access denied")

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

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=f"Security gate passed for user {user.id}; authorized model inference is the next Milestone 2 step",
    )
