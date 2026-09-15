from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.models import User
from app.schemas.auth import RegisterRequest

JWT_ALGORITHM = "HS256"


class EmailAlreadyRegisteredError(Exception):
    pass


# --- Passwords -------------------------------------------------------------------------------


def hash_password(password: str) -> str:
    # gensalt() makes a new random salt for every password and bcrypt stores it inside the hash,
    # so two users with the same password still get different hashes.
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    # Hashes the attempt again using the salt saved in password_hash, then compares the two hashes.
    return bcrypt.checkpw(password.encode(), password_hash.encode())


# --- Tokens ----------------------------------------------------------------------------------


def create_access_token(user_id: int) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),  # subject: the user this token belongs to (JWT requires a string)
        "iat": now,  # issued at
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),  # expires at
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def read_access_token(token: str) -> int | None:
    """Return the user id from a valid token, or None if it is malformed, altered, expired or signed with another key."""
    try:
        # Listing the allowed algorithm stops a token from choosing a weaker one (such as "none").
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[JWT_ALGORITHM], options={"require": ["sub", "exp"]}
        )
        return int(payload["sub"])
    except (jwt.InvalidTokenError, ValueError):
        return None


# --- Users -----------------------------------------------------------------------------------


def register_user(db: Session, data: RegisterRequest) -> User:
    if db.scalar(select(User).where(User.email == data.email)) is not None:
        raise EmailAlreadyRegisteredError

    user = User(name=data.name, email=data.email, password_hash=hash_password(data.password))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        # Two sign-ups with the same email at the same moment: the unique constraint rejects the second.
        db.rollback()
        raise EmailAlreadyRegisteredError from None
    db.refresh(user)  # load created_at, which the database filled in
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    """Return the user if the email exists and the password matches, otherwise None."""
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(password, user.password_hash):
        return None
    return user
