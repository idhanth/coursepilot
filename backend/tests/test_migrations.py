from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import inspect

from app.database import Base
from tests.conftest import alembic_config

CORE_TABLES = {
    "users",
    "courses",
    "sections",
    "section_meetings",
    "saved_schedules",
    "saved_schedule_sections",
}


def app_tables(engine) -> set[str]:
    return set(inspect(engine).get_table_names()) - {"alembic_version"}


def test_migrations_are_at_latest_revision(engine):
    head = ScriptDirectory.from_config(alembic_config()).get_current_head()

    with engine.connect() as conn:
        current = MigrationContext.configure(conn).get_current_revision()

    assert current == head


def test_all_six_core_tables_exist(engine):
    assert app_tables(engine) == CORE_TABLES


def test_models_match_migrations(engine):
    # If a model changes without a new migration, Alembic finds differences here.
    with engine.connect() as conn:
        differences = compare_metadata(MigrationContext.configure(conn), Base.metadata)

    assert differences == []


def test_migrations_downgrade_and_upgrade_again(engine):
    config = alembic_config()

    command.downgrade(config, "base")
    assert app_tables(engine) == set()

    command.upgrade(config, "head")
    assert app_tables(engine) == CORE_TABLES
