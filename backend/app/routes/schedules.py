from math import prod

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import DatabaseId, get_current_user
from app.models import SavedSchedule, User
from app.schemas.schedule import (
    GenerateSchedulesRequest,
    GenerateSchedulesResponse,
    SavedScheduleDetail,
    SavedScheduleSummary,
    SaveScheduleRequest,
)
from app.services import course_service, saved_schedule_service
from app.services.saved_schedule_service import InvalidScheduleError, SectionsNotFoundError
from app.services.schedule_service import apply_preferences, generate_valid_schedules

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
    conflict_free_schedules = generate_valid_schedules(course_sections)

    # 4. Keep the conflict-free schedules that pass every preference given (omitted ones remove nothing).
    matching_schedules = apply_preferences(conflict_free_schedules, data.preferences)

    return {
        # The number of combinations is the product of the section counts, e.g. 3 x 3 x 3 = 27.
        "total_combinations": prod(len(sections) for sections in course_sections),
        "conflict_free_count": len(conflict_free_schedules),
        "count": len(matching_schedules),
        "schedules": [
            {
                "sections": list(schedule),
                "total_credits": sum(section.course.credit_hours for section in schedule),
            }
            for schedule in matching_schedules
        ],
    }


# --- Saved schedules: every route requires a logged-in user -------------------------------------

def saved_schedule_not_found() -> HTTPException:
    # Used for a missing schedule AND for another user's schedule, so the response never reveals which.
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved schedule not found.")


def saved_schedule_response(schedule: SavedSchedule) -> dict:
    # The join table has no position column, so sections are listed in course-code order.
    sections = sorted(schedule.sections, key=lambda section: section.course.course_code)
    return {
        "id": schedule.id,
        "name": schedule.name,
        "semester": schedule.semester,
        "created_at": schedule.created_at,
        "course_codes": [section.course.course_code for section in sections],
        "total_credits": sum(section.course.credit_hours for section in sections),
        "sections": sections,
    }


@router.get("/saved", response_model=list[SavedScheduleSummary])
def list_saved_schedules(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return [saved_schedule_response(schedule) for schedule in saved_schedule_service.list_saved_schedules(db, current_user)]


@router.post("/saved", response_model=SavedScheduleDetail, status_code=status.HTTP_201_CREATED)
def save_schedule(
    data: SaveScheduleRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    try:
        schedule = saved_schedule_service.create_saved_schedule(db, current_user, data)
    except SectionsNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from None
    except InvalidScheduleError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)) from None
    return saved_schedule_response(schedule)


@router.get("/saved/{schedule_id}", response_model=SavedScheduleDetail)
def get_saved_schedule(
    schedule_id: DatabaseId, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    schedule = saved_schedule_service.get_saved_schedule(db, current_user, schedule_id)
    if schedule is None:
        raise saved_schedule_not_found()
    return saved_schedule_response(schedule)


@router.delete("/saved/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_schedule(
    schedule_id: DatabaseId, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if not saved_schedule_service.delete_saved_schedule(db, current_user, schedule_id):
        raise saved_schedule_not_found()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
