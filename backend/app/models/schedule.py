from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, DateTime, ForeignKey, String, Table, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.section import Section
    from app.models.user import User

# Join table for the many-to-many relationship: a saved schedule has many sections,
# and a section can appear in many saved schedules. The composite primary key stops
# the same section from being added to one schedule twice.
saved_schedule_sections = Table(
    "saved_schedule_sections",
    Base.metadata,
    # Deleting a saved schedule removes its rows here.
    Column("schedule_id", ForeignKey("saved_schedules.id", ondelete="CASCADE"), primary_key=True),
    # A section that someone has saved can't be deleted, so saved schedules never silently lose a class.
    Column("section_id", ForeignKey("sections.id", ondelete="RESTRICT"), primary_key=True, index=True),
)


class SavedSchedule(Base):
    __tablename__ = "saved_schedules"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))  # e.g. "Fall 2027 - Friday Off"
    semester: Mapped[str] = mapped_column(String(20))  # e.g. "Fall 2027"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="saved_schedules")
    sections: Mapped[list["Section"]] = relationship(secondary=saved_schedule_sections, passive_deletes=True)
