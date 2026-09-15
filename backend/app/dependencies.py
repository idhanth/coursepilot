from typing import Annotated

from fastapi import Depends, HTTPException, Path, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.services.auth_service import read_access_token

# Ids in URLs are PostgreSQL INTEGER columns, which stop at 2,147,483,647. Checking the range here returns
# a 422 for an impossible id instead of letting the database query fail with a server error.
DatabaseId = Annotated[int, Path(ge=1, le=2_147_483_647)]

# Reads the "Authorization: Bearer <token>" header. With auto_error=False a missing header gives
# None instead of FastAPI's default error, so get_current_user decides the response itself.
bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Dependency for protected routes: turns the request's token into the logged-in User, or responds 401."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = read_access_token(credentials.credentials)
    # The user may have been deleted after the token was issued, so check they still exist.
    user = db.get(User, user_id) if user_id is not None else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
