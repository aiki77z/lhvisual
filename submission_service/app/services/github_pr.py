from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import httpx

from submission_service.app.config import AppConfig
from submission_service.app.services.command_runner import run_command


class PRCreationError(RuntimeError):
    def __init__(self, code: str, summary: str):
        super().__init__(summary)
        self.code = code
        self.summary = summary


@dataclass(frozen=True)
class PRResult:
    branch: str
    pr_number: int | None
    pr_url: str
    dry_run: bool


class GitHubPRService:
    def __init__(self, config: AppConfig):
        self.config = config

    def _head_ref(self, branch: str) -> str:
        if (
            self.config.push_repo_owner == self.config.target_repo_owner
            and self.config.push_repo_name == self.config.target_repo_name
        ):
            return branch
        return f"{self.config.push_repo_owner}:{branch}"

    def _pr_body(
        self,
        *,
        task_id: str,
        submission_id: str,
        author_name: str,
        author_email: str,
        source_repo_url: str,
        source_commit_sha: str,
        oracle_run_id: str,
        oracle_results_path: str | None,
    ) -> str:
        return "\n".join(
            [
                f"Automated web submission for `{task_id}`.",
                "",
                "Submission metadata:",
                f"- Submission id: `{submission_id}`",
                f"- Author: `{author_name}` <{author_email}>",
                f"- Source repo: {source_repo_url}",
                f"- Source commit: `{source_commit_sha}`",
                f"- Oracle run id: `{oracle_run_id}`",
                f"- Oracle results artifact: `{oracle_results_path or 'n/a'}`",
            ]
        )

    def create_pull_request(
        self,
        *,
        repo_dir: Path,
        task_id: str,
        submission_id: str,
        author_name: str,
        author_email: str,
        source_repo_url: str,
        source_commit_sha: str,
        oracle_run_id: str,
        oracle_results_path: str | None,
        log_path: Path,
    ) -> PRResult:
        branch = f"web-submission/{task_id}-{submission_id}"
        commit_message = f"feat(tasks): add {task_id} from web submission"
        run_command(["git", "config", "user.name", self.config.git_author_name], cwd=repo_dir, log_path=log_path)
        run_command(["git", "config", "user.email", self.config.git_author_email], cwd=repo_dir, log_path=log_path)

        checkout_result = run_command(
            ["git", "checkout", "-b", branch],
            cwd=repo_dir,
            log_path=log_path,
        )
        if checkout_result.returncode != 0:
            raise PRCreationError("git_checkout_failed", f"failed to create branch {branch}")

        add_result = run_command(
            ["git", "add", f"tasks/{task_id}"],
            cwd=repo_dir,
            log_path=log_path,
        )
        if add_result.returncode != 0:
            raise PRCreationError("git_add_failed", f"failed to stage tasks/{task_id}")

        commit_result = run_command(
            ["git", "commit", "-m", commit_message],
            cwd=repo_dir,
            log_path=log_path,
        )
        if commit_result.returncode != 0:
            raise PRCreationError("git_commit_failed", "failed to commit submission changes")

        head_ref = self._head_ref(branch)
        if self.config.github_pr_dry_run:
            compare_url = (
                f"{self.config.target_repo_html_url}/compare/"
                f"{self.config.target_base_branch}...{head_ref}?expand=1"
            )
            return PRResult(branch=branch, pr_number=None, pr_url=compare_url, dry_run=True)

        if not self.config.github_token:
            raise PRCreationError("missing_github_token", "GitHub token is required when dry-run mode is disabled")

        push_url = (
            f"https://x-access-token:{self.config.github_token}"
            f"@github.com/{self.config.push_repo_owner}/{self.config.push_repo_name}.git"
        )
        redacted_push_url = (
            "https://x-access-token:***"
            f"@github.com/{self.config.push_repo_owner}/{self.config.push_repo_name}.git"
        )
        push_result = run_command(
            ["git", "push", push_url, f"HEAD:refs/heads/{branch}"],
            cwd=repo_dir,
            log_path=log_path,
            redacted_args=["git", "push", redacted_push_url, f"HEAD:refs/heads/{branch}"],
        )
        if push_result.returncode != 0:
            raise PRCreationError("git_push_failed", f"failed to push branch {branch}")

        payload = {
            "title": f"Add {task_id} via web submission",
            "head": head_ref,
            "base": self.config.target_base_branch,
            "body": self._pr_body(
                task_id=task_id,
                submission_id=submission_id,
                author_name=author_name,
                author_email=author_email,
                source_repo_url=source_repo_url,
                source_commit_sha=source_commit_sha,
                oracle_run_id=oracle_run_id,
                oracle_results_path=oracle_results_path,
            ),
            "draft": True,
        }
        headers = {
            "Authorization": f"Bearer {self.config.github_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        with httpx.Client(timeout=60) as client:
            response = client.post(
                f"https://api.github.com/repos/{self.config.target_repo_owner}/{self.config.target_repo_name}/pulls",
                headers=headers,
                json=payload,
            )
        log_path.parent.mkdir(parents=True, exist_ok=True)
        with log_path.open("a", encoding="utf-8") as handle:
            handle.write(f"GitHub PR request payload:\n{json.dumps(payload, indent=2)}\n")
            handle.write(f"GitHub PR response status: {response.status_code}\n{response.text}\n")
        if response.status_code >= 400:
            raise PRCreationError(
                "github_pr_request_failed",
                f"GitHub returned {response.status_code} when creating the PR",
            )
        body = response.json()
        return PRResult(
            branch=branch,
            pr_number=int(body["number"]),
            pr_url=str(body["html_url"]),
            dry_run=False,
        )
