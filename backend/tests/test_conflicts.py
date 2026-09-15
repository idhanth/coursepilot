from datetime import time

import pytest
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import Course, Section, SectionMeeting
from app.seed import seed
from app.services.schedule_service import meetings_conflict, sections_conflict, times_overlap

MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY = range(5)


def meeting(day: int, start: str, end: str) -> SectionMeeting:
    """An unsaved meeting, e.g. meeting(MONDAY, "10:00", "11:00")."""
    return SectionMeeting(day_of_week=day, start_time=time.fromisoformat(start), end_time=time.fromisoformat(end))


def section(*meetings: SectionMeeting) -> Section:
    """An unsaved section with the given meetings."""
    return Section(section_number="001", instructor="Staff", location="TBA", meetings=list(meetings))


def weekly(days: list[int], start: str, end: str) -> list[SectionMeeting]:
    """One meeting per day at the same time, e.g. weekly([MONDAY, WEDNESDAY, FRIDAY], "10:20", "11:10")."""
    return [meeting(day, start, end) for day in days]


MWF = [MONDAY, WEDNESDAY, FRIDAY]
TR = [TUESDAY, THURSDAY]


# --- times_overlap -------------------------------------------------------------------------------

TIME_CASES = [
    # (A start, A end, B start, B end, overlap?)
    pytest.param("10:00", "11:00", "10:30", "11:45", True, id="partial overlap"),
    pytest.param("09:00", "12:00", "10:00", "11:00", True, id="B fully inside A"),
    pytest.param("10:00", "11:00", "10:00", "11:00", True, id="identical times"),
    pytest.param("10:00", "11:00", "10:00", "10:30", True, id="same start, B ends first"),
    pytest.param("10:00", "11:01", "11:00", "12:00", True, id="overlap by one minute"),
    pytest.param("10:00", "11:00", "11:00", "12:00", False, id="touching at 11:00"),
    pytest.param("08:00", "08:50", "13:00", "14:15", False, id="completely separate"),
]


@pytest.mark.parametrize(("start_a", "end_a", "start_b", "end_b", "expected"), TIME_CASES)
def test_times_overlap(start_a, end_a, start_b, end_b, expected):
    a = (time.fromisoformat(start_a), time.fromisoformat(end_a))
    b = (time.fromisoformat(start_b), time.fromisoformat(end_b))

    assert times_overlap(*a, *b) is expected
    # The order of the two ranges must not matter.
    assert times_overlap(*b, *a) is expected


# --- meetings_conflict ---------------------------------------------------------------------------

MEETING_CASES = [
    pytest.param(meeting(MONDAY, "10:00", "11:00"), meeting(MONDAY, "10:30", "11:45"), True, id="same day, partial overlap"),
    pytest.param(meeting(MONDAY, "09:00", "12:00"), meeting(MONDAY, "10:00", "11:00"), True, id="same day, one inside the other"),
    pytest.param(meeting(MONDAY, "10:00", "11:00"), meeting(MONDAY, "10:00", "11:00"), True, id="same day, identical times"),
    pytest.param(meeting(MONDAY, "10:00", "11:00"), meeting(MONDAY, "11:00", "12:00"), False, id="same day, touching at 11:00"),
    pytest.param(meeting(MONDAY, "08:00", "08:50"), meeting(MONDAY, "13:00", "14:15"), False, id="same day, separate times"),
    pytest.param(meeting(MONDAY, "10:00", "11:00"), meeting(TUESDAY, "10:00", "11:00"), False, id="different days, same times"),
    pytest.param(meeting(MONDAY, "10:00", "11:00"), meeting(TUESDAY, "10:30", "11:45"), False, id="different days, overlapping times"),
]


@pytest.mark.parametrize(("meeting_a", "meeting_b", "expected"), MEETING_CASES)
def test_meetings_conflict(meeting_a, meeting_b, expected):
    assert meetings_conflict(meeting_a, meeting_b) is expected
    assert meetings_conflict(meeting_b, meeting_a) is expected


# --- sections_conflict ---------------------------------------------------------------------------

