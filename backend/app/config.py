from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    """Values come from environment variables or backend/.env (see .env.example)."""

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    database_url: str = "postgresql+psycopg://127.0.0.1:5435/coursepilot"
    frontend_url: str = "http://localhost:5173"

    # The key that signs login tokens. Anyone who knows it can create a valid token for any user,
    # so it has no default: it must come from the environment and is never committed.
    jwt_secret: str = Field(min_length=32)
    access_token_expire_minutes: int = 60


settings = Settings()
