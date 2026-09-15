import pytest
from sqlalchemy import func, select

from app.models import Course, SavedSchedule, Section, User, saved_schedule_sections
from app.seed import seed
from app.services.auth_service import create_access_token

# A conflict-free schedule from the sample catalog: MWF 10:20, MWF 9:10, TR 12:45.
VALID = ("CSCI 1302-001", "MATH 2250-001", "ENGL 1102-002")


@pytest.fixture
def catalog(db):
    seed(db)


def make_user(db, name: str, email: str) -> User:
    # These tests never log in with a password, so the hash doesn't need to be real (bcrypt is slow).
    user = User(name=name, email=email, password_hash="not-a-real-hash")
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def alice(db):
    return make_user(db, "Alice", "alice@uga.edu")


@pytest.fixture
def bob(db):
    return make_user(db, "Bob", "bob@uga.edu")


def auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


def section_ids(db, *labels: str) -> list[int]:
    """Ids of seeded sections written as "CSCI 1302-001"."""
    rows = db.execute(select(Course.course_code, Section.section_number, Section.id).join(Course)).all()
    ids_by_label = {f"{code}-{number}": section_id for code, number, section_id in rows}
    return [ids_by_label[label] for label in labels]


def save(client, user, ids, name="Fall 2027 - Late Start", semester="Fall 2027"):
    return client.post(
        "/api/schedules/saved", json={"name": name, "semester": semester, "section_ids": ids}, headers=auth(user)
    )


def count(db, table) -> int:
    return db.scalar(select(func.count()).select_from(table))


# --- Login is required ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/api/schedules/saved"),
        ("POST", "/api/schedules/saved"),
        ("GET", "/api/schedules/saved/1"),
        ("DELETE", "/api/schedules/saved/1"),
    ],
)
def test_saved_schedule_endpoints_require_a_token(client, method, path):
    body = {"name": "x", "semester": "Fall 2027", "section_ids": [1]} if method == "POST" else None

    response = client.request(method, path, json=body)

    assert response.status_code == 401
    assert response.json() == {"detail": "Not authenticated."}


def test_save_with_invalid_token_is_rejected(client, catalog, db):
    response = client.post(
        "/api/schedules/saved",
        json={"name": "x", "semester": "Fall 2027", "section_ids": section_ids(db, *VALID)},
        headers={"Authorization": "Bearer not-a-jwt"},
    )

    assert response.status_code == 401
    assert count(db, SavedSchedule) == 0


# --- Saving --------------------------------------------------------------------------------------


def test_save_schedule(client, db, catalog, alice):
    ids = section_ids(db, *VALID)

    response = save(client, alice, ids)

    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"id", "name", "semester", "created_at", "course_codes", "total_credits", "sections"}
    assert body["name"] == "Fall 2027 - Late Start"
    assert body["semester"] == "Fall 2027"
    assert body["course_codes"] == ["CSCI 1302", "ENGL 1102", "MATH 2250"]  # course-code order
    assert body["total_credits"] == 4 + 3 + 4
    assert sorted(section["id"] for section in body["sections"]) == sorted(ids)
    assert all(section["meetings"] and section["course"]["course_code"] for section in body["sections"])


def test_saved_schedule_and_its_sections_persist_in_postgresql(client, db, catalog, alice):
    ids = section_ids(db, *VALID)

    schedule_id = save(client, alice, ids).json()["id"]
    db.expunge_all()  # read back from the database, not from objects already in memory

    schedule = db.get(SavedSchedule, schedule_id)
    assert schedule.user_id == alice.id
    assert sorted(section.id for section in schedule.sections) == sorted(ids)
    join_rows = set(db.execute(select(saved_schedule_sections)).all())
    assert join_rows == {(schedule_id, section_id) for section_id in ids}
    assert [s.id for s in db.get(User, alice.id).saved_schedules] == [schedule_id]


def test_save_trims_name_and_semester(client, db, catalog, alice):
    body = save(client, alice, section_ids(db, *VALID), name="  Friday Off  ", semester=" Spring 2028 ").json()

    assert (body["name"], body["semester"]) == ("Friday Off", "Spring 2028")


@pytest.mark.parametrize(
    ("field", "value"),
    [("name", ""), ("name", "   "), ("name", "x" * 101), ("semester", ""), ("semester", "   "), ("semester", "x" * 21)],
)
def test_save_requires_a_name_and_semester(client, db, catalog, alice, field, value):
    fields = {"name": "Fall 2027 - Late Start", "semester": "Fall 2027"} | {field: value}

    response = save(client, alice, section_ids(db, *VALID), **fields)

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", field]
    assert count(db, SavedSchedule) == 0


def test_save_with_no_sections_is_rejected(client, db, catalog, alice):
    response = save(client, alice, [])

    assert response.status_code == 422
    assert "A schedule needs at least one section." in response.json()["detail"][0]["msg"]


def test_save_with_duplicate_section_ids_is_rejected(client, db, catalog, alice):
    csci, math = section_ids(db, "CSCI 1302-001", "MATH 2250-001")

    response = save(client, alice, [csci, math, csci])

    assert response.status_code == 422
    assert "Each section can only be included once." in response.json()["detail"][0]["msg"]