SECTION_CASES = [
    pytest.param(
        section(*weekly(MWF, "10:20", "11:10")),
        section(*weekly(MWF, "10:20", "11:10")),
        True,
        id="MWF vs MWF at the same time",
    ),
    pytest.param(
        section(*weekly(MWF, "10:20", "11:10")),
        section(*weekly(TR, "10:20", "11:10")),
        False,
        id="MWF vs TR at the same time (no shared day)",
    ),
    pytest.param(
        section(*weekly(MWF, "09:10", "10:00")),
        section(*weekly(MWF, "10:00", "10:50")),
        False,
        id="MWF sections touching at 10:00",
    ),
    pytest.param(
        # Lecture Monday/Wednesday plus a Friday lab; the other section meets only on Friday afternoon.
        section(meeting(MONDAY, "13:50", "14:40"), meeting(WEDNESDAY, "13:50", "14:40"), meeting(FRIDAY, "13:50", "15:45")),
        section(meeting(FRIDAY, "15:00", "16:00")),
        True,
        id="only the Friday lab conflicts",
    ),
    pytest.param(
        section(*weekly(MWF, "10:20", "11:10")),
        section(*weekly(TR, "11:10", "12:25"), meeting(WEDNESDAY, "11:30", "12:20")),
        False,
        id="several meetings each, none overlap",
    ),
    pytest.param(
        # A TR section against a section with MWF lectures and a Thursday lab.
        section(*weekly(TR, "14:20", "15:35")),
        section(*weekly(MWF, "10:20", "11:10"), meeting(THURSDAY, "14:20", "16:10")),
        True,
        id="TR section vs lecture-and-lab section, Thursday conflicts",
    ),
    pytest.param(
        section(*weekly(TR, "12:45", "14:00")),
        section(*weekly(MWF, "10:20", "11:10"), meeting(THURSDAY, "14:20", "16:10")),
        False,
        id="TR section vs lecture-and-lab section, no conflict",
    ),
    pytest.param(
        section(),
        section(*weekly(MWF, "10:20", "11:10")),
        False,
        id="section with no meetings",
    ),
]


@pytest.mark.parametrize(("section_a", "section_b", "expected"), SECTION_CASES)
def test_sections_conflict(section_a, section_b, expected):
    assert sections_conflict(section_a, section_b) is expected
    assert sections_conflict(section_b, section_a) is expected


# --- Using the seeded catalog --------------------------------------------------------------------


def seeded_section(db, course_code: str, section_number: str) -> Section:
    statement = (
        select(Section)
        .join(Course)
        .where(Course.course_code == course_code, Section.section_number == section_number)
        .options(selectinload(Section.meetings))
    )
    return db.scalars(statement).one()


@pytest.mark.parametrize(
    ("a", "b", "expected"),
    [
        pytest.param(("CSCI 1302", "001"), ("MATH 2250", "002"), True, id="CSCI 1302-001 vs MATH 2250-002: both MWF 10:20"),
        pytest.param(("PHYS 1211", "001"), ("CSCI 1302", "002"), True, id="PHYS 1211-001 Thursday lab vs CSCI 1302-002 TR"),
        pytest.param(("PHYS 1211", "002"), ("CSCI 1730", "003"), True, id="PHYS 1211-002 Wednesday lab vs CSCI 1730-003 MWF"),
        pytest.param(("MATH 2250", "001"), ("CSCI 1302", "001"), False, id="MATH 2250-001 MWF 9:10 vs CSCI 1302-001 MWF 10:20"),
        pytest.param(("CSCI 1302", "001"), ("STAT 2000", "002"), False, id="CSCI 1302-001 MWF vs STAT 2000-002 TR"),
    ],
)
def test_sections_conflict_with_seeded_sections(db, a, b, expected):
    seed(db)

    assert sections_conflict(seeded_section(db, *a), seeded_section(db, *b)) is expected


def test_lecture_and_lab_section_conflicts_on_one_meeting_only(db):
    seed(db)
    physics = seeded_section(db, "PHYS 1211", "001")  # MWF 10:20-11:10 and Thursday 14:20-16:10
    software = seeded_section(db, "CSCI 1302", "002")  # TR 14:20-15:35

    conflicting_pairs = [
        (a.day_of_week, b.day_of_week)
        for a in physics.meetings
        for b in software.meetings
        if meetings_conflict(a, b)
    ]

    assert len(physics.meetings) * len(software.meetings) == 8  # meeting pairs that are compared at most
    assert conflicting_pairs == [(THURSDAY, THURSDAY)]
