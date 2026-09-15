from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.schedule import SavedSchedule


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # One user -> many saved schedules. Deleting a user deletes their schedules
    # (ON DELETE CASCADE in the database; passive_deletes lets the database do it).
    saved_schedules: Mapped[list["SavedSchedule"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
