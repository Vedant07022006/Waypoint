from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    PORT: int = 8002
    MONGODB_URI: str
    MONGODB_DB_NAME: str = "test"
    TOP_REVIEWERS_PER_STAGE: int = 2
    ML_SECRET: str
    NODE_BACKEND_URL: str = "http://localhost:8000"


settings = Settings()
