"""
Waypoint ML Ranking Service — FastAPI entry point.
Layer 2 of the Waypoint architecture (TF-IDF + Cosine Similarity).

Start with: uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from .routes.assign import router as assign_router
from .config import settings

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s [%(name)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=" * 50)
    logger.info("Waypoint ML Ranking Service starting...")
    logger.info(f"  Port             : {settings.PORT}")
    logger.info(f"  Top N reviewers  : {settings.TOP_REVIEWERS_PER_STAGE}")
    logger.info(f"  DB               : {settings.MONGODB_DB_NAME}")
    logger.info("=" * 50)
    yield
    logger.info("ML Ranking Service shutting down.")


app = FastAPI(
    title="Waypoint ML Ranking Service",
    description="Layer 2 — TF-IDF reviewer expertise ranking",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(assign_router, prefix="/api", tags=["rank"])


@app.get("/")
async def root():
    return {
        "service": "Waypoint ML Ranking Service",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }
