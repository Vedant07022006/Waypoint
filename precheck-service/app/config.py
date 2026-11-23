import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

env_path = Path(__file__).resolve().parent.parent / ".env"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(env_path) if env_path.exists() else ".env", env_file_encoding="utf-8")

    PORT: int = 8001
    GROQ_API_KEY: str
    GROQ_MODEL: str = "qwen/qwen3.8-27b"
    NODE_BACKEND_URL: str = "http://localhost:8000"
    PRECHECK_SECRET: str


settings = Settings()
