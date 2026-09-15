from datetime import time

from sqlalchemy import func, select

from app.models import Course, Section, SectionMeeting
from app.seed import COURSES, build_course, seed


def count(db, model) -> int:
    return db.scalar(select(func.count()).select_from(model))


def test_seed_data_has_unique_course_codes():
    codes = [course["course_code"] for course in COURSES]

    assert len(codes) == len(set(codes))


def test_seed_loads_every_course_section_and_meeting(db):
    expected_sections = sum(len(course["sections"]) for course in COURSES)
    expected_meetings = sum(
        len(days)
        for course in COURSES
        for *_, meetings in course["sections"]
        for days, _start, _end in meetings
    )

    assert seed(db) == len(COURSES)

    assert count(db, Course) == len(COURSES)
    assert count(db, Section) == expected_sections
    assert count(db, SectionMeeting) == expected_meetings


def test_seed_stores_one_row_per_meeting_day(db):
    seed(db)

    lab_section = db.scalars(
        select(Section).join(Course).where(Course.course_code == "CSCI 1302", Section.section_number == "003")
    ).one()

    # "MW 13:50-14:40" plus "F 13:50-15:45" becomes three rows.
    assert [(m.day_of_week, m.start_time, m.end_time) for m in lab_section.meetings] == [
        (0, time(13, 50), time(14, 40)),
        (2, time(13, 50), time(14, 40)),
        (4, time(13, 50), time(15, 45)),
    ]


def test_seed_adds_only_missing_courses(db):
    db.add(build_course(COURSES[0]))
    db.commit()

    assert seed(db) == len(COURSES) - 1

    assert count(db, Course) == len(COURSES)


def test_seed_does_nothing_when_every_course_exists(db):
    seed(db)
    meetings_before = count(db, SectionMeeting)

    assert seed(db) == 0

    assert count(db, Course) == len(COURSES)
    assert count(db, SectionMeeting) == meetings_before
