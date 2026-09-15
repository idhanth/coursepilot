from datetime import UTC, datetime, timedelta

import jwt
import pytest
from sqlalchemy import delete, func, select

from app.config import settings
from app.models import User
from app.services.auth_service import JWT_ALGORITHM, hash_password, verify_password

NAME = "Test Student"
EMAIL = "student@uga.edu"
PASSWORD = "correct-horse-battery"
USER_FIELDS = {"id", "name", "email", "created_at"}


def register(client, name=NAME, email=EMAIL, password=PASSWORD):
    return client.post("/api/auth/register", json={"name": name, "email": email, "password": password})


def login(client, email=EMAIL, password=PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def get_me(client, token):
    return client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})


# --- Password hashing ----------------------------------------------------------------------------


def test_hash_password_is_salted_and_verifiable():
    first = hash_password(PASSWORD)
    second = hash_password(PASSWORD)

    assert first != PASSWORD
    assert first != second  # different random salt each time
    assert verify_password(PASSWORD, first) and verify_password(PASSWORD, second)
    assert not verify_password("wrong-password", first)


# --- Registration --------------------------------------------------------------------------------


def test_register_creates_user_and_stores_only_a_hash(client, db):
    response = register(client)

    assert response.status_code == 201
    body = response.json()
    assert set(body) == USER_FIELDS  # no password or password_hash in the response
    assert body["name"] == NAME and body["email"] == EMAIL

    user = db.scalars(select(User)).one()
    assert user.password_hash != PASSWORD
    assert user.password_hash.startswith("$2b$")  # bcrypt format
    assert verify_password(PASSWORD, user.password_hash)


def test_register_trims_name_and_lowercases_email(client):
    response = register(client, name="  Test Student  ", email="Student@UGA.edu")

    assert response.status_code == 201
    assert response.json()["name"] == "Test Student"
    assert response.json()["email"] == "student@uga.edu"


def test_duplicate_registration_is_rejected(client, db):
    assert register(client).status_code == 201

    response = register(client, name="Someone Else", email="STUDENT@uga.edu")

    assert response.status_code == 409
    assert response.json() == {"detail": "An account with this email already exists."}
    assert db.scalar(select(func.count()).select_from(User)) == 1


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("name", ""),
        ("name", "   "),
        ("name", None),  # field left out
        ("email", "not-an-email"),
        ("email", None),
        ("password", ""),
        ("password", None),
        ("password", "x" * 73),  # longer than bcrypt's 72-byte limit
        ("name", "Al\x00ice"),  # regression: PostgreSQL can't store \x00, which used to cause a 500
    ],
)
def test_register_validates_input(client, field, value):
    payload = {"name": NAME, "email": EMAIL, "password": PASSWORD}
    if value is None:
        del payload[field]
    else:
        payload[field] = value

    response = client.post("/api/auth/register", json=payload)

    assert response.status_code == 422
    assert [error["loc"] for error in response.json()["detail"]] == [["body", field]]


# --- Login ---------------------------------------------------------------------------------------


def test_login_returns_a_signed_jwt(client):
    user_id = register(client).json()["id"]

    response = login(client)

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"access_token", "token_type"}
    assert body["token_type"] == "bearer"

    payload = jwt.decode(body["access_token"], settings.jwt_secret, algorithms=[JWT_ALGORITHM])
    assert set(payload) == {"sub", "iat", "exp"}  # only the user id and timestamps, no personal data
    assert payload["sub"] == str(user_id)
    assert payload["exp"] - payload["iat"] == settings.access_token_expire_minutes * 60


def test_login_email_is_case_insensitive(client):
    register(client)

    assert login(client, email="Student@UGA.EDU").status_code == 200


def test_login_with_wrong_password(client):
    register(client)

    response = login(client, password="wrong-password")

    assert response.status_code == 401
    assert response.json() == {"detail": "Incorrect email or password."}


def test_login_with_nonexistent_email(client):
    register(client)

    response = login(client, email="nobody@uga.edu")

    # Exactly the same response as a wrong password.
    assert response.status_code == 401
    assert response.json() == {"detail": "Incorrect email or password."}


# --- GET /api/auth/me ----------------------------------------------------------------------------


def test_me_returns_the_logged_in_user(client):
    user_id = register(client).json()["id"]
    token = login(client).json()["access_token"]

    response = get_me(client, token)

    assert response.status_code == 200
    body = response.json()
    assert set(body) == USER_FIELDS
    assert body["id"] == user_id and body["email"] == EMAIL


def test_me_without_a_token(client):
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated."}
    assert response.headers["www-authenticate"] == "Bearer"


def test_me_with_a_non_bearer_authorization_header(client):
    response = client.get("/api/auth/me", headers={"Authorization": "Basic c3R1ZGVudDpwYXNzd29yZA=="})

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated."}


def expires_in(minutes: int) -> datetime:
    return datetime.now(UTC) + timedelta(minutes=minutes)


# Each case builds a token for the registered user that the API must refuse.
INVALID_TOKENS = {
    "malformed": lambda user_id: "not-a-jwt",
    "wrong_secret": lambda user_id: jwt.encode(
        {"sub": str(user_id), "exp": expires_in(5)}, "a-different-secret-that-is-32-characters", algorithm="HS256"
    ),
    "expired": lambda user_id: jwt.encode(
        {"sub": str(user_id), "exp": expires_in(-1)}, settings.jwt_secret, algorithm="HS256"
    ),
    "unsigned_alg_none": lambda user_id: jwt.encode(
        {"sub": str(user_id), "exp": expires_in(5)}, None, algorithm="none"
    ),
    "missing_expiry": lambda user_id: jwt.encode({"sub": str(user_id)}, settings.jwt_secret, algorithm="HS256"),
    "non_numeric_subject": lambda user_id: jwt.encode(
        {"sub": "abc", "exp": expires_in(5)}, settings.jwt_secret, algorithm="HS256"
    ),
    # Regression: a correctly signed token whose id is too big for PostgreSQL's INTEGER used to cause a 500.
    "subject_beyond_database_id_range": lambda user_id: jwt.encode(
        {"sub": "99999999999", "exp": expires_in(5)}, settings.jwt_secret, algorithm="HS256"
    ),
    "tampered_payload": lambda user_id: tamper(
        jwt.encode({"sub": str(user_id), "exp": expires_in(5)}, settings.jwt_secret, algorithm="HS256")
    ),
}


def tamper(token: str) -> str:
    """Keep a valid token's header and signature but swap in a payload claiming to be user 999."""
    header, _payload, signature = token.split(".")
    forged_payload = jwt.encode({"sub": "999", "exp": expires_in(5)}, "x" * 32, algorithm="HS256").split(".")[1]
    return f"{header}.{forged_payload}.{signature}"


@pytest.mark.parametrize("case", INVALID_TOKENS)
def test_me_rejects_invalid_tokens(client, case):
    user_id = register(client).json()["id"]
    token = INVALID_TOKENS[case](user_id)

    response = get_me(client, token)

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid or expired token."}


def test_me_rejects_token_of_deleted_user(client, db):
    register(client)
    token = login(client).json()["access_token"]
    db.execute(delete(User))
    db.commit()

    response = get_me(client, token)

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid or expired token."}
