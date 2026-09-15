"""Saved schedules. Every function takes the logged-in user and only ever touches that user's rows."""

from sqlalchemy import Select, delete, select
from sqlalchemy.orm import Session, selectinload

from app.models import SavedSchedule, Section, User
from app.schemas.schedule import SaveScheduleRequest
from app.services.schedule_service import schedule_has_conflict


class SectionsNotFoundError(Exception):
    def __init__(self, missing_ids: list[int]):
        super().__init__(f"Section not found: {', '.join(str(section_id) for section_id in missing_ids)}.")


class InvalidScheduleError(Exception):
    pass


def with_sections(statement: Select) -> Select:
    """Also load each schedule's sections, with every section's course and meetings (a fixed number of queries)."""
    return statement.options(
        selectinload(SavedSchedule.sections).options(selectinload(Section.course), selectinload(Section.meetings))
    )


def list_saved_schedules(db: Session, user: User) -> list[SavedSchedule]:
    """The user's saved schedules, newest first."""
    statement = (
        select(SavedSchedule)
        .where(SavedSchedule.user_id == user.id)
        .order_by(SavedSchedule.created_at.desc(), SavedSchedule.id.desc())
    )
    return list(db.scalars(with_sections(statement)))


def get_saved_schedule(db: Session, user: User, schedule_id: int) -> SavedSchedule | None:
    """The schedule with this id if it belongs to the user.

    The query filters on the id AND the owner, so another user's schedule comes back as None,
    exactly like a schedule that doesn't exist. Nobody can tell which of the two it was.
    """
    statement = select(SavedSchedule).where(SavedSchedule.id == schedule_id, SavedSchedule.user_id == user.id)
    return db.scalar(with_sections(statement))


def create_saved_schedule(db: Session, user: User, data: SaveScheduleRequest) -> SavedSchedule:
    """Save the given sections for the user, exactly as they were generated."""
    sections = list(
        db.scalars(
            select(Section)
            .where(Section.id.in_(data.section_ids))
            .options(selectinload(Section.course), selectinload(Section.meetings))
        )
    )

    found_ids = {section.id for section in sections}
    missing_ids = [section_id for section_id in data.section_ids if section_id not in found_ids]
    if missing_ids:
        raise SectionsNotFoundError(missing_ids)

    # The same rules a generated schedule already follows, checked again because anyone can call the API.
    course_ids = [section.course_id for section in sections]
    if len(set(course_ids)) != len(course_ids):
        raise InvalidScheduleError("A schedule can include only one section of each course.")
    if schedule_has_conflict(sections):
        raise InvalidScheduleError("These sections have a time conflict, so they can't be saved together.")

    # Assigning the sections list makes SQLAlchemy insert one saved_schedule_sections row per section
    # (schedule_id, section_id) in the same transaction as the saved_schedules row.
    schedule = SavedSchedule(user_id=user.id, name=data.name, semester=data.semester, sections=sections)
    db.add(schedule)
    db.commit()
    db.refresh(schedule, ["created_at"])  # filled in by the database
    return schedule


def delete_saved_schedule(db: Session, user: User, schedule_id: int) -> bool:
    """Delete the schedule if it belongs to the user. Returns False if there was no such schedule for them.

    Its saved_schedule_sections rows are removed by ON DELETE CASCADE; the sections themselves stay.
    """
    result = db.execute(
        delete(SavedSchedule).where(SavedSchedule.id == schedule_id, SavedSchedule.user_id == user.id)
    )
    db.commit()
    return result.rowcount == 1
