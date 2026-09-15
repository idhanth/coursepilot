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
    assert response.json() == {"total_combinations": 2, "conflict_free_count": 0, "count": 0, "schedules": []}


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


# --- Preferences ---------------------------------------------------------------------------------
# Seeded sections used below (times as stored):
#   CSCI 1302  001 MWF 10:20-11:10   002 TR 14:20-15:35   003 MW 13:50-14:40 + F 13:50-15:45
#   MATH 2250  001 MWF 09:10-10:00   002 MWF 10:20-11:10  003 TR 09:35-10:50
#   STAT 2000  001 MWF 11:30-12:20   002 TR 11:10-12:25   003 TR 14:20-15:35
#   ENGL 1102  001 MWF 08:00-08:50   002 TR 12:45-14:00   003 MWF 12:40-13:30


def generate_with(client, course_ids, preferences):
    return client.post("/api/schedules/generate", json={"course_ids": course_ids, "preferences": preferences})


def all_meetings(body):
    return [meeting for schedule in body["schedules"] for section in schedule["sections"] for meeting in section["meetings"]]


def test_generation_without_preferences_matches_phase_6(client, db):
    seed(db)
    course_ids = seeded_ids(db, "CSCI 1302", "MATH 2250", "ENGL 1102")

    omitted = generate(client, course_ids).json()
    empty = generate_with(client, course_ids, {}).json()
    null = generate_with(client, course_ids, None).json()

    assert omitted == empty == null
    assert omitted["total_combinations"] == 27
    assert omitted["conflict_free_count"] == omitted["count"] == 24


def test_time_window_preferences(client, db):
    seed(db)
    course_ids = seeded_ids(db, "CSCI 1302", "MATH 2250", "ENGL 1102")

    response = generate_with(client, course_ids, {"earliest_start": "09:00", "latest_end": "15:00"})

    assert response.status_code == 200
    body = response.json()
    assert body["total_combinations"] == 27
    assert body["conflict_free_count"] == 24
    # Ending by 15:00 leaves only CSCI 1302-001, which conflicts with MATH 2250-002.
    # Starting at 9:00 or later removes ENGL 1102-001. That leaves 1 x 2 x 2 = 4 schedules.
    assert labels(body) == [
        ["CSCI 1302-001", "MATH 2250-001", "ENGL 1102-002"],
        ["CSCI 1302-001", "MATH 2250-001", "ENGL 1102-003"],
        ["CSCI 1302-001", "MATH 2250-003", "ENGL 1102-002"],
        ["CSCI 1302-001", "MATH 2250-003", "ENGL 1102-003"],
    ]
    assert body["count"] == 4
    assert all(m["start_time"] >= "09:00:00" and m["end_time"] <= "15:00:00" for m in all_meetings(body))


def test_preferred_day_off(client, db):
    seed(db)
    course_ids = seeded_ids(db, "CSCI 1302", "MATH 2250", "ENGL 1102")

    body = generate_with(client, course_ids, {"preferred_day_off": "Friday"}).json()

    # Only one section of each course avoids Friday: CSCI 1302-002, MATH 2250-003 and ENGL 1102-002 (all TR).
    assert labels(body) == [["CSCI 1302-002", "MATH 2250-003", "ENGL 1102-002"]]
    assert all(m["day_of_week"] != 4 for m in all_meetings(body))


def test_max_classes_per_day(client, db):
    seed(db)
    course_ids = seeded_ids(db, "CSCI 1302", "MATH 2250", "ENGL 1102")

    # The only Friday-free schedule has 3 classes on Tuesday and Thursday.
    assert generate_with(client, course_ids, {"preferred_day_off": "Friday", "max_classes_per_day": 3}).json()["count"] == 1
    assert generate_with(client, course_ids, {"preferred_day_off": "Friday", "max_classes_per_day": 2}).json()["count"] == 0


def test_all_preferences_on_four_seeded_courses(client, db):
    seed(db)
    course_ids = seeded_ids(db, "CSCI 1302", "MATH 2250", "STAT 2000", "ENGL 1102")
    window = {"earliest_start": "09:00", "latest_end": "15:00"}

    body = generate_with(client, course_ids, window | {"max_classes_per_day": 3}).json()

    # 81 combinations, 63 without conflicts. The 9:00-15:00 window keeps CSCI 1302-001, MATH 2250-001/003,
    # STAT 2000-001/002 and ENGL 1102-002/003, and MATH 2250-002 is out because it conflicts with
    # CSCI 1302-001: 1 x 2 x 2 x 2 = 8 schedules. Exactly one of those has 4 MWF classes
    # (CSCI 1302-001, MATH 2250-001, STAT 2000-001, ENGL 1102-003), so a limit of 3 leaves 7.
    assert (body["total_combinations"], body["conflict_free_count"], body["count"]) == (81, 63, 7)
    assert ["CSCI 1302-001", "MATH 2250-001", "STAT 2000-001", "ENGL 1102-003"] not in labels(body)

    # With at most 2 classes per day, exactly one of MATH, STAT and ENGL can be the MWF section.
    assert generate_with(client, course_ids, window | {"max_classes_per_day": 2}).json()["count"] == 3
    assert generate_with(client, course_ids, window).json()["count"] == 8


def test_preferences_can_filter_out_every_schedule(client, db):
    seed(db)
    course_ids = seeded_ids(db, "CSCI 1302", "MATH 2250", "STAT 2000", "ENGL 1102")

    # The only CSCI 1302 section inside 9:00-15:00 meets on Friday.
    response = generate_with(client, course_ids, {"earliest_start": "09:00", "latest_end": "15:00", "preferred_day_off": "Friday"})

    assert response.status_code == 200
    assert response.json() == {"total_combinations": 81, "conflict_free_count": 63, "count": 0, "schedules": []}


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("earliest_start", "9:00"),  # hours need two digits
        ("earliest_start", "25:00"),
        ("earliest_start", "10am"),
        ("earliest_start", ""),
        ("earliest_start", 36000),  # a number, not a time
        ("earliest_start", "10:00Z"),  # has a time zone
        ("latest_end", "17:61"),
        ("latest_end", "17:00+05:00"),
        ("preferred_day_off", "Funday"),
        ("preferred_day_off", "friday"),
        ("preferred_day_off", 4),
        ("max_classes_per_day", 0),
        ("max_classes_per_day", -1),
        ("max_classes_per_day", 2.5),
        ("max_classes_per_day", "3"),
        ("max_classes_per_day", True),
    ],
)
def test_invalid_preference_values_are_rejected(client, db, field, value):
    seed(db)

    response = generate_with(client, seeded_ids(db, "CSCI 1302"), {field: value})

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"][:3] == ["body", "preferences", field]


@pytest.mark.parametrize(("earliest_start", "latest_end"), [("15:00", "09:00"), ("10:00", "10:00")])
def test_latest_end_must_be_after_earliest_start(client, db, earliest_start, latest_end):
    seed(db)

    response = generate_with(client, seeded_ids(db, "CSCI 1302"), {"earliest_start": earliest_start, "latest_end": latest_end})

    assert response.status_code == 422
    assert "latest_end must be later than earliest_start." in response.json()["detail"][0]["msg"]


def test_unknown_preference_is_rejected(client, db):
    seed(db)

    response = generate_with(client, seeded_ids(db, "CSCI 1302"), {"earliest": "09:00"})

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "preferences", "earliest"]
