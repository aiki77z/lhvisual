from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from submission_service.app.api.routes.health import router as health_router
from submission_service.app.api.routes.submissions import SimpleRateLimiter, router as submissions_router
from submission_service.app.config import AppConfig, load_config
from submission_service.app.db import create_engine_and_session_factory, init_db


def create_app(config: AppConfig | None = None) -> FastAPI:
    resolved_config = config or load_config()
    resolved_config.artifacts_root.mkdir(parents=True, exist_ok=True)
    if resolved_config.submission_db_path is not None:
        resolved_config.submission_db_path.parent.mkdir(parents=True, exist_ok=True)

    engine, session_factory = create_engine_and_session_factory(resolved_config.database_url)
    init_db(engine)

    app = FastAPI(title="LoopsBench Submission Service", version="0.1.0")
    app.state.config = resolved_config
    app.state.engine = engine
    app.state.session_factory = session_factory
    app.state.rate_limiter = SimpleRateLimiter(
        max_events=resolved_config.max_ip_submissions_per_window,
        window_sec=resolved_config.ip_rate_limit_window_sec,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved_config.api_allowed_origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router, prefix="/api/v1")
    app.include_router(submissions_router, prefix="/api/v1")
    return app


app = create_app()
