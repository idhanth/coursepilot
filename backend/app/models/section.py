from datetime import time
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, SmallInteger, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.course import Course


class Section(Base):
    __tablename__ = "sections"
    # A course can't have two sections with the same number, but CSCI 1302-001 and MATH 2250-001 are fine.
    # This constraint's index also covers lookups by course_id.
    __table_args__ = (UniqueConstraint("course_id", "section_number"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    section_number: Mapped[str] = mapped_column(String(10))  # a string, so "001" keeps its zeros
    instructor: Mapped[str] = mapped_column(String(100))
    location: Mapped[str] = mapped_column(String(100))

    course: Mapped["Course"] = relationship(back_populates="sections")
    # One section -> many meeting times. Deleting a section deletes its meetings.
    meetings: Mapped[list["SectionMeeting"]] = relationship(
        back_populates="section",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="(SectionMeeting.day_of_week, SectionMeeting.start_time)",
    )


class SectionMeeting(Base):
    """One weekly class meeting. A MWF section has three rows instead of a "MWF" string."""

    __tablename__ = "section_meetings"
    __table_args__ = (
        CheckConstraint("day_of_week BETWEEN 0 AND 6", name="day_of_week_valid"),
        CheckConstraint("end_time > start_time", name="end_after_start"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    section_id: Mapped[int] = mapped_column(ForeignKey("sections.id", ondelete="CASCADE"), index=True)
    # 0 = Monday ... 6 = Sunday, the same numbering as Python's date.weekday().
    day_of_week: Mapped[int] = mapped_column(SmallInteger)
    start_time: Mapped[time]
    end_time: Mapped[time]

    section: Mapped["Section"] = relationship(back_populates="meetings")
