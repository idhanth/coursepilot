from datetime import datetime, time

import pytest
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Course, SavedSchedule, Section, SectionMeeting, User, saved_schedule_sections

MONDAY, WEDNESDAY, FRIDAY = 0, 2, 4


def make_user(db: Session, email: str = "student@example.edu") -> User:
    user = User(name="Test Student", email=email, password_hash="not-a-real-hash")
    db.add(user)
    db.commit()
    return user


def make_course(db: Session, code: str = "CSCI 1302", sections: int = 1) -> Course:
    course = Course(course_code=code, course_name="Software Development", department="Computer Science", credit_hours=4)
    for number in range(1, sections + 1):
        section = Section(section_number=f"{number:03}", instructor="Dr. Smith", location="Boyd 328")
        section.meetings = [
            SectionMeeting(day_of_week=day, start_time=time(10, 20), end_time=time(11, 10))
            for day in (MONDAY, WEDNESDAY, FRIDAY)
        ]
        course.sections.append(section)
    db.add(course)
    db.commit()
    return course


def make_saved_schedule(db: Session, user: User, sections: list[Section]) -> SavedSchedule:
    schedule = SavedSchedule(user=user, name="Fall 2027 - Friday Off", semester="Fall 2027", sections=sections)
    db.add(schedule)
    db.commit()
    return schedule


def count(db: Session, table) -> int:
    return db.scalar(select(func.count()).select_from(table))


# --- Relationships ---------------------------------------------------------------------------


def test_course_has_many_sections_and_section_has_many_meetings(db):
    course_id = make_course(db, sections=2).id
    db.expunge_all()  # forget the objects, so the next query really reads from PostgreSQL

    course = db.get(Course, course_id)

    assert [section.section_number for section in course.sections] == ["001", "002"]
    first = course.sections[0]
    assert first.course.course_code == "CSCI 1302"
    assert [meeting.day_of_week for meeting in first.meetings] == [MONDAY, WEDNESDAY, FRIDAY]
    assert first.meetings[0].start_time == time(10, 20)
    assert first.meetings[0].section is first


def test_user_has_many_saved_schedules(db):
    user = make_user(db)
    sections = make_course(db, sections=1).sections + make_course(db, code="MATH 2250", sections=1).sections
    make_saved_schedule(db, user, sections)
    make_saved_schedule(db, user, sections[:1])
    db.expunge_all()

    user = db.scalars(select(User)).one()

    assert len(user.saved_schedules) == 2
    assert all(schedule.user is user for schedule in user.saved_schedules)


def test_saved_schedule_has_many_sections_through_join_table(db):
    user = make_user(db)
    csci = make_course(db, code="CSCI 1302", sections=2)
    math = make_course(db, code="MATH 2250", sections=1)
    schedule_id = make_saved_schedule(db, user, [csci.sections[1], math.sections[0]]).id
    db.expunge_all()

    schedule = db.get(SavedSchedule, schedule_id)

    assert sorted(f"{s.course.course_code}-{s.section_number}" for s in schedule.sections) == [
        "CSCI 1302-002",
        "MATH 2250-001",
    ]
    assert count(db, saved_schedule_sections) == 2


def test_database_sets_created_at(db):
    user = make_user(db)
    schedule = make_saved_schedule(db, user, [])
    db.refresh(user)
    db.refresh(schedule)

    assert isinstance(user.created_at, datetime) and user.created_at.tzinfo is not None
    assert isinstance(schedule.created_at, datetime)


# --- Uniqueness and validity -----------------------------------------------------------------


def test_duplicate_user_email_is_rejected(db):
    make_user(db, email="student@example.edu")

    db.add(User(name="Someone Else", email="student@example.edu", password_hash="x"))
    with pytest.raises(IntegrityError, match="uq_users_email"):
        db.commit()


def test_duplicate_course_code_is_rejected(db):
    make_course(db, code="CSCI 1302")

    db.add(Course(course_code="CSCI 1302", course_name="Copy", department="Computer Science", credit_hours=4))
    with pytest.raises(IntegrityError, match="uq_courses_course_code"):
        db.commit()


def test_section_number_is_unique_within_a_course_only(db):
    csci = make_course(db, code="CSCI 1302", sections=1)
    make_course(db, code="MATH 2250", sections=1)  # MATH 2250-001 is allowed alongside CSCI 1302-001

    db.add(Section(course_id=csci.id, section_number="001", instructor="Dr. Lee", location="Boyd 208"))
    with pytest.raises(IntegrityError, match="uq_sections_course_id_section_number"):
        db.commit()


