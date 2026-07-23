from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from json import dumps as json_dumps
from pathlib import Path
from urllib.parse import urlencode, urlparse

import httpx
from cryptography.fernet import Fernet
from fastapi import HTTPException, Request, status
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.orm import Session

from submission_service.app.config import AppConfig
from submission_service.app.models import GitHubIdentity, GitHubOAuthState, GitHubSession

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API_ROOT = "https://api.github.com"


class GitHubAuthError(RuntimeError):
    def __init__(self, code: str, summary: str):
        super().__init__(summary)
        self.code = code
        self.summary = summary


@dataclass(frozen=True)
class GitHubUserProfile:
    github_user_id: int
    login: str
    name: str | None
    email: str | None
    avatar_url: str | None
    profile_url: str | None
    access_token: str
    scope_csv: str


def _utc_now():
    from submission_service.app.models import utc_now

    return utc_now()


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _fernet(config: AppConfig) -> Fernet:
    return Fernet(config.token_encryption_key)


def encrypt_access_token(config: AppConfig, access_token: str) -> str:
    return _fernet(config).encrypt(access_token.encode("utf-8")).decode("utf-8")


def decrypt_access_token(config: AppConfig, encrypted_token: str) -> str:
    return _fernet(config).decrypt(encrypted_token.encode("utf-8")).decode("utf-8")


def hash_session_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_session_token(
    db: Session,
    *,
    github_user_id: int,
    config: AppConfig,
) -> str:
    raw_token = secrets.token_urlsafe(48)
    db.add(
        GitHubSession(
            session_token_hash=hash_session_token(raw_token),
            github_user_id=github_user_id,
            expires_at=_utc_now() + timedelta(seconds=config.github_session_ttl_sec),
        )
    )
    return raw_token


def set_session_cookie(response: Response, *, session_token: str, config: AppConfig) -> None:
    response.set_cookie(
        key=config.github_session_cookie_name,
        value=session_token,
        max_age=config.github_session_ttl_sec,
        httponly=True,
        secure=config.github_session_cookie_secure,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response, config: AppConfig) -> None:
    response.delete_cookie(
        key=config.github_session_cookie_name,
        httponly=True,
        secure=config.github_session_cookie_secure,
        samesite="lax",
        path="/",
    )


def current_github_identity(request: Request, db: Session) -> GitHubIdentity | None:
    config: AppConfig = request.app.state.config
    cookie = request.cookies.get(config.github_session_cookie_name)
    if not cookie:
        return None
    token_hash = hash_session_token(cookie)
    github_session = db.get(GitHubSession, token_hash)
    if github_session is None:
        return None
    if _as_utc(github_session.expires_at) <= _utc_now():
        db.delete(github_session)
        db.commit()
        return None
    return github_session.github_identity


def require_github_identity(request: Request, db: Session) -> GitHubIdentity:
    identity = current_github_identity(request, db)
    if identity is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="connect a GitHub account before submitting",
        )
    return identity


def validate_return_to(return_to: str, config: AppConfig) -> str:
    parsed = urlparse(return_to)
    if not parsed.scheme or not parsed.netloc:
        raise GitHubAuthError("invalid_return_to", "return_to must be an absolute URL")
    allowed_origins = {origin.rstrip("/") for origin in config.api_allowed_origins if origin != "*"}
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if allowed_origins and origin not in allowed_origins:
        raise GitHubAuthError("invalid_return_to", "return_to origin is not allowed")
    return return_to


def render_popup_result(
    *,
    return_to: str,
    target_origin: str,
    ok: bool,
    error: str | None = None,
    login: str | None = None,
) -> HTMLResponse:
    payload = {
        "type": "loopsbench:github-auth-result",
        "ok": ok,
        "error": error,
        "login": login,
    }
    body = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>LoopsBench GitHub Auth</title>
  </head>
  <body>
    <script>
      (function () {{
        const payload = {json_dumps(payload)};
        const returnTo = {json_dumps(return_to)};
        const targetOrigin = {json_dumps(target_origin)};
        if (window.opener && !window.opener.closed) {{
          window.opener.postMessage(payload, targetOrigin);
          window.close();
          return;
        }}
        window.location.replace(returnTo);
      }})();
    </script>
    <p>{'GitHub connection complete. You can close this window.' if ok else 'GitHub connection failed. You can close this window.'}</p>
  </body>
