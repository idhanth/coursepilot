from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.section import Section


class Course(Base):
    __tablename__ = "courses"
    __table_args__ = (CheckConstraint("credit_hours > 0", name="credit_hours_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    course_code: Mapped[str] = mapped_column(String(20), unique=True)  # e.g. "CSCI 1302"
    course_name: Mapped[str] = mapped_column(String(150))
    department: Mapped[str] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    credit_hours: Mapped[int]

    # One course -> many sections. Deleting a course deletes its sections.
    sections: Mapped[list["Section"]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Section.section_number",
    )
