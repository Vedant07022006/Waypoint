"""
Waypoint Pre-Check Service — FastAPI entry point.
Layer 3 of the Waypoint architecture (LangGraph + Groq).

Start with:  uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.precheck import router as precheck_router
from .config import settings

# ── Logging setup ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("main")


# ── Lifespan: startup / shutdown events ───────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 50)
    logger.info("Waypoint Pre-Check Service starting...")
    logger.info(f"  Model : {settings.GROQ_MODEL}")
    logger.info(f"  Port  : {settings.PORT}")
    logger.info(f"  Backend: {settings.NODE_BACKEND_URL}")
    logger.info("=" * 50)
    yield
    logger.info("Pre-Check Service shutting down.")


# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Waypoint Pre-Check Service",
    description="Layer 3 — LangGraph-powered parallel code review pipeline",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(precheck_router, prefix="/api", tags=["precheck"])

@app.get("/", tags=["root"])
async def root():
    return {
        "service": "Waypoint Pre-Check Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }
