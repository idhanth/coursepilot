from app.main import app
from tests.conftest import client_for


def test_health_reports_connected_database(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "connected"}


def test_health_reports_unavailable_database():
    # Port 1 has nothing listening, so the connection is refused immediately.
    client = client_for("postgresql+psycopg://127.0.0.1:1/coursepilot")
    try:
        response = client.get("/api/health")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 503
    assert response.json() == {"status": "error", "database": "unavailable"}


def test_cors_allows_frontend_origin(client):
    response = client.options(
        "/api/health",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
    )

    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_cors_preflight_allows_authenticated_requests_only_from_the_frontend(client):
    # A deployed frontend on another domain sends this preflight before DELETE /api/schedules/saved/{id}.
    preflight = {"Access-Control-Request-Method": "DELETE", "Access-Control-Request-Headers": "authorization,content-type"}

    allowed = client.options("/api/schedules/saved/1", headers={"Origin": "http://localhost:5173", **preflight})
    other = client.options("/api/schedules/saved/1", headers={"Origin": "https://example.com", **preflight})

    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "authorization" in allowed.headers["access-control-allow-headers"].lower()
    assert "DELETE" in allowed.headers["access-control-allow-methods"]
    assert "access-control-allow-origin" not in other.headers
