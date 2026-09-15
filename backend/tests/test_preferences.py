from datetime import time

import pytest

from app.models import Section, SectionMeeting
from app.schemas.schedule import DAY_NUMBERS, SchedulePreferences
from app.services.schedule_service import (
    apply_preferences,
    has_preferred_day_off,
    meets_earliest_start,
    meets_latest_end,
    meets_max_classes_per_day,
    schedule_matches_preferences,
)

MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY = range(7)


def meeting(day: int, start: str, end: str) -> SectionMeeting:
    return SectionMeeting(day_of_week=day, start_time=time.fromisoformat(start), end_time=time.fromisoformat(end))


def section(label: str, *meetings: SectionMeeting) -> Section:
    return Section(section_number=label, instructor="Staff", location="TBA", meetings=list(meetings))


def at(value: str | None) -> time | None:
    return time.fromisoformat(value) if value is not None else None


# One schedule used by most tests. Earliest class 9:00 (A), latest end 14:50 (C's Friday lab).
# Classes per day: Monday 2 (A, C), Tuesday 1 (B), Wednesday 2 (A, C), Thursday 1 (B), Friday 2 (A, C lab).
A = section("A", meeting(MONDAY, "09:00", "09:50"), meeting(WEDNESDAY, "09:00", "09:50"), meeting(FRIDAY, "09:00", "09:50"))
B = section("B", meeting(TUESDAY, "11:00", "12:15"), meeting(THURSDAY, "11:00", "12:15"))
C = section("C", meeting(MONDAY, "13:00", "13:50"), meeting(WEDNESDAY, "13:00", "13:50"), meeting(FRIDAY, "13:00", "14:50"))
SCHEDULE = (A, B, C)

# A schedule with no Friday classes.
FRIDAY_FREE = (
    section("D", meeting(MONDAY, "10:00", "10:50"), meeting(WEDNESDAY, "10:00", "10:50")),
    section("E", meeting(TUESDAY, "09:30", "10:45"), meeting(THURSDAY, "09:30", "10:45")),
)


def test_day_numbers_match_day_of_week_column():
    assert DAY_NUMBERS == {
        "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6,
    }  # fmt: skip


# --- The four filters ----------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("earliest_start", "expected"),
    [
        pytest.param(None, True, id="not given"),
        pytest.param("08:30", True, id="first class is later"),
        pytest.param("09:00", True, id="first class starts exactly then"),
        pytest.param("09:01", False, id="first class starts a minute too early"),
        pytest.param("12:00", False, id="several classes start too early"),
    ],
)
def test_meets_earliest_start(earliest_start, expected):
    assert meets_earliest_start(SCHEDULE, at(earliest_start)) is expected


@pytest.mark.parametrize(
    ("latest_end", "expected"),
    [
        pytest.param(None, True, id="not given"),
        pytest.param("15:00", True, id="last class ends earlier"),
        pytest.param("14:50", True, id="last class ends exactly then"),
        pytest.param("14:49", False, id="Friday lab ends a minute too late"),
        pytest.param("12:00", False, id="several classes end too late"),
    ],
)
def test_meets_latest_end(latest_end, expected):
    assert meets_latest_end(SCHEDULE, at(latest_end)) is expected


@pytest.mark.parametrize(
    ("day_off", "expected"),
    [
        pytest.param(None, True, id="not given"),
        pytest.param(SATURDAY, True, id="no Saturday classes"),
        pytest.param(TUESDAY, False, id="B meets Tuesday"),
        pytest.param(FRIDAY, False, id="A and C's lab meet Friday"),
    ],
)
def test_has_preferred_day_off(day_off, expected):
    assert has_preferred_day_off(SCHEDULE, day_off) is expected


def test_friday_free_schedule_has_friday_off():
    assert has_preferred_day_off(FRIDAY_FREE, FRIDAY) is True


@pytest.mark.parametrize(
    ("max_classes", "expected"),
    [
        pytest.param(None, True, id="not given"),
        pytest.param(3, True, id="busiest days have 2"),
        pytest.param(2, True, id="exactly the busiest day's count"),
        pytest.param(1, False, id="Monday, Wednesday and Friday have 2"),
    ],
)
def test_meets_max_classes_per_day(max_classes, expected):
    assert meets_max_classes_per_day(SCHEDULE, max_classes) is expected


def test_max_classes_counts_every_section_of_the_schedule_together():
    # Each section alone has only 1 class per day; the limit is broken only when they are combined.
    assert all(meets_max_classes_per_day((s,), 1) for s in SCHEDULE)
    assert meets_max_classes_per_day(SCHEDULE, 1) is False


def test_section_meeting_twice_on_one_day_counts_as_two_classes():
    lecture_and_lab = section("L", meeting(MONDAY, "10:00", "10:50"), meeting(MONDAY, "14:00", "15:50"))

    assert meets_max_classes_per_day((lecture_and_lab,), 2) is True
    assert meets_max_classes_per_day((lecture_and_lab,), 1) is False


# --- All preferences together --------------------------------------------------------------------


def test_omitted_preferences_pass_every_schedule():
    assert schedule_matches_preferences(SCHEDULE, None) is True
    assert schedule_matches_preferences(SCHEDULE, SchedulePreferences()) is True


def test_multiple_filters_all_satisfied():
    preferences = SchedulePreferences(
        earliest_start="09:00", latest_end="15:00", preferred_day_off="Saturday", max_classes_per_day=2
    )

    assert schedule_matches_preferences(SCHEDULE, preferences) is True


@pytest.mark.parametrize(
    "broken",
    [
        pytest.param({"earliest_start": "09:30"}, id="earliest start"),
        pytest.param({"latest_end": "14:00"}, id="latest end"),
        pytest.param({"preferred_day_off": "Friday"}, id="day off"),
        pytest.param({"max_classes_per_day": 1}, id="max classes per day"),
    ],
)
def test_multiple_filters_fail_if_any_one_fails(broken):
    passing = {"earliest_start": "09:00", "latest_end": "15:00", "preferred_day_off": "Saturday", "max_classes_per_day": 2}

    preferences = SchedulePreferences(**(passing | broken))

    assert schedule_matches_preferences(SCHEDULE, preferences) is False


def test_apply_preferences_without_preferences_keeps_every_schedule_in_order():
    schedules = [SCHEDULE, FRIDAY_FREE]

    assert apply_preferences(schedules, None) == schedules
    assert apply_preferences(schedules, SchedulePreferences()) == schedules


def test_apply_preferences_keeps_only_matching_schedules():
    assert apply_preferences([SCHEDULE, FRIDAY_FREE], SchedulePreferences(preferred_day_off="Friday")) == [FRIDAY_FREE]


def test_apply_preferences_can_filter_out_every_schedule():
    preferences = SchedulePreferences(earliest_start="11:00")  # both schedules have a class before 11:00

    assert apply_preferences([SCHEDULE, FRIDAY_FREE], preferences) == []
