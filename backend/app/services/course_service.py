from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Course, Section


def list_courses(db: Session) -> list[Course]:
    return list(db.scalars(select(Course).order_by(Course.course_code)))


def search_courses(db: Session, query: str) -> list[Course]:
    """Courses whose code, name or department contains the query, ignoring upper/lower case."""
    # In a LIKE pattern, % and _ are wildcards. Escaping them makes a search for "%"
    # look for a real percent sign instead of matching every course.
    escaped = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    pattern = f"%{escaped}%"

    # ILIKE is PostgreSQL's case-insensitive LIKE: "csci" matches "CSCI 1302".
    statement = (
        select(Course)
        .where(
            or_(
                Course.course_code.ilike(pattern, escape="\\"),
                Course.course_name.ilike(pattern, escape="\\"),
                Course.department.ilike(pattern, escape="\\"),
            )
        )
        .order_by(Course.course_code)
    )
    return list(db.scalars(statement))


def get_course(db: Session, course_id: int) -> Course | None:
    return db.get(Course, course_id)


def list_sections(db: Session, course_id: int) -> list[Section]:
    # selectinload loads the meetings for all of these sections in one extra query,
    # instead of one query per section while the response is being built.
    statement = (
        select(Section)
        .where(Section.course_id == course_id)
        .options(selectinload(Section.meetings))
        .order_by(Section.section_number)
    )
    return list(db.scalars(statement))


def get_section(db: Session, section_id: int) -> Section | None:
    statement = select(Section).where(Section.id == section_id).options(selectinload(Section.meetings))
    return db.scalar(statement)
