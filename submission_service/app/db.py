from __future__ import annotations

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


class Base(DeclarativeBase):
    pass


def create_engine_and_session_factory(database_url: str) -> tuple[Engine, sessionmaker]:
    connect_args: dict[str, object] = {}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    engine = create_engine(database_url, future=True, connect_args=connect_args)
    session_factory = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )
    return engine, session_factory


def init_db(engine: Engine) -> None:
    from submission_service.app import models  # noqa: F401

    Base.metadata.create_all(engine)
