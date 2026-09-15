# Importing every model here registers all 6 tables on Base.metadata,
# which Alembic compares against the database.
from app.models.course import Course
from app.models.schedule import SavedSchedule, saved_schedule_sections
from app.models.section import Section, SectionMeeting
from app.models.user import User

__all__ = ["Course", "SavedSchedule", "Section", "SectionMeeting", "User", "saved_schedule_sections"]
