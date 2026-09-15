import pytest

from app.seed import build_course

# A small catalog written for these tests, so they don't depend on the sample seed data.
# CSCI 1302's sections are listed out of order to check that the API sorts them.
CATALOG = [
    {
        "course_code": "MATH 2250",
        "course_name": "Calculus I for Science and Engineering",
        "department": "Mathematics",
        "credit_hours": 4,
        "description": None,
        "sections": [("001", "Dr. Johnson", "Boyd 222", [("MWF", "09:10", "10:00")])],
    },
    {
        "course_code": "CSCI 1302",
        "course_name": "Software Development",
        "department": "Computer Science",
        "credit_hours": 4,
        "description": "Object-oriented programming in Java.",
        "sections": [
            ("002", "Dr. Lee", "Boyd 208", [("TR", "14:20", "15:35")]),
            ("001", "Dr. Smith", "Boyd 328", [("MWF", "10:20", "11:10")]),
        ],
    },
    {
        "course_code": "ENGL 1102",
        "course_name": "English Composition II",
        "department": "English",
        "credit_hours": 3,
        "description": None,
        "sections": [],
    },
    {
        "course_code": "CSCI 1730",
        "course_name": "Systems Programming",
        "department": "Computer Science",
        "credit_hours": 4,
        "description": None,
        "sections": [("001", "Dr. Kim", "Boyd 306", [("TR", "09:35", "10:50")])],
    },
]


@pytest.fixture
def catalog(db):
    courses = [build_course(data) for data in CATALOG]
    db.add_all(courses)
    db.commit()
    return {course.course_code: course for course in courses}


def codes(response) -> list[str]:
    return [course["course_code"] for course in response.json()]


def search(client, q):
    return client.get("/api/courses/search", params={"q": q})


# --- GET /api/courses ----------------------------------------------------------------------------


def test_list_courses_returns_all_courses_sorted_by_code(client, catalog):
    response = client.get("/api/courses")

    assert response.status_code == 200
    assert codes(response) == ["CSCI 1302", "CSCI 1730", "ENGL 1102", "MATH 2250"]
    assert response.json()[0] == {
        "id": catalog["CSCI 1302"].id,
        "course_code": "CSCI 1302",
        "course_name": "Software Development",
        "department": "Computer Science",
        "description": "Object-oriented programming in Java.",
        "credit_hours": 4,
    }


def test_list_courses_with_empty_catalog(client):
    response = client.get("/api/courses")

    assert response.status_code == 200
    assert response.json() == []


# --- GET /api/courses/search ---------------------------------------------------------------------


@pytest.mark.parametrize(
    ("q", "expected"),
    [
        ("CSCI 1302", ["CSCI 1302"]),
        ("CSCI", ["CSCI 1302", "CSCI 1730"]),
        ("1730", ["CSCI 1730"]),
    ],
)
def test_search_by_course_code(client, catalog, q, expected):
    response = search(client, q)

    assert response.status_code == 200
    assert codes(response) == expected


@pytest.mark.parametrize(
    ("q", "expected"),
    [
        ("Software Development", ["CSCI 1302"]),
        ("Calculus", ["MATH 2250"]),
    ],
)
def test_search_by_course_name(client, catalog, q, expected):
    assert codes(search(client, q)) == expected


@pytest.mark.parametrize(
    ("q", "expected"),
    [
        ("Mathematics", ["MATH 2250"]),
        ("Computer Science", ["CSCI 1302", "CSCI 1730"]),
    ],
)
def test_search_by_department(client, catalog, q, expected):
    assert codes(search(client, q)) == expected


@pytest.mark.parametrize(
    ("q", "expected"),
    [
        ("csci 1302", ["CSCI 1302"]),
        ("SOFTWARE development", ["CSCI 1302"]),
        ("mAtHeMaTiCs", ["MATH 2250"]),
    ],
)
def test_search_is_case_insensitive(client, catalog, q, expected):
    assert codes(search(client, q)) == expected


