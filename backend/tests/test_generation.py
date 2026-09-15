from datetime import time
from math import prod

from sqlalchemy import event, select

from app.models import Course, Section, SectionMeeting
from app.seed import seed
from app.services import schedule_service
from app.services.course_service import get_courses_with_sections
from app.services.schedule_service import generate_combinations, generate_valid_schedules, schedule_has_conflict

MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY = range(5)
MWF = [MONDAY, WEDNESDAY, FRIDAY]
TR = [TUESDAY, THURSDAY]


def section(label: str, days: list[int], start: str, end: str) -> Section:
    """An unsaved section whose section_number is a readable label such as "A1"."""
    meetings = [
        SectionMeeting(day_of_week=day, start_time=time.fromisoformat(start), end_time=time.fromisoformat(end))
        for day in days
    ]
    return Section(section_number=label, instructor="Staff", location="TBA", meetings=meetings)


def labels(schedules) -> list[tuple[str, ...]]:
    return [tuple(s.section_number for s in schedule) for schedule in schedules]


# Three made-up courses, 3 sections each. Exactly three pairs of sections conflict:
#   A1 + C1 (both MWF 9:00), A2 + B1 (both MWF 10:00), A3 + B2 (TR 9:00-10:15 and TR 9:30-10:45).
COURSE_A = [section("A1", MWF, "09:00", "09:50"), section("A2", MWF, "10:00", "10:50"), section("A3", TR, "09:00", "10:15")]
COURSE_B = [section("B1", MWF, "10:00", "10:50"), section("B2", TR, "09:30", "10:45"), section("B3", TR, "11:00", "12:15")]
COURSE_C = [section("C1", MWF, "09:00", "09:50"), section("C2", MWF, "13:00", "13:50"), section("C3", TR, "13:00", "14:15")]


# --- schedule_has_conflict -----------------------------------------------------------------------


def test_schedule_with_no_conflicts():
    schedule = [COURSE_A[0], COURSE_B[2], COURSE_C[1]]  # MWF 9:00, TR 11:00, MWF 13:00

    assert schedule_has_conflict(schedule) is False


def test_schedule_with_one_conflicting_pair():
    # A1 and C1 are both MWF 9:00. They are first and last, so they only meet if every pair is checked.
    schedule = [COURSE_A[0], COURSE_B[2], COURSE_C[2], COURSE_C[0]]

    assert schedule_has_conflict(schedule) is True


def test_schedule_with_zero_or_one_section_has_no_conflict():
    assert schedule_has_conflict([]) is False
    assert schedule_has_conflict([COURSE_A[0]]) is False


def test_schedule_has_conflict_checks_each_unique_pair_once(monkeypatch):
    checked = []
    real_sections_conflict = schedule_service.sections_conflict

    def recording_sections_conflict(section_a, section_b):
        checked.append((section_a.section_number, section_b.section_number))
        return real_sections_conflict(section_a, section_b)

    monkeypatch.setattr(schedule_service, "sections_conflict", recording_sections_conflict)
    schedule = [
        section("S1", MWF, "08:00", "08:50"),
        section("S2", MWF, "09:00", "09:50"),
        section("S3", TR, "08:00", "09:15"),
        section("S4", TR, "09:30", "10:45"),
    ]

    assert schedule_service.schedule_has_conflict(schedule) is False
    # 4 sections -> 4 x 3 / 2 = 6 pairs, never a section with itself and never the same pair twice.
    assert checked == [("S1", "S2"), ("S1", "S3"), ("S1", "S4"), ("S2", "S3"), ("S2", "S4"), ("S3", "S4")]


# --- generate_combinations -----------------------------------------------------------------------


def test_one_course_gives_one_combination_per_section():
    assert labels(generate_combinations([COURSE_A])) == [("A1",), ("A2",), ("A3",)]


