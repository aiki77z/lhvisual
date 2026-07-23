from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path


def _env_bool(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or not raw.strip():
        return default
    return int(raw)


def _env_list(name: str, default: list[str]) -> list[str]:
    raw = os.environ.get(name)
    if raw is None:
        return default
    values = [item.strip() for item in raw.split(",")]
    return [item for item in values if item]


def _discover_repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _default_python_executable(repo_root: Path) -> str:
    venv_python = repo_root / ".venv" / "bin" / "python"
    if venv_python.exists():
        return str(venv_python)
    return sys.executable


@dataclass(frozen=True)
class AppConfig:
    repo_root: Path
    artifacts_root: Path
    database_url: str
    redis_url: str
    queue_name: str
    process_inline: bool
    api_allowed_origins: list[str]
    max_upload_bytes: int
    max_extract_bytes: int
    max_archive_members: int
    max_active_submissions_per_email: int
    max_ip_submissions_per_window: int
    ip_rate_limit_window_sec: int
    target_repo_clone_url: str
    target_repo_owner: str
    target_repo_name: str
    target_repo_html_url: str
    target_base_branch: str
    push_repo_owner: str
    push_repo_name: str
    push_repo_html_url: str
    python_executable: str
    github_token: str | None
    github_pr_dry_run: bool
    git_author_name: str
    git_author_email: str
    oracle_docker_image_strategy: str
    oracle_docker_image_namespace: str | None
    oracle_docker_image_tag: str | None
    cleanup_completed_after_days: int
    cleanup_failed_after_days: int

    @property
    def submission_db_path(self) -> Path | None:
        prefix = "sqlite:///"
        if self.database_url.startswith(prefix):
            return Path(self.database_url[len(prefix) :])
        return None

    @classmethod
    def from_env(cls) -> "AppConfig":
        repo_root = Path(os.environ.get("SUBMISSION_REPO_ROOT", _discover_repo_root())).resolve()
        artifacts_root = Path(
            os.environ.get(
                "SUBMISSION_ARTIFACTS_ROOT",
                repo_root / "tmp" / "submission-service-artifacts",
            )
        ).resolve()
        database_url = os.environ.get(
            "SUBMISSION_DATABASE_URL",
            f"sqlite:///{artifacts_root / 'submission_service.db'}",
        )
        owner = os.environ.get("SUBMISSION_TARGET_REPO_OWNER", "microsoft")
        name = os.environ.get("SUBMISSION_TARGET_REPO_NAME", "Loopsbench")
        html_url = os.environ.get(
            "SUBMISSION_TARGET_REPO_HTML_URL",
            f"https://github.com/{owner}/{name}",
        )
        push_owner = os.environ.get("SUBMISSION_PUSH_REPO_OWNER", owner)
        push_name = os.environ.get("SUBMISSION_PUSH_REPO_NAME", name)
        push_html_url = os.environ.get(
            "SUBMISSION_PUSH_REPO_HTML_URL",
            f"https://github.com/{push_owner}/{push_name}",
        )
        return cls(
            repo_root=repo_root,
            artifacts_root=artifacts_root,
            database_url=database_url,
            redis_url=os.environ.get("SUBMISSION_REDIS_URL", "redis://localhost:6379/0"),
            queue_name=os.environ.get("SUBMISSION_QUEUE_NAME", "submission-jobs"),
            process_inline=_env_bool("SUBMISSION_PROCESS_INLINE", True),
            api_allowed_origins=_env_list("SUBMISSION_API_ALLOWED_ORIGINS", ["*"]),
            max_upload_bytes=_env_int("SUBMISSION_MAX_UPLOAD_BYTES", 1_073_741_824),
            max_extract_bytes=_env_int("SUBMISSION_MAX_EXTRACT_BYTES", 10_737_418_240),
            max_archive_members=_env_int("SUBMISSION_MAX_ARCHIVE_MEMBERS", 100_000),
            max_active_submissions_per_email=_env_int(
                "SUBMISSION_MAX_ACTIVE_PER_EMAIL",
                2,
            ),
            max_ip_submissions_per_window=_env_int(
                "SUBMISSION_MAX_PER_IP_WINDOW",
                10,
            ),
            ip_rate_limit_window_sec=_env_int(
                "SUBMISSION_IP_WINDOW_SEC",
                3600,
            ),
            target_repo_clone_url=os.environ.get(
                "SUBMISSION_TARGET_REPO_CLONE_URL",
                f"https://github.com/{owner}/{name}.git",
            ),
            target_repo_owner=owner,
            target_repo_name=name,
            target_repo_html_url=html_url,
            target_base_branch=os.environ.get("SUBMISSION_TARGET_BASE_BRANCH", "main"),
            push_repo_owner=push_owner,
            push_repo_name=push_name,
            push_repo_html_url=push_html_url,
            python_executable=os.environ.get(
                "SUBMISSION_PYTHON_EXECUTABLE",
                _default_python_executable(repo_root),
            ),
            github_token=os.environ.get("SUBMISSION_GITHUB_TOKEN"),
            github_pr_dry_run=_env_bool("SUBMISSION_GITHUB_PR_DRY_RUN", True),
            git_author_name=os.environ.get("SUBMISSION_GIT_AUTHOR_NAME", "LoopsBench Bot"),
            git_author_email=os.environ.get(
                "SUBMISSION_GIT_AUTHOR_EMAIL",
                "loopsbench-bot@example.com",
            ),
            oracle_docker_image_strategy=os.environ.get(
                "SUBMISSION_ORACLE_DOCKER_IMAGE_STRATEGY",
                "local-build",
            ),
            oracle_docker_image_namespace=os.environ.get(
                "SUBMISSION_ORACLE_DOCKER_IMAGE_NAMESPACE",
            ),
            oracle_docker_image_tag=os.environ.get(
                "SUBMISSION_ORACLE_DOCKER_IMAGE_TAG",
            ),
            cleanup_completed_after_days=_env_int(
                "SUBMISSION_CLEANUP_COMPLETED_DAYS",
                30,
            ),
            cleanup_failed_after_days=_env_int(
                "SUBMISSION_CLEANUP_FAILED_DAYS",
                14,
            ),
        )


def load_config() -> AppConfig:
    return AppConfig.from_env()
