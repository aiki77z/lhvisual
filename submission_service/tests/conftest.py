from __future__ import annotations

import sys
from pathlib import Path

import pytest

from submission_service.app.config import AppConfig


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
