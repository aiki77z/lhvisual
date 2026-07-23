from __future__ import annotations

import subprocess
import zipfile
from pathlib import Path

from fastapi.testclient import TestClient

from submission_service.app.main import create_app
from submission_service.tests.conftest import build_test_config


def _seed_target_repo(repo_dir: Path) -> None:
    (repo_dir / "tasks").mkdir(parents=True)
    cli_dir = repo_dir / "loopsbench" / "cli"
    cli_dir.mkdir(parents=True)
    (repo_dir / "loopsbench" / "__init__.py").write_text("", encoding="utf-8")
    (cli_dir / "__init__.py").write_text("", encoding="utf-8")
    (cli_dir / "main.py").write_text(
        """
import json
import pathlib
import sys


def main() -> int:
    args = sys.argv[1:]
    if args[:2] == ["tasks", "validate"]:
        task_id = args[args.index("--task-id") + 1]
        task_dir = pathlib.Path("tasks") / task_id
        return 0 if (task_dir / "task.yaml").exists() else 1
    if args and args[0] == "run":
        task_id = args[args.index("--task-id") + 1]
        output_path = pathlib.Path(args[args.index("--output-path") + 1])
        run_dir = output_path / "fake-run"
        run_dir.mkdir(parents=True, exist_ok=True)
        payload = {"id": "fake-run", "results": [{"task_id": task_id, "is_resolved": True}]}
        (run_dir / "results.json").write_text(json.dumps(payload), encoding="utf-8")
        print("oracle ok")
        return 0
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
""".strip()
        + "\n",
        encoding="utf-8",
    )
    subprocess.run(["git", "init", "-b", "main"], cwd=repo_dir, check=True)
    subprocess.run(["git", "config", "user.name", "Tests"], cwd=repo_dir, check=True)
    subprocess.run(["git", "config", "user.email", "tests@example.com"], cwd=repo_dir, check=True)
    subprocess.run(["git", "add", "."], cwd=repo_dir, check=True)
    subprocess.run(["git", "commit", "-m", "seed"], cwd=repo_dir, check=True)


def _build_valid_archive(tmp_path: Path, task_id: str) -> Path:
    root = tmp_path / "bundle"
    task_dir = root / task_id
    (task_dir / "tests").mkdir(parents=True)
    (task_dir / "task.yaml").write_text(f"task_name: {task_id}\n", encoding="utf-8")
    for name in ("Dockerfile", "docker-compose.yaml", "solution.sh", "run-tests.sh"):
        (task_dir / name).write_text("# test\n", encoding="utf-8")
    (task_dir / "tests" / "test_outputs.py").write_text("def test_ok():\n    assert True\n", encoding="utf-8")

    archive_path = tmp_path / f"{task_id}.zip"
    with zipfile.ZipFile(archive_path, "w") as bundle:
        for file_path in task_dir.rglob("*"):
            if file_path.is_dir():
                continue
            bundle.write(file_path, file_path.relative_to(root))
    return archive_path


def test_submission_api_processes_bundle_inline(tmp_path: Path) -> None:
    target_repo = tmp_path / "target-repo"
    target_repo.mkdir()
    _seed_target_repo(target_repo)
    config = build_test_config(
        tmp_path,
        target_repo_clone_url=str(target_repo),
        process_inline=True,
        github_pr_dry_run=True,
    )
    client = TestClient(create_app(config))
    archive_path = _build_valid_archive(tmp_path, "task_inline_submission")

    with archive_path.open("rb") as handle:
        response = client.post(
            "/api/v1/submissions",
            data={
                "task_id": "task_inline_submission",
                "author_name": "Tester",
                "author_email": "tester@example.com",
                "source_repo_url": "https://example.com/source",
                "source_commit_sha": "abc123",
                "summary": "A dry-run inline submission.",
                "declaration_accepted": "true",
            },
            files={"archive": (archive_path.name, handle, "application/zip")},
        )

    assert response.status_code == 201, response.text
    submission_id = response.json()["id"]

    status_response = client.get(f"/api/v1/submissions/{submission_id}")
    assert status_response.status_code == 200, status_response.text
    payload = status_response.json()
    assert payload["status"] == "completed"
    assert payload["oracle_is_resolved"] is True
    assert payload["pr_url"].startswith("https://github.com/microsoft/Loopsbench/compare/")
    assert any(event["status"] == "completed" for event in payload["events"])
    assert {log["name"] for log in payload["logs"]} >= {
        "preflight.log",
        "repo_prepare.log",
        "oracle.stdout.log",
        "github_pr.log",
    }


def test_submission_api_rejects_honeypot_and_persists_ip_rate_limit(tmp_path: Path) -> None:
    target_repo = tmp_path / "target-repo"
    target_repo.mkdir()
    _seed_target_repo(target_repo)
    config = build_test_config(
        tmp_path,
        target_repo_clone_url=str(target_repo),
        process_inline=True,
        github_pr_dry_run=True,
        max_ip_submissions_per_window=1,
    )
    client = TestClient(create_app(config))

    first_archive = _build_valid_archive(tmp_path, "task_ip_limit_one")
    with first_archive.open("rb") as handle:
        first = client.post(
            "/api/v1/submissions",
            data={
                "task_id": "task_ip_limit_one",
                "author_name": "Tester",
                "author_email": "tester-one@example.com",
                "source_repo_url": "https://example.com/source-one",
                "source_commit_sha": "abc123",
                "summary": "First submission.",
                "declaration_accepted": "true",
            },
            files={"archive": (first_archive.name, handle, "application/zip")},
        )
    assert first.status_code == 201, first.text

    honeypot_archive = _build_valid_archive(tmp_path, "task_honeypot_trip")
    with honeypot_archive.open("rb") as handle:
        trapped = client.post(
            "/api/v1/submissions",
            data={
                "task_id": "task_honeypot_trip",
                "author_name": "Bot",
                "author_email": "bot@example.com",
                "source_repo_url": "https://example.com/bot",
                "source_commit_sha": "def456",
                "summary": "Should be rejected.",
                "declaration_accepted": "true",
                "website": "https://spam.invalid",
            },
            files={"archive": (honeypot_archive.name, handle, "application/zip")},
        )
    assert trapped.status_code == 400, trapped.text
    assert trapped.json()["detail"] == "submission rejected"

    second_archive = _build_valid_archive(tmp_path, "task_ip_limit_two")
    with second_archive.open("rb") as handle:
        limited = client.post(
            "/api/v1/submissions",
            data={
                "task_id": "task_ip_limit_two",
                "author_name": "Tester",
                "author_email": "tester-two@example.com",
                "source_repo_url": "https://example.com/source-two",
                "source_commit_sha": "fedcba",
                "summary": "Second submission should hit IP limit.",
                "declaration_accepted": "true",
            },
            files={"archive": (second_archive.name, handle, "application/zip")},
        )
    assert limited.status_code == 429, limited.text
    assert limited.json()["detail"] == "submission rate limit exceeded for this IP"
