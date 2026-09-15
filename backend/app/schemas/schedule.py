from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.course import SectionResponse

# Generating schedules multiplies section counts, so the number of courses per request is capped:
# 8 courses with 3 sections each is already 3^8 = 6,561 combinations to check.
MAX_COURSES = 8

# Ids are PostgreSQL INTEGER columns, which stop at 2,147,483,647.
CourseId = Annotated[int, Field(ge=1, le=2_147_483_647)]


class GenerateSchedulesRequest(BaseModel):
    course_ids: list[CourseId] = Field(max_length=MAX_COURSES)

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
    total_combinations: int  # combinations checked, before removing conflicts
    count: int  # valid schedules returned
    schedules: list[GeneratedSchedule]
