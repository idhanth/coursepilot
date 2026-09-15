from math import prod

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schedule import GenerateSchedulesRequest, GenerateSchedulesResponse
from app.services import course_service
from app.services.schedule_service import generate_valid_schedules

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


@router.post("/generate", response_model=GenerateSchedulesResponse)
def generate_schedules(data: GenerateSchedulesRequest, db: Session = Depends(get_db)):
    # 1. Load the selected courses with their sections and meetings (three queries in total).
    courses_by_id = {course.id: course for course in course_service.get_courses_with_sections(db, data.course_ids)}

    missing_ids = [course_id for course_id in data.course_ids if course_id not in courses_by_id]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course not found: {', '.join(str(course_id) for course_id in missing_ids)}.",
        )

    # 2. One list of sections per course, in the order the student selected the courses.
    course_sections = [courses_by_id[course_id].sections for course_id in data.course_ids]

    without_sections = [courses_by_id[course_id].course_code for course_id, sections in zip(data.course_ids, course_sections) if not sections]
    if without_sections:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"No sections are offered for {', '.join(without_sections)}, so no schedule can include it.",
        )

    # 3. Build every one-section-per-course combination and keep those with no conflicts.
    valid_schedules = generate_valid_schedules(course_sections)

    return {
        # The number of combinations is the product of the section counts, e.g. 3 x 3 x 3 = 27.
        "total_combinations": prod(len(sections) for sections in course_sections),
        "count": len(valid_schedules),
        "schedules": [
            {
                "sections": list(schedule),
                "total_credits": sum(section.course.credit_hours for section in schedule),
            }
            for schedule in valid_schedules
        ],
    }
