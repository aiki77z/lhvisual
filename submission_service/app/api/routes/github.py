from __future__ import annotations

from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, RedirectResponse, Response

from submission_service.app.schemas import GitHubSessionRead, GitHubUserRead
from submission_service.app.services.github_auth import (
    GitHubAuthError,
    GitHubOAuthService,
    clear_session_cookie,
    consume_oauth_state,
    create_oauth_state,
    create_session_token,
    current_github_identity,
    render_popup_result,
    set_session_cookie,
    upsert_github_identity,
    validate_return_to,
)

router = APIRouter(prefix="/github", tags=["github"])


def _session_payload(request: Request) -> GitHubSessionRead:
    session_factory = request.app.state.session_factory
    with session_factory() as db:
        identity = current_github_identity(request, db)
        if identity is None:
            return GitHubSessionRead(authenticated=False, user=None)
        scopes = [item for item in (identity.scopes or "").split(",") if item]
        return GitHubSessionRead(
            authenticated=True,
            user=GitHubUserRead(
                github_user_id=identity.github_user_id,
                login=identity.login,
                name=identity.name,
                email=identity.email,
                avatar_url=identity.avatar_url,
                profile_url=identity.profile_url,
                scopes=scopes,
            ),
        )


@router.get("/session", response_model=GitHubSessionRead)
def get_github_session(request: Request) -> GitHubSessionRead:
    return _session_payload(request)


@router.post("/logout", response_model=GitHubSessionRead)
def logout_github_session(request: Request) -> Response:
    session_factory = request.app.state.session_factory
    config = request.app.state.config
    with session_factory() as db:
        identity = current_github_identity(request, db)
        cookie_value = request.cookies.get(config.github_session_cookie_name)
        if cookie_value:
            from submission_service.app.services.github_auth import hash_session_token
            from submission_service.app.models import GitHubSession

            github_session = db.get(GitHubSession, hash_session_token(cookie_value))
            if github_session is not None:
                db.delete(github_session)
                db.commit()
    response = JSONResponse(GitHubSessionRead(authenticated=False, user=None).model_dump())
    clear_session_cookie(response, config)
    return response


@router.get("/login")
def start_github_login(
    request: Request,
    return_to: str = Query(...),
) -> RedirectResponse:
    config = request.app.state.config
    try:
        validated_return_to = validate_return_to(return_to, config)
        authorize_url = ""
        session_factory = request.app.state.session_factory
        with session_factory() as db:
            oauth_state = create_oauth_state(db, return_to=validated_return_to)
            authorize_url = GitHubOAuthService(config).build_authorize_url(state=oauth_state.state)
            db.commit()
        return RedirectResponse(authorize_url, status_code=status.HTTP_302_FOUND)
    except GitHubAuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.summary) from exc


@router.get("/callback")
def github_callback(
    request: Request,
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
) -> Response:
    config = request.app.state.config
    session_factory = request.app.state.session_factory
    default_return_to = next((origin for origin in config.api_allowed_origins if origin != "*"), "/")
    resolved_return_to = default_return_to

    try:
        if not state:
            raise GitHubAuthError("github_state_missing", "GitHub callback did not include state")
        with session_factory() as db:
            oauth_state = consume_oauth_state(db, state=state)
            resolved_return_to = oauth_state.return_to
            if error:
                db.commit()
                raise GitHubAuthError("github_authorization_denied", f"GitHub returned OAuth error: {error}")
            if not code:
                db.commit()
                raise GitHubAuthError("github_code_missing", "GitHub callback did not include an authorization code")
            profile = GitHubOAuthService(config).exchange_code_for_user(code=code)
            identity = upsert_github_identity(db, profile=profile, config=config)
            session_token = create_session_token(db, github_user_id=identity.github_user_id, config=config)
            db.commit()

        origin = f"{urlparse(resolved_return_to).scheme}://{urlparse(resolved_return_to).netloc}"
        response = render_popup_result(
            return_to=resolved_return_to,
            target_origin=origin,
            ok=True,
            login=identity.login,
        )
        set_session_cookie(response, session_token=session_token, config=config)
        return response
    except GitHubAuthError as exc:
        origin = (
            f"{urlparse(resolved_return_to).scheme}://{urlparse(resolved_return_to).netloc}"
            if resolved_return_to != "/"
            else "*"
        )
        return render_popup_result(
            return_to=resolved_return_to,
            target_origin=origin,
            ok=False,
            error=exc.summary,
        )
