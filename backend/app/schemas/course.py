from datetime import time

from pydantic import BaseModel, ConfigDict


class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_code: str
    course_name: str
    department: str
    description: str | None
    credit_hours: int


class MeetingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    day_of_week: int  # 0 = Monday ... 6 = Sunday
    start_time: time  # sent as "HH:MM:SS"
    end_time: time


class SectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    section_number: str
    instructor: str
    location: str
    meetings: list[MeetingResponse]
