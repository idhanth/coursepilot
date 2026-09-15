from datetime import time
from typing import Annotated, Literal, get_args

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.course import SectionResponse

# Generating schedules multiplies section counts, so the number of courses per request is capped:
# 8 courses with 3 sections each is already 3^8 = 6,561 combinations to check.
MAX_COURSES = 8

# Ids are PostgreSQL INTEGER columns, which stop at 2,147,483,647.
CourseId = Annotated[int, Field(ge=1, le=2_147_483_647)]

DayName = Literal["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
# "Monday" -> 0 ... "Sunday" -> 6, the same numbers stored in section_meetings.day_of_week.
DAY_NUMBERS = {name: number for number, name in enumerate(get_args(DayName))}


def check_clock_time(value: time) -> time:
    # A time with a time zone ("10:00Z", or a bare number, which Pydantic reads as seconds after
    # midnight UTC) can't be compared with the class times in the database, so only plain times pass.
    if value.tzinfo is not None:
        raise ValueError('Use a time such as "09:00" or "17:30", without a time zone.')
    return value


ClockTime = Annotated[time, AfterValidator(check_clock_time)]


class SchedulePreferences(BaseModel):
    """Optional strict filters. A preference that is left out doesn't remove any schedules."""

    # Unknown fields are rejected, so a misspelled preference is reported instead of silently ignored.
    model_config = ConfigDict(extra="forbid")

    earliest_start: ClockTime | None = None  # no class may start before this time
    latest_end: ClockTime | None = None  # no class may end after this time
    preferred_day_off: DayName | None = None  # no class may meet on this day
    # strict=True rejects "3", 2.0 and true instead of quietly converting them.
    max_classes_per_day: Annotated[int, Field(strict=True, ge=1)] | None = None

    @model_validator(mode="after")
    def check_time_window(self) -> "SchedulePreferences":
        if self.earliest_start is not None and self.latest_end is not None and self.earliest_start >= self.latest_end:
            raise ValueError("latest_end must be later than earliest_start.")
        return self


class GenerateSchedulesRequest(BaseModel):
    course_ids: list[CourseId] = Field(max_length=MAX_COURSES)
    preferences: SchedulePreferences | None = None

    @field_validator("course_ids")
    @classmethod
    def check_course_ids(cls, course_ids: list[int]) -> list[int]:
        if not course_ids:
            raise ValueError("Select at least one course.")
        if len(set(course_ids)) != len(course_ids):
            raise ValueError("Each course can only be selected once.")
        return course_ids


class CourseSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_code: str
    course_name: str
    credit_hours: int


class ScheduleSectionResponse(SectionResponse):
    """A section inside a generated schedule, with the course it belongs to."""

    course: CourseSummaryResponse


class GeneratedSchedule(BaseModel):
    sections: list[ScheduleSectionResponse]  # one per selected course, in the order the courses were sent
    total_credits: int


class GenerateSchedulesResponse(BaseModel):
    total_combinations: int  # every one-section-per-course combination
    conflict_free_count: int  # combinations with no time conflicts, before preferences
    count: int  # schedules returned: conflict-free and matching every preference
    schedules: list[GeneratedSchedule]
