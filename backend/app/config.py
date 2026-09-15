from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Values come from environment variables or backend/.env (see .env.example)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://127.0.0.1:5435/coursepilot"
    frontend_url: str = "http://localhost:5173"


settings = Settings()
