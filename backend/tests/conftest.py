import os
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import get_db
from app.main import app

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "postgresql+psycopg://127.0.0.1:5435/coursepilot_test")


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
def client() -> Iterator[TestClient]:
    yield client_for(TEST_DATABASE_URL)
    app.dependency_overrides.clear()
