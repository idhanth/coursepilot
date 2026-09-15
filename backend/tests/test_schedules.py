import pytest
from sqlalchemy import select

from app.models import Course
from app.seed import build_course, seed


def seeded_ids(db, *codes: str) -> list[int]:
    ids_by_code = dict(db.execute(select(Course.course_code, Course.id)).all())
    return [ids_by_code[code] for code in codes]


def generate(client, course_ids):
    return client.post("/api/schedules/generate", json={"course_ids": course_ids})


def labels(body) -> list[list[str]]:
    return [
        [f"{section['course']['course_code']}-{section['section_number']}" for section in schedule["sections"]]
        for schedule in body["schedules"]
    ]


def add_course(db, code: str, sections):
    course = build_course(
        {"course_code": code, "course_name": code, "department": "Test", "credit_hours": 3, "description": None, "sections": sections}
    )
    db.add(course)
    db.commit()
    return course.id


# --- Valid requests ------------------------------------------------------------------------------


def test_generate_schedules_for_seeded_courses(client, db):
    seed(db)
    course_ids = seeded_ids(db, "CSCI 1302", "MATH 2250", "ENGL 1102")

    response = generate(client, course_ids)

    assert response.status_code == 200
    body = response.json()
    assert body["total_combinations"] == 3 * 3 * 3

    # In this catalog only one pair conflicts: CSCI 1302-001 and MATH 2250-002 both meet MWF 10:20-11:10.
    # That pair rules out 3 combinations, one for each ENGL 1102 section.
    assert body["count"] == 27 - 3
    assert len(body["schedules"]) == body["count"]

    schedules = labels(body)
    assert schedules[0] == ["CSCI 1302-001", "MATH 2250-001", "ENGL 1102-001"]
    assert len({tuple(schedule) for schedule in schedules}) == 24
    assert not any(s[0] == "CSCI 1302-001" and s[1] == "MATH 2250-002" for s in schedules)
    assert all(schedule["total_credits"] == 4 + 4 + 3 for schedule in body["schedules"])

    first_section = body["schedules"][0]["sections"][0]
    assert set(first_section) == {"id", "course_id", "section_number", "instructor", "location", "meetings", "course"}
    assert first_section["course"] == {
        "id": course_ids[0],
        "course_code": "CSCI 1302",
        "course_name": "Software Development",
        "credit_hours": 4,
    }
    assert first_section["meetings"][0] == {"day_of_week": 0, "start_time": "10:20:00", "end_time": "11:10:00"}


def test_sections_follow_the_order_courses_were_sent(client, db):
    seed(db)

    body = generate(client, seeded_ids(db, "ENGL 1102", "CSCI 1302")).json()

    assert all(s[0].startswith("ENGL 1102") and s[1].startswith("CSCI 1302") for s in labels(body))


def test_one_selected_course_returns_each_of_its_sections(client, db):
    seed(db)

    body = generate(client, seeded_ids(db, "STAT 2000")).json()

    assert body["total_combinations"] == 3
    assert body["count"] == 3
    assert labels(body) == [["STAT 2000-001"], ["STAT 2000-002"], ["STAT 2000-003"]]
    assert [schedule["total_credits"] for schedule in body["schedules"]] == [3, 3, 3]


def test_all_combinations_conflicting_returns_an_empty_list(client, db):
    lecture = add_course(db, "TEST 1000", [("001", "Staff", "TBA", [("MWF", "10:00", "10:50")])])
    overlapping = add_course(
        db,
        "TEST 2000",
        [("001", "Staff", "TBA", [("MWF", "10:00", "10:50")]), ("002", "Staff", "TBA", [("MW", "10:30", "11:20")])],
    )

    response = generate(client, [lecture, overlapping])

    assert response.status_code == 200
    assert response.json() == {"total_combinations": 2, "count": 0, "schedules": []}


# --- Invalid requests ----------------------------------------------------------------------------


def test_empty_course_list_is_rejected(client, db):
    response = generate(client, [])

    assert response.status_code == 422
    assert "Select at least one course." in response.json()["detail"][0]["msg"]


def test_missing_course_ids_field_is_rejected(client, db):
    assert client.post("/api/schedules/generate", json={}).status_code == 422


def test_duplicate_course_ids_are_rejected(client, db):
    seed(db)
    [csci] = seeded_ids(db, "CSCI 1302")

    response = generate(client, [csci, csci])

    assert response.status_code == 422
    assert "Each course can only be selected once." in response.json()["detail"][0]["msg"]


def test_nonexistent_course_returns_404(client, db):
    seed(db)
    [csci] = seeded_ids(db, "CSCI 1302")

    response = generate(client, [csci, 99999])

    assert response.status_code == 404
    assert response.json() == {"detail": "Course not found: 99999."}


def test_course_without_sections_is_rejected(client, db):
    seed(db)
    [csci] = seeded_ids(db, "CSCI 1302")
    empty = add_course(db, "TEST 3000", [])

    response = generate(client, [csci, empty])

    assert response.status_code == 422
    assert response.json() == {"detail": "No sections are offered for TEST 3000, so no schedule can include it."}


@pytest.mark.parametrize("course_ids", [[0], [-1], [2_147_483_648], ["abc"]])
def test_impossible_course_ids_are_rejected(client, db, course_ids):
    assert generate(client, course_ids).status_code == 422


def test_too_many_courses_are_rejected(client, db):
    response = generate(client, list(range(1, 10)))  # 9 courses; the limit is 8

    assert response.status_code == 422
