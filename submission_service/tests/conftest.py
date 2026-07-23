from __future__ import annotations

import sys
from datetime import timedelta
from pathlib import Path

import pytest

from submission_service.app.config import AppConfig
from submission_service.app.models import GitHubIdentity, GitHubSession, utc_now
from submission_service.app.services.github_auth import encrypt_access_token, hash_session_token


def build_test_config(
    tmp_path: Path,
    *,
    target_repo_clone_url: str = "",
    process_inline: bool = True,
    github_pr_dry_run: bool = True,
    push_repo_owner: str = "microsoft",
    push_repo_name: str = "Loopsbench",
    oracle_docker_image_strategy: str = "local-build",
    oracle_docker_image_namespace: str | None = None,
    oracle_docker_image_tag: str | None = None,
    max_ip_submissions_per_window: int = 100,
    ip_rate_limit_window_sec: int = 3600,
) -> AppConfig:
    artifacts_root = tmp_path / "artifacts"
    return AppConfig(
        repo_root=tmp_path,
        artifacts_root=artifacts_root,
        database_url=f"sqlite:///{artifacts_root / 'submission_service.db'}",
        redis_url="redis://localhost:6379/0",
        queue_name="submission-jobs",
        process_inline=process_inline,
        api_allowed_origins=["*"],
        max_upload_bytes=10_000_000,
        max_extract_bytes=50_000_000,
        max_archive_members=10_000,
        max_active_submissions_per_email=2,
        max_ip_submissions_per_window=max_ip_submissions_per_window,
        ip_rate_limit_window_sec=ip_rate_limit_window_sec,
        target_repo_clone_url=target_repo_clone_url,
        target_repo_owner="microsoft",
        target_repo_name="Loopsbench",
        target_repo_html_url="https://github.com/microsoft/Loopsbench",
        target_base_branch="main",
        push_repo_owner=push_repo_owner,
        push_repo_name=push_repo_name,
        push_repo_html_url=f"https://github.com/{push_repo_owner}/{push_repo_name}",
        python_executable=sys.executable,
        github_token=None,
        github_pr_dry_run=github_pr_dry_run,
        github_oauth_client_id="test-client-id",
        github_oauth_client_secret="test-client-secret",
        github_oauth_redirect_url="https://api.example.test/api/v1/github/callback",
        github_oauth_scopes=["public_repo", "read:user", "user:email"],
        github_session_cookie_name="loopsbench_test_github_session",
        github_session_ttl_sec=60 * 60,
        github_session_cookie_secure=False,
        session_secret="test-session-secret",
        git_author_name="LoopsBench Bot",
        git_author_email="loopsbench-bot@example.com",
        oracle_docker_image_strategy=oracle_docker_image_strategy,
        oracle_docker_image_namespace=oracle_docker_image_namespace,
        oracle_docker_image_tag=oracle_docker_image_tag,
        cleanup_completed_after_days=30,
        cleanup_failed_after_days=14,
    )


@pytest.fixture
def test_config(tmp_path: Path) -> AppConfig:
    return build_test_config(tmp_path)


def seed_github_session(session_factory, config: AppConfig, *, login: str = "contributor", email: str | None = "contributor@example.com"):
    raw_session_token = "test-github-session-token"
    with session_factory() as session:
        session.add(
            GitHubIdentity(
                github_user_id=123456,
                login=login,
                name="Contributor",
                email=email,
                avatar_url="https://avatars.example.test/contributor.png",
                profile_url=f"https://github.com/{login}",
                access_token_encrypted=encrypt_access_token(config, "gho_test_contributor_token"),
                scopes="public_repo,read:user,user:email",
            )
        )
        session.add(
            GitHubSession(
                session_token_hash=hash_session_token(raw_session_token),
                github_user_id=123456,
                expires_at=utc_now() + timedelta(hours=1),
            )
        )
        session.commit()
    return raw_session_token
