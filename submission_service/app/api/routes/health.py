from __future__ import annotations

from fastapi import APIRouter, Request

from submission_service.app.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/healthz", response_model=HealthResponse)
def healthz(request: Request) -> HealthResponse:
    config = request.app.state.config
    return HealthResponse(
        status="ok",
        process_inline=config.process_inline,
        queue_name=config.queue_name,
    )
