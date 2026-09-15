"""create core tables

Revision ID: 0001
Revises:
Create Date: 2026-09-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the 6 core tables from PRD §23."""
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )

    op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_code", sa.String(length=20), nullable=False),
        sa.Column("course_name", sa.String(length=150), nullable=False),
        sa.Column("department", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("credit_hours", sa.Integer(), nullable=False),
        sa.CheckConstraint("credit_hours > 0", name=op.f("ck_courses_credit_hours_positive")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_courses")),
        sa.UniqueConstraint("course_code", name=op.f("uq_courses_course_code")),
    )

    op.create_table(
        "sections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("section_number", sa.String(length=10), nullable=False),
        sa.Column("instructor", sa.String(length=100), nullable=False),
        sa.Column("location", sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(
            ["course_id"], ["courses.id"], name=op.f("fk_sections_course_id_courses"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sections")),
        sa.UniqueConstraint("course_id", "section_number", name=op.f("uq_sections_course_id_section_number")),
    )

    op.create_table(
        "section_meetings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("section_id", sa.Integer(), nullable=False),
        sa.Column("day_of_week", sa.SmallInteger(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.CheckConstraint("day_of_week BETWEEN 0 AND 6", name=op.f("ck_section_meetings_day_of_week_valid")),
        sa.CheckConstraint("end_time > start_time", name=op.f("ck_section_meetings_end_after_start")),
        sa.ForeignKeyConstraint(
            ["section_id"], ["sections.id"], name=op.f("fk_section_meetings_section_id_sections"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_section_meetings")),
    )
    op.create_index(op.f("ix_section_meetings_section_id"), "section_meetings", ["section_id"])

    op.create_table(
        "saved_schedules",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("semester", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_saved_schedules_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_saved_schedules")),
    )
    op.create_index(op.f("ix_saved_schedules_user_id"), "saved_schedules", ["user_id"])

    op.create_table(
        "saved_schedule_sections",
        sa.Column("schedule_id", sa.Integer(), nullable=False),
        sa.Column("section_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["schedule_id"],
            ["saved_schedules.id"],
            name=op.f("fk_saved_schedule_sections_schedule_id_saved_schedules"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["section_id"],
            ["sections.id"],
            name=op.f("fk_saved_schedule_sections_section_id_sections"),
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("schedule_id", "section_id", name=op.f("pk_saved_schedule_sections")),
    )
    op.create_index(op.f("ix_saved_schedule_sections_section_id"), "saved_schedule_sections", ["section_id"])


def downgrade() -> None:
    """Drop the tables in reverse order, so no table is dropped while another still references it."""
    op.drop_table("saved_schedule_sections")
    op.drop_table("saved_schedules")
    op.drop_table("section_meetings")
    op.drop_table("sections")
    op.drop_table("courses")
    op.drop_table("users")