def test_section_must_belong_to_an_existing_course(db):
    db.add(Section(course_id=999, section_number="001", instructor="Dr. Lee", location="Boyd 208"))
    with pytest.raises(IntegrityError, match="fk_sections_course_id_courses"):
        db.commit()


def test_saved_schedule_must_belong_to_an_existing_user(db):
    db.add(SavedSchedule(user_id=999, name="Orphan", semester="Fall 2027"))
    with pytest.raises(IntegrityError, match="fk_saved_schedules_user_id_users"):
        db.commit()


def test_course_credit_hours_must_be_positive(db):
    db.add(Course(course_code="CSCI 0000", course_name="Nothing", department="Computer Science", credit_hours=0))
    with pytest.raises(IntegrityError, match="ck_courses_credit_hours_positive"):
        db.commit()


@pytest.mark.parametrize(
    ("day", "start", "end", "constraint"),
    [
        (MONDAY, time(11, 0), time(10, 0), "ck_section_meetings_end_after_start"),
        (MONDAY, time(10, 0), time(10, 0), "ck_section_meetings_end_after_start"),
        (7, time(10, 0), time(11, 0), "ck_section_meetings_day_of_week_valid"),
    ],
)
def test_invalid_meeting_times_are_rejected(db, day, start, end, constraint):
    section = make_course(db).sections[0]

    db.add(SectionMeeting(section_id=section.id, day_of_week=day, start_time=start, end_time=end))
    with pytest.raises(IntegrityError, match=constraint):
        db.commit()


def test_same_section_cannot_be_saved_twice_in_one_schedule(db):
    user = make_user(db)
    section = make_course(db).sections[0]
    schedule = make_saved_schedule(db, user, [section])

    with pytest.raises(IntegrityError, match="pk_saved_schedule_sections"):
        db.execute(saved_schedule_sections.insert().values(schedule_id=schedule.id, section_id=section.id))


# --- Deletes -----------------------------------------------------------------------------------
# These run DELETE statements directly, so they test the rules in the database schema
# (ON DELETE CASCADE / RESTRICT) rather than anything the Python code does.


def test_deleting_a_course_deletes_its_sections_and_meetings(db):
    course = make_course(db, code="CSCI 1302", sections=2)
    make_course(db, code="MATH 2250", sections=1)

    db.execute(delete(Course).where(Course.id == course.id))
    db.commit()

    assert count(db, Course) == 1
    assert count(db, Section) == 1  # only MATH 2250's section is left
    assert count(db, SectionMeeting) == 3  # and its 3 meetings


def test_deleting_a_section_deletes_its_meetings(db):
    course = make_course(db, sections=2)

    db.execute(delete(Section).where(Section.id == course.sections[0].id))
    db.commit()

    assert count(db, Section) == 1
    assert count(db, SectionMeeting) == 3


def test_deleting_a_user_deletes_their_saved_schedules_but_not_sections(db):
    student = make_user(db, email="student@example.edu")
    other = make_user(db, email="other@example.edu")
    section = make_course(db).sections[0]
    make_saved_schedule(db, student, [section])
    make_saved_schedule(db, other, [section])

    db.execute(delete(User).where(User.id == student.id))
    db.commit()

    assert count(db, SavedSchedule) == 1  # only the other user's schedule remains
    assert count(db, saved_schedule_sections) == 1
    assert count(db, Section) == 1


def test_deleting_a_saved_schedule_removes_its_links_but_keeps_sections(db):
    user = make_user(db)
    sections = make_course(db, sections=2).sections
    schedule = make_saved_schedule(db, user, sections)

    db.execute(delete(SavedSchedule).where(SavedSchedule.id == schedule.id))
    db.commit()

    assert count(db, saved_schedule_sections) == 0
    assert count(db, Section) == 2


def test_section_in_a_saved_schedule_cannot_be_deleted(db):
    user = make_user(db)
    course = make_course(db)
    make_saved_schedule(db, user, [course.sections[0]])

    with pytest.raises(IntegrityError, match="fk_saved_schedule_sections_section_id_sections"):
        db.execute(delete(Section).where(Section.id == course.sections[0].id))
    db.rollback()

    # Deleting the whole course would delete that section too, so it is blocked as well.
    with pytest.raises(IntegrityError, match="fk_saved_schedule_sections_section_id_sections"):
        db.execute(delete(Course).where(Course.id == course.id))
