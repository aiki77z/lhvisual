from __future__ import annotations

import subprocess

from submission_service.app.services.github_pr import GitHubPRService
from submission_service.tests.conftest import build_test_config


def test_dry_run_compare_url_uses_fork_head_ref(tmp_path) -> None:
    repo_dir = tmp_path / "repo"
    repo_dir.mkdir()
    (repo_dir / "README.md").write_text("seed\n", encoding="utf-8")

    subprocess.run(["git", "init", "-b", "main"], cwd=repo_dir, check=True)
    subprocess.run(["git", "config", "user.name", "Tests"], cwd=repo_dir, check=True)
    subprocess.run(["git", "config", "user.email", "tests@example.com"], cwd=repo_dir, check=True)
    subprocess.run(["git", "add", "."], cwd=repo_dir, check=True)
    subprocess.run(["git", "commit", "-m", "seed"], cwd=repo_dir, check=True)

    (repo_dir / "tasks" / "task_demo").mkdir(parents=True)
    (repo_dir / "tasks" / "task_demo" / "task.yaml").write_text("task_name: task_demo\n", encoding="utf-8")

    config = build_test_config(
        tmp_path,
        process_inline=True,
        github_pr_dry_run=True,
        push_repo_owner="submission-bot",
        push_repo_name="Loopsbench",
    )

    result = GitHubPRService(config).create_pull_request(
        repo_dir=repo_dir,
        task_id="task_demo",
        submission_id="subm_123",
        author_name="Tester",
        author_email="tester@example.com",
        source_repo_url="https://example.com/source",
        source_commit_sha="abc123",
        oracle_run_id="oracle_1",
        oracle_results_path="artifacts/results.json",
        log_path=tmp_path / "github_pr.log",
    )

    assert result.dry_run is True
    assert result.pr_url.endswith("main...submission-bot:web-submission/task_demo-subm_123?expand=1")
