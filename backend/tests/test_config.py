import pytest

from app.config import Settings

SECRET = "test-only-secret-that-is-at-least-32-characters"


@pytest.mark.parametrize(
    ("given", "expected"),
    [
        # What hosting providers hand out (Neon adds ?sslmode=require), turned into the psycopg 3 form.
        (
            "postgresql://user:pw@ep-example.neon.tech/coursepilot?sslmode=require",
            "postgresql+psycopg://user:pw@ep-example.neon.tech/coursepilot?sslmode=require",
        ),
        ("postgres://user:pw@db.example.com:5432/coursepilot", "postgresql+psycopg://user:pw@db.example.com:5432/coursepilot"),
        # Already explicit, as in local development: left unchanged.
        ("postgresql+psycopg://127.0.0.1:5435/coursepilot", "postgresql+psycopg://127.0.0.1:5435/coursepilot"),
    ],
)
def test_database_url_uses_the_installed_psycopg_driver(given, expected):
    settings = Settings(database_url=given, jwt_secret=SECRET)

    assert settings.database_url == expected


@pytest.mark.parametrize("given", ["https://coursepilot.vercel.app/", "https://coursepilot.vercel.app"])
def test_frontend_url_matches_the_origin_browsers_send(given):
    settings = Settings(frontend_url=given, jwt_secret=SECRET)

    assert settings.frontend_url == "https://coursepilot.vercel.app"
