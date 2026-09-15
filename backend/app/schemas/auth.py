from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, StringConstraints


def check_password_length(password: str) -> str:
    # bcrypt can only hash the first 72 bytes of a password, and the bcrypt library
    # raises an error for anything longer, so reject it here with a clear message.
    if len(password.encode()) > 72:
        raise ValueError("Password must be at most 72 bytes long.")
    return password


# Emails are stored in lowercase, so "Student@UGA.edu" and "student@uga.edu" are the same account.
Email = Annotated[EmailStr, AfterValidator(str.lower)]
Password = Annotated[str, Field(min_length=1), AfterValidator(check_password_length)]


class RegisterRequest(BaseModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
    email: Email
    password: Password


class LoginRequest(BaseModel):
    email: Email
    password: Password


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """What the API shows about a user. It has no password_hash field, so the hash can never be returned."""

    model_config = ConfigDict(from_attributes=True)  # lets FastAPI build this from a User model object

    id: int
    name: str
    email: str
    created_at: datetime