def test_search_matches_any_of_the_three_fields(client, catalog):
    # "comp" is in the department "Computer Science" and in the course name "English Composition II".
    assert codes(search(client, "comp")) == ["CSCI 1302", "CSCI 1730", "ENGL 1102"]


def test_search_ignores_surrounding_whitespace(client, catalog):
    assert codes(search(client, "  english  ")) == ["ENGL 1102"]


def test_search_with_no_matches_returns_empty_list(client, catalog):
    response = search(client, "Underwater Basket Weaving")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.parametrize("q", ["%", "_", "\\"])
def test_search_treats_wildcard_characters_as_plain_text(client, catalog, q):
    assert search(client, q).json() == []


def test_search_requires_a_query(client, catalog):
    assert client.get("/api/courses/search").status_code == 422

    response = search(client, "   ")
    assert response.status_code == 422
    assert response.json() == {"detail": "Search query cannot be blank."}


# --- GET /api/courses/{id} -----------------------------------------------------------------------


def test_get_course_detail(client, catalog):
    course = catalog["MATH 2250"]

    response = client.get(f"/api/courses/{course.id}")

    assert response.status_code == 200
    assert response.json() == {
        "id": course.id,
        "course_code": "MATH 2250",
        "course_name": "Calculus I for Science and Engineering",
        "department": "Mathematics",
        "description": None,
        "credit_hours": 4,
    }


def test_get_missing_course_returns_404(client, catalog):
    response = client.get("/api/courses/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Course not found."}


@pytest.mark.parametrize("bad_id", ["abc", "0", "-1", "99999999999"])
def test_impossible_course_ids_return_422(client, catalog, bad_id):
    # 99999999999 is larger than PostgreSQL's INTEGER type can hold.
    assert client.get(f"/api/courses/{bad_id}").status_code == 422
    assert client.get(f"/api/courses/{bad_id}/sections").status_code == 422


# --- GET /api/courses/{id}/sections --------------------------------------------------------------


def test_list_sections_for_a_course(client, catalog):
    course = catalog["CSCI 1302"]
    section_001 = next(s for s in course.sections if s.section_number == "001")

    response = client.get(f"/api/courses/{course.id}/sections")

    assert response.status_code == 200
    assert [section["section_number"] for section in response.json()] == ["001", "002"]
    assert response.json()[0] == {
        "id": section_001.id,
        "course_id": course.id,
        "section_number": "001",
        "instructor": "Dr. Smith",
        "location": "Boyd 328",
        "meetings": [
            {"day_of_week": 0, "start_time": "10:20:00", "end_time": "11:10:00"},
            {"day_of_week": 2, "start_time": "10:20:00", "end_time": "11:10:00"},
            {"day_of_week": 4, "start_time": "10:20:00", "end_time": "11:10:00"},
        ],
    }


def test_list_sections_for_a_course_without_sections(client, catalog):
    response = client.get(f"/api/courses/{catalog['ENGL 1102'].id}/sections")

    assert response.status_code == 200
    assert response.json() == []


def test_list_sections_for_missing_course_returns_404(client, catalog):
    response = client.get("/api/courses/999/sections")

    assert response.status_code == 404
    assert response.json() == {"detail": "Course not found."}


# --- GET /api/sections/{id} ----------------------------------------------------------------------


def test_get_section_detail(client, catalog):
    section = catalog["CSCI 1730"].sections[0]

    response = client.get(f"/api/sections/{section.id}")

    assert response.status_code == 200
    body = response.json()
    assert body["course_id"] == catalog["CSCI 1730"].id
    assert body["section_number"] == "001"
    assert [meeting["day_of_week"] for meeting in body["meetings"]] == [1, 3]  # Tuesday, Thursday


def test_get_missing_section_returns_404(client, catalog):
    response = client.get("/api/sections/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Section not found."}
