from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.course import CourseResponse, SectionResponse
from app.services import course_service

router = APIRouter(prefix="/api", tags=["courses"])

# Ids are PostgreSQL INTEGER columns, which stop at 2,147,483,647. Checking the range here returns
# a 422 for an impossible id instead of letting the database query fail with a server error.
DatabaseId = Annotated[int, Path(ge=1, le=2_147_483_647)]


@router.get("/courses", response_model=list[CourseResponse])
def list_courses(db: Session = Depends(get_db)):
    return course_service.list_courses(db)


# This route must be declared before /courses/{course_id}. FastAPI tries routes in order,
# and would otherwise treat the word "search" as a course id.
@router.get("/courses/search", response_model=list[CourseResponse])
def search_courses(q: Annotated[str, Query(max_length=100)], db: Session = Depends(get_db)):
    query = q.strip()
    if not query:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Search query cannot be blank.")
    return course_service.search_courses(db, query)


@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course(course_id: DatabaseId, db: Session = Depends(get_db)):
    course = course_service.get_course(db, course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
    return course


@router.get("/courses/{course_id}/sections", response_model=list[SectionResponse])
def list_course_sections(course_id: DatabaseId, db: Session = Depends(get_db)):
    # Check the course exists, so a wrong id returns 404 rather than an empty list.
    if course_service.get_course(db, course_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found.")
    return course_service.list_sections(db, course_id)


@router.get("/sections/{section_id}", response_model=SectionResponse)
def get_section(section_id: DatabaseId, db: Session = Depends(get_db)):
    section = course_service.get_section(db, section_id)
    if section is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Section not found.")
    return section
