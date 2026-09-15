"""Load a small sample course catalog.

    cd backend && .venv/bin/python -m app.seed

Running it again does nothing if courses already exist.
"""

from datetime import time

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Course, Section, SectionMeeting

# Day letters as they appear in a course catalog. R is Thursday, so it isn't confused with Tuesday.
DAY_NUMBERS = {"M": 0, "T": 1, "W": 2, "R": 3, "F": 4}

# Each section is (section number, instructor, location, meetings),
# and each meeting is (days, start time, end time).
# Some sections deliberately overlap (e.g. CSCI 1302-001, MATH 2250-002 and ECON 2105-002
# all meet MWF 10:20) so there are conflicts for the schedule generator to find.
COURSES = [
    {
        "course_code": "CSCI 1302",
        "course_name": "Software Development",
        "department": "Computer Science",
        "credit_hours": 4,
        "description": "Object-oriented programming, data structures and software development practices in Java.",
        "sections": [
            ("001", "Dr. Smith", "Boyd 328", [("MWF", "10:20", "11:10")]),
            ("002", "Dr. Lee", "Boyd 208", [("TR", "14:20", "15:35")]),
            # Lecture on Monday and Wednesday, plus a longer lab on Friday.
            ("003", "Dr. Patel", "Boyd 306", [("MW", "13:50", "14:40"), ("F", "13:50", "15:45")]),
        ],
    },
    {
        "course_code": "MATH 2250",
        "course_name": "Calculus I for Science and Engineering",
        "department": "Mathematics",
        "credit_hours": 4,
        "description": "Limits, derivatives and integrals of algebraic and transcendental functions, with applications.",
        "sections": [
            ("001", "Dr. Johnson", "Boyd 222", [("MWF", "09:10", "10:00")]),
            ("002", "Dr. Garcia", "Boyd 304", [("MWF", "10:20", "11:10")]),
            ("003", "Dr. Chen", "Boyd 322", [("TR", "09:35", "10:50")]),
        ],
    },
    {
        "course_code": "STAT 2000",
        "course_name": "Introductory Statistics",
        "department": "Statistics",
        "credit_hours": 3,
        "description": "Descriptive statistics, probability, sampling distributions, estimation and hypothesis testing.",
        "sections": [
            ("001", "Dr. Williams", "Brooks 101", [("MWF", "11:30", "12:20")]),
            ("002", "Dr. Brown", "Brooks 102", [("TR", "11:10", "12:25")]),
            ("003", "Dr. Davis", "Brooks 103", [("TR", "14:20", "15:35")]),
        ],
    },
    {
        "course_code": "ENGL 1102",
        "course_name": "English Composition II",
        "department": "English",
        "credit_hours": 3,
        "description": "Writing about literature, with emphasis on argument, research and revision.",
        "sections": [
            ("001", "Dr. Miller", "Park 115", [("MWF", "08:00", "08:50")]),
            ("002", "Dr. Wilson", "Park 227", [("TR", "12:45", "14:00")]),
            ("003", "Dr. Moore", "Park 142", [("MWF", "12:40", "13:30")]),
        ],
    },
    {
        "course_code": "ECON 2105",
        "course_name": "Principles of Macroeconomics",
        "department": "Economics",
        "credit_hours": 3,
        "description": "National income, inflation, unemployment, money and banking, and economic policy.",
        "sections": [
            ("001", "Dr. Taylor", "Brooks 201", [("TR", "08:00", "09:15")]),
            ("002", "Dr. Anderson", "Brooks 202", [("MWF", "10:20", "11:10")]),
            ("003", "Dr. Thomas", "Brooks 203", [("TR", "15:55", "17:10")]),
        ],
    },
]


def build_course(data: dict) -> Course:
    course = Course(
        course_code=data["course_code"],
        course_name=data["course_name"],
        department=data["department"],
        credit_hours=data["credit_hours"],
        description=data["description"],
    )
    for section_number, instructor, location, meetings in data["sections"]:
        section = Section(section_number=section_number, instructor=instructor, location=location)
        for days, start, end in meetings:
            # "MWF" becomes three separate meeting rows.
            for letter in days:
                section.meetings.append(
                    SectionMeeting(
                        day_of_week=DAY_NUMBERS[letter],
                        start_time=time.fromisoformat(start),
                        end_time=time.fromisoformat(end),
                    )
                )
        course.sections.append(section)
    return course


def seed(db: Session) -> bool:
    """Insert the sample catalog. Returns False, changing nothing, if any courses already exist."""
    if db.scalar(select(func.count()).select_from(Course)) > 0:
        return False
    db.add_all(build_course(data) for data in COURSES)
    db.commit()
    return True


def main() -> None:
    with SessionLocal() as db:
        if not seed(db):
            print("Courses already exist; nothing was seeded.")
            return
        courses = db.scalar(select(func.count()).select_from(Course))
        sections = db.scalar(select(func.count()).select_from(Section))
        meetings = db.scalar(select(func.count()).select_from(SectionMeeting))
        print(f"Seeded {courses} courses, {sections} sections and {meetings} meeting times.")


if __name__ == "__main__":
    main()
