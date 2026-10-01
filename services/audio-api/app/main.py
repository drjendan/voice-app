from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Vocal Legacy Audio API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "audio-api"}

@app.post("/v1/restoration/jobs", status_code=501)
async def create_restoration_job() -> dict[str, str]:
    """
    Placeholder only. Production implementation must verify:
    1. authenticated user,
    2. tenant + artist membership,
    3. active artist authorization,
    4. approved model version,
    5. asset access through private storage,
    before any processing begins.
    """
    return {"status": "not_implemented"}