</html>
"""
    return HTMLResponse(body)


class GitHubOAuthService:
    def __init__(self, config: AppConfig):
        self.config = config

    def _require_enabled(self) -> None:
        if not self.config.github_oauth_enabled:
            raise GitHubAuthError(
                "github_oauth_not_configured",
                "GitHub OAuth is not configured on the backend",
            )

    def build_authorize_url(self, *, state: str) -> str:
        self._require_enabled()
        query = urlencode(
            {
                "client_id": self.config.github_oauth_client_id,
                "redirect_uri": self.config.github_oauth_redirect_url,
                "scope": " ".join(self.config.github_oauth_scopes),
                "state": state,
            }
        )
        return f"{GITHUB_AUTHORIZE_URL}?{query}"

    def exchange_code_for_user(self, *, code: str) -> GitHubUserProfile:
        self._require_enabled()
        headers = {
            "Accept": "application/json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        with httpx.Client(timeout=30) as client:
            token_response = client.post(
                GITHUB_ACCESS_TOKEN_URL,
                headers=headers,
                data={
                    "client_id": self.config.github_oauth_client_id,
                    "client_secret": self.config.github_oauth_client_secret,
                    "code": code,
                    "redirect_uri": self.config.github_oauth_redirect_url,
                },
            )
            if token_response.status_code >= 400:
                raise GitHubAuthError(
                    "github_token_exchange_failed",
                    f"GitHub token exchange failed with status {token_response.status_code}",
                )
            token_payload = token_response.json()
            access_token = token_payload.get("access_token")
            if not isinstance(access_token, str) or not access_token:
                raise GitHubAuthError("github_token_missing", "GitHub did not return an access token")
            scope_csv = str(token_payload.get("scope") or "")
            api_headers = {
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            }
            user_response = client.get(f"{GITHUB_API_ROOT}/user", headers=api_headers)
            if user_response.status_code >= 400:
                raise GitHubAuthError(
                    "github_user_fetch_failed",
                    f"GitHub user fetch failed with status {user_response.status_code}",
                )
            user_payload = user_response.json()
            email = user_payload.get("email")
            if not email:
                emails_response = client.get(f"{GITHUB_API_ROOT}/user/emails", headers=api_headers)
                if emails_response.status_code < 400:
                    emails_payload = emails_response.json()
                    if isinstance(emails_payload, list):
                        primary = next(
                            (
                                item.get("email")
                                for item in emails_payload
                                if isinstance(item, dict) and item.get("primary") and item.get("verified")
                            ),
                            None,
                        )
                        if primary is None:
                            primary = next(
                                (
                                    item.get("email")
                                    for item in emails_payload
                                    if isinstance(item, dict) and item.get("verified")
                                ),
                                None,
                            )
                        email = primary
        github_user_id = user_payload.get("id")
        login = user_payload.get("login")
        if not isinstance(github_user_id, int) or not isinstance(login, str) or not login:
            raise GitHubAuthError("github_user_invalid", "GitHub returned an invalid user profile")
        return GitHubUserProfile(
            github_user_id=github_user_id,
            login=login,
            name=user_payload.get("name"),
            email=email if isinstance(email, str) else None,
            avatar_url=user_payload.get("avatar_url"),
            profile_url=user_payload.get("html_url"),
            access_token=access_token,
            scope_csv=scope_csv,
        )


def upsert_github_identity(
    db: Session,
    *,
    profile: GitHubUserProfile,
    config: AppConfig,
) -> GitHubIdentity:
    identity = db.get(GitHubIdentity, profile.github_user_id)
    encrypted_token = encrypt_access_token(config, profile.access_token)
    if identity is None:
        identity = GitHubIdentity(
            github_user_id=profile.github_user_id,
            login=profile.login,
            name=profile.name,
            email=profile.email,
            avatar_url=profile.avatar_url,
            profile_url=profile.profile_url,
            access_token_encrypted=encrypted_token,
            scopes=profile.scope_csv,
        )
        db.add(identity)
        return identity
    identity.login = profile.login
    identity.name = profile.name
    identity.email = profile.email
    identity.avatar_url = profile.avatar_url
    identity.profile_url = profile.profile_url
    identity.access_token_encrypted = encrypted_token
    identity.scopes = profile.scope_csv
    return identity


def create_oauth_state(db: Session, *, return_to: str) -> GitHubOAuthState:
    oauth_state = GitHubOAuthState(
        state=secrets.token_urlsafe(32),
        return_to=return_to,
        expires_at=_utc_now() + timedelta(minutes=15),
    )
    db.add(oauth_state)
    return oauth_state


def consume_oauth_state(db: Session, *, state: str) -> GitHubOAuthState:
    oauth_state = db.get(GitHubOAuthState, state)
    if oauth_state is None:
        raise GitHubAuthError("github_state_not_found", "GitHub OAuth state was not found")
    if oauth_state.consumed_at is not None:
        raise GitHubAuthError("github_state_consumed", "GitHub OAuth state was already used")
    if _as_utc(oauth_state.expires_at) <= _utc_now():
        raise GitHubAuthError("github_state_expired", "GitHub OAuth state has expired")
    oauth_state.consumed_at = _utc_now()
    return oauth_state


def redact_token_for_log(token: str) -> str:
    if len(token) <= 8:
        return "***"
    return f"{token[:4]}***{token[-4:]}"


def append_log(log_path: Path, message: str) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(message.rstrip() + "\n")
