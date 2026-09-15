from pathlib import Path

from pydantic import Field, field_validator
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

    @field_validator("frontend_url")
    @classmethod
    def drop_trailing_slash(cls, url: str) -> str:
        # Browsers send the Origin header without a trailing slash, and CORS compares it exactly, so
        # "https://coursepilot.vercel.app/" would otherwise block every request from the frontend.
        return url.rstrip("/")

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, url: str) -> str:
        # Hosting providers hand out URLs starting with postgresql:// or postgres://. SQLAlchemy reads those
        # as "use the psycopg2 driver", but this project installs psycopg 3, so name that driver explicitly.
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url.removeprefix(prefix)
        return url


settings = Settings()
