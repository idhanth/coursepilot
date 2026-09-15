"""Scheduling logic: deciding whether class meetings and sections conflict, and generating schedules.

These functions only compare values; they never query the database. They work on
SectionMeeting and Section objects, whether loaded from PostgreSQL or created in a test.
"""

from collections.abc import Sequence
from datetime import time
from itertools import product

from app.models import Section, SectionMeeting


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
