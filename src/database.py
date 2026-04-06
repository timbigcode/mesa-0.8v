from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from src.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — yields a session with RLS not yet set."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def set_rls(db, restaurant_id: str) -> None:
    """Set the PostgreSQL session variable used by RLS policies."""
    db.execute(text(f"SET LOCAL app.restaurant_id = '{restaurant_id}'"))
