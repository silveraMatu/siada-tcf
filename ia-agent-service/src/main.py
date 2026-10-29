from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from features.health.router import router as health_router

app: FastAPI = FastAPI(title="SIADA AI AGENT API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else [],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