def test_save_with_nonexistent_section_ids_is_rejected(client, db, catalog, alice):
    [csci] = section_ids(db, "CSCI 1302-001")

    response = save(client, alice, [csci, 99998, 99999])

    assert response.status_code == 404
    assert response.json() == {"detail": "Section not found: 99998, 99999."}
    assert count(db, SavedSchedule) == 0 and count(db, saved_schedule_sections) == 0


def test_save_with_two_sections_of_one_course_is_rejected(client, db, catalog, alice):
    response = save(client, alice, section_ids(db, "CSCI 1302-001", "CSCI 1302-002"))

    assert response.status_code == 422
    assert response.json() == {"detail": "A schedule can include only one section of each course."}


def test_save_with_conflicting_sections_is_rejected(client, db, catalog, alice):
    response = save(client, alice, section_ids(db, "CSCI 1302-001", "MATH 2250-002"))  # both MWF 10:20

    assert response.status_code == 422
    assert response.json() == {"detail": "These sections have a time conflict, so they can't be saved together."}
    assert count(db, SavedSchedule) == 0


# --- Listing -------------------------------------------------------------------------------------


def test_list_returns_only_the_current_users_schedules_newest_first(client, db, catalog, alice, bob):
    ids = section_ids(db, *VALID)
    save(client, alice, ids, name="Alice first")
    save(client, bob, ids, name="Bob's schedule")
    save(client, alice, section_ids(db, "STAT 2000-002"), name="Alice second")

    alice_list = client.get("/api/schedules/saved", headers=auth(alice)).json()
    bob_list = client.get("/api/schedules/saved", headers=auth(bob)).json()

    assert [schedule["name"] for schedule in alice_list] == ["Alice second", "Alice first"]
    assert [schedule["name"] for schedule in bob_list] == ["Bob's schedule"]
    assert set(alice_list[0]) == {"id", "name", "semester", "created_at", "course_codes", "total_credits"}
    assert alice_list[1]["course_codes"] == ["CSCI 1302", "ENGL 1102", "MATH 2250"]


def test_list_is_empty_for_a_new_user(client, alice):
    response = client.get("/api/schedules/saved", headers=auth(alice))

    assert response.status_code == 200
    assert response.json() == []


# --- Opening -------------------------------------------------------------------------------------


def test_get_own_saved_schedule(client, db, catalog, alice):
    saved = save(client, alice, section_ids(db, *VALID)).json()

    response = client.get(f"/api/schedules/saved/{saved['id']}", headers=auth(alice))

    assert response.status_code == 200
    assert response.json() == saved


def test_another_users_schedule_cannot_be_retrieved(client, db, catalog, alice, bob):
    schedule_id = save(client, alice, section_ids(db, *VALID)).json()["id"]

    as_bob = client.get(f"/api/schedules/saved/{schedule_id}", headers=auth(bob))
    missing = client.get("/api/schedules/saved/99999", headers=auth(bob))

    # Bob gets exactly the same answer as for a schedule that doesn't exist.
    assert as_bob.status_code == missing.status_code == 404
    assert as_bob.json() == missing.json() == {"detail": "Saved schedule not found."}


@pytest.mark.parametrize("bad_id", ["abc", "0", "99999999999"])
def test_impossible_schedule_ids_return_422(client, alice, bad_id):
    assert client.get(f"/api/schedules/saved/{bad_id}", headers=auth(alice)).status_code == 422
    assert client.delete(f"/api/schedules/saved/{bad_id}", headers=auth(alice)).status_code == 422


# --- Deleting ------------------------------------------------------------------------------------


def test_delete_own_saved_schedule(client, db, catalog, alice):
    schedule_id = save(client, alice, section_ids(db, *VALID)).json()["id"]
    sections_before = count(db, Section)

    response = client.delete(f"/api/schedules/saved/{schedule_id}", headers=auth(alice))

    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/api/schedules/saved/{schedule_id}", headers=auth(alice)).status_code == 404
    assert client.get("/api/schedules/saved", headers=auth(alice)).json() == []
    assert count(db, saved_schedule_sections) == 0  # join rows removed by ON DELETE CASCADE
    assert count(db, Section) == sections_before  # the catalog is untouched


def test_another_users_schedule_cannot_be_deleted(client, db, catalog, alice, bob):
    schedule_id = save(client, alice, section_ids(db, *VALID)).json()["id"]

    response = client.delete(f"/api/schedules/saved/{schedule_id}", headers=auth(bob))

    assert response.status_code == 404
    assert response.json() == {"detail": "Saved schedule not found."}
    assert client.get(f"/api/schedules/saved/{schedule_id}", headers=auth(alice)).status_code == 200
    assert count(db, saved_schedule_sections) == 3


def test_deleting_a_nonexistent_schedule_returns_404(client, alice):
    response = client.delete("/api/schedules/saved/99999", headers=auth(alice))

    assert response.status_code == 404
    assert response.json() == {"detail": "Saved schedule not found."}
