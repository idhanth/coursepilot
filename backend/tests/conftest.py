import os

# Settings are read when the app is first imported, so test values must be set before the imports below.
os.environ.setdefault("JWT_SECRET", "test-only-secret-that-is-at-least-32-characters")

from collections.abc import Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.database import get_db
from app.main import app

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "postgresql+psycopg://127.0.0.1:5435/coursepilot_test")
BACKEND_DIR = Path(__file__).resolve().parents[1]


def alembic_config() -> Config:
    """Alembic settings from backend/alembic.ini, pointed at the test database."""
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    return config


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    # Rebuild the test database from the migrations once per test run,
    # so the tests always check the schema that the migrations actually create.
    config = alembic_config()
    command.downgrade(config, "base")
    command.upgrade(config, "head")

    engine = create_engine(TEST_DATABASE_URL)
    yield engine
    engine.dispose()


@pytest.fixture
def db(engine: Engine) -> Iterator[Session]:
    """A session on an empty database. TRUNCATE ... CASCADE also empties every table that references these two."""
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE users, courses RESTART IDENTITY CASCADE"))
    with Session(engine, expire_on_commit=False) as session:
        yield session


def client_for(database_url: str) -> TestClient:
    """A test client whose requests use the given database instead of the app's default."""
    engine = create_engine(database_url, connect_args={"connect_timeout": 2})
    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app)


@pytest.fixture
def client(db: Session) -> Iterator[TestClient]:
    """A test client on the test database, emptied before each test (via the db fixture)."""
    yield client_for(TEST_DATABASE_URL)
    app.dependency_overrides.clear()