def test_two_courses_give_every_pairing_in_order():
    combinations = generate_combinations([COURSE_A, COURSE_B])

    assert len(combinations) == 3 * 3
    assert labels(combinations) == [
        ("A1", "B1"), ("A1", "B2"), ("A1", "B3"),
        ("A2", "B1"), ("A2", "B2"), ("A2", "B3"),
        ("A3", "B1"), ("A3", "B2"), ("A3", "B3"),
    ]  # fmt: skip


def test_three_courses_give_27_combinations_with_one_section_per_course():
    combinations = generate_combinations([COURSE_A, COURSE_B, COURSE_C])

    assert len(combinations) == 3 * 3 * 3
    assert len(set(labels(combinations))) == 27  # all different
    for combination in combinations:
        assert [s.section_number[0] for s in combination] == ["A", "B", "C"]


def test_combination_count_is_the_product_of_section_counts():
    two_sections = COURSE_A[:2]
    one_section = COURSE_B[:1]

    assert len(generate_combinations([COURSE_A, two_sections, one_section, COURSE_C])) == 3 * 2 * 1 * 3


def test_no_courses_or_a_course_without_sections_gives_no_combinations():
    assert generate_combinations([]) == []
    assert generate_combinations([COURSE_A, []]) == []


# --- generate_valid_schedules --------------------------------------------------------------------


def test_all_combinations_valid():
    morning_mwf = [section("M1", MWF, "08:00", "08:50"), section("M2", MWF, "09:00", "09:50")]
    afternoon_tr = [section("T1", TR, "13:00", "14:15"), section("T2", TR, "14:30", "15:45")]

    assert labels(generate_valid_schedules([morning_mwf, afternoon_tr])) == [
        ("M1", "T1"), ("M1", "T2"), ("M2", "T1"), ("M2", "T2"),
    ]  # fmt: skip


def test_some_combinations_removed_for_two_courses():
    # Of the 9 pairings, A2 + B1 and A3 + B2 conflict.
    valid = generate_valid_schedules([COURSE_A, COURSE_B])

    assert len(valid) == 9 - 2
    assert ("A2", "B1") not in labels(valid)
    assert ("A3", "B2") not in labels(valid)


def test_some_combinations_removed_for_three_courses():
    valid = generate_valid_schedules([COURSE_A, COURSE_B, COURSE_C])

    # Each conflicting pair fixes two of the three courses, so it rules out 3 combinations (one per
    # section of the remaining course). The three pairs use different A sections, so none are counted twice.
    assert len(valid) == 27 - 3 * 3
    for schedule in labels(valid):
        assert not ({"A1", "C1"} <= set(schedule) or {"A2", "B1"} <= set(schedule) or {"A3", "B2"} <= set(schedule))


def test_all_combinations_removed():
    lecture = [section("L1", MWF, "10:00", "10:50")]
    overlapping = [section("O1", MWF, "10:00", "10:50"), section("O2", MWF, "10:30", "11:20")]

    assert generate_valid_schedules([lecture, overlapping]) == []


# --- With the database ---------------------------------------------------------------------------


def test_generation_needs_no_database_queries_after_loading(db, engine):
    seed(db)
    db.expunge_all()  # start from an empty session so loading really goes to PostgreSQL
    course_ids = list(
        db.scalars(select(Course.id).where(Course.course_code.in_(["CSCI 1302", "MATH 2250", "STAT 2000", "ENGL 1102"])))
    )

    statements = []

    def record(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", record)
    try:
        courses = get_courses_with_sections(db, course_ids)
        loading_queries = len(statements)

        course_sections = [course.sections for course in courses]
        valid = generate_valid_schedules(course_sections)
        credits = [sum(section.course.credit_hours for section in schedule) for schedule in valid]
    finally:
        event.remove(engine, "before_cursor_execute", record)

    assert loading_queries == 3  # courses, sections, meetings
    assert len(statements) == 3  # nothing more while generating 81 combinations
    assert len(generate_combinations(course_sections)) == prod(len(s) for s in course_sections) == 81
    assert 0 < len(valid) < 81
    assert set(credits) == {14}  # 4 + 4 + 3 + 3
