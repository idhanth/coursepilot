"""Scheduling logic: conflicts between meetings and sections, schedule generation, and preference filters.

These functions only compare values; they never query the database. They work on
SectionMeeting and Section objects, whether loaded from PostgreSQL or created in a test.
"""

from collections import Counter
from collections.abc import Sequence
from datetime import time
from itertools import product

from app.models import Section, SectionMeeting
from app.schemas.schedule import DAY_NUMBERS, SchedulePreferences


def times_overlap(start_a: time, end_a: time, start_b: time, end_b: time) -> bool:
    """True if the time ranges [start_a, end_a) and [start_b, end_b) share any moment.

    A starts before B ends, and B starts before A ends. The comparisons are strict (<),
    so a class ending at 11:00 and another starting at 11:00 only touch, and don't overlap.
    """
    return start_a < end_b and start_b < end_a


def meetings_conflict(meeting_a: SectionMeeting, meeting_b: SectionMeeting) -> bool:
    """True if two weekly meetings are on the same day and their times overlap."""
    if meeting_a.day_of_week != meeting_b.day_of_week:
        return False
    return times_overlap(meeting_a.start_time, meeting_a.end_time, meeting_b.start_time, meeting_b.end_time)


def sections_conflict(section_a: Section, section_b: Section) -> bool:
    """True if any meeting of section_a conflicts with any meeting of section_b.

    Every meeting of A is compared with every meeting of B, so this takes at most
    len(A's meetings) x len(B's meetings) comparisons (3 x 2 = 6 for a MWF and a TR section),
    and stops as soon as one conflict is found.
    """
    for meeting_a in section_a.meetings:
        for meeting_b in section_b.meetings:
            if meetings_conflict(meeting_a, meeting_b):
                return True
    return False


def schedule_has_conflict(sections: Sequence[Section]) -> bool:
    """True if any two sections in one candidate schedule conflict.

    Each unique pair is checked once: j always starts after i, so (A, B) is checked but (B, A)
    and (A, A) are not. For n sections that is n x (n - 1) / 2 pairs, e.g. 4 x 3 / 2 = 6.
    """
    for i in range(len(sections)):
        for j in range(i + 1, len(sections)):
            if sections_conflict(sections[i], sections[j]):
                return True
    return False


def generate_combinations(course_sections: Sequence[Sequence[Section]]) -> list[tuple[Section, ...]]:
    """Every way to pick exactly one section from each course (the Cartesian product).

    course_sections has one list of sections per selected course. With 3 courses of 3 sections
    each there are 3 x 3 x 3 = 27 combinations, and each one is a tuple of 3 sections in course order.
    """
    # product() of zero lists yields a single empty tuple, which is not a real schedule.
    if not course_sections:
        return []
    return list(product(*course_sections))


def generate_valid_schedules(course_sections: Sequence[Sequence[Section]]) -> list[tuple[Section, ...]]:
    """The combinations in which no two sections conflict."""
    return [
        combination
        for combination in generate_combinations(course_sections)
        if not schedule_has_conflict(combination)
    ]


# --- Preference filters --------------------------------------------------------------------------
# Each filter is strict: a schedule passes or it doesn't, and nothing is ranked.
# A preference set to None was not given, so its filter lets every schedule through.


def schedule_meetings(schedule: Sequence[Section]) -> list[SectionMeeting]:
    """Every weekly meeting of every section in a schedule."""
    return [meeting for section in schedule for meeting in section.meetings]


def meets_earliest_start(schedule: Sequence[Section], earliest_start: time | None) -> bool:
    """True if no meeting starts before earliest_start. A class starting exactly at that time passes."""
    if earliest_start is None:
        return True
    return all(meeting.start_time >= earliest_start for meeting in schedule_meetings(schedule))


def meets_latest_end(schedule: Sequence[Section], latest_end: time | None) -> bool:
    """True if no meeting ends after latest_end. A class ending exactly at that time passes."""
    if latest_end is None:
        return True
    return all(meeting.end_time <= latest_end for meeting in schedule_meetings(schedule))


def has_preferred_day_off(schedule: Sequence[Section], day_of_week: int | None) -> bool:
    """True if no meeting is on day_of_week (0 = Monday ... 6 = Sunday)."""
    if day_of_week is None:
        return True
    return all(meeting.day_of_week != day_of_week for meeting in schedule_meetings(schedule))


def meets_max_classes_per_day(schedule: Sequence[Section], max_classes_per_day: int | None) -> bool:
    """True if no day has more than max_classes_per_day meetings.

    The three filters above look at each meeting on its own. This one can't: it has to count the
    meetings of all the schedule's sections together, day by day, e.g. {Monday: 3, Tuesday: 2}.
    A section that meets twice on one day (such as a lecture and a lab) counts twice.
    """
    if max_classes_per_day is None:
        return True
    classes_per_day = Counter(meeting.day_of_week for meeting in schedule_meetings(schedule))
    return all(count <= max_classes_per_day for count in classes_per_day.values())


def schedule_matches_preferences(schedule: Sequence[Section], preferences: SchedulePreferences | None) -> bool:
    """True if the schedule passes all four filters. Preferences that were left out always pass."""
    if preferences is None:
        return True
    day_off = DAY_NUMBERS[preferences.preferred_day_off] if preferences.preferred_day_off is not None else None
    return (
        meets_earliest_start(schedule, preferences.earliest_start)
        and meets_latest_end(schedule, preferences.latest_end)
        and has_preferred_day_off(schedule, day_off)
        and meets_max_classes_per_day(schedule, preferences.max_classes_per_day)
    )


def apply_preferences(
    schedules: Sequence[tuple[Section, ...]], preferences: SchedulePreferences | None
) -> list[tuple[Section, ...]]:
    """The schedules that pass every given preference, in their original order."""
    return [schedule for schedule in schedules if schedule_matches_preferences(schedule, preferences)]
