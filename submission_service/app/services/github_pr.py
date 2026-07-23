from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from time import monotonic, sleep

import httpx

from submission_service.app.config import AppConfig
from submission_service.app.services.command_runner import run_command
from submission_service.app.services.github_auth import append_log, redact_token_for_log


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


@dataclass(frozen=True)
class ContributorGitHubAuth:
    github_login: str
    github_name: str | None
    github_email: str | None
    access_token: str


class GitHubPRService:
    def __init__(self, config: AppConfig):
        self.config = config

    def _headers(self, access_token: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    def _head_ref(self, *, branch: str, contributor_login: str, pushing_to_target_repo: bool) -> str:
        if pushing_to_target_repo:
            return branch
        return f"{contributor_login}:{branch}"

    def _request(
        self,
        client: httpx.Client,
        *,
        method: str,
        url: str,
        access_token: str,
        log_path: Path,
        **kwargs: object,
    ) -> httpx.Response:
        append_log(log_path, f"github {method} {url} as {redact_token_for_log(access_token)}")
        response = client.request(method, url, headers=self._headers(access_token), **kwargs)
        append_log(log_path, f"github response {response.status_code}: {response.text[:2000]}")
        return response

    def _ensure_contributor_fork(
        self,
        *,
        contributor: ContributorGitHubAuth,
        log_path: Path,
    ) -> tuple[str, str]:
        if contributor.github_login.lower() == self.config.target_repo_owner.lower():
            return self.config.target_repo_owner, self.config.target_repo_name

        repo_name = self.config.target_repo_name
        target_full_name = f"{self.config.target_repo_owner}/{repo_name}".lower()
        with httpx.Client(timeout=60) as client:
            existing = self._request(
                client,
                method="GET",
                url=f"https://api.github.com/repos/{contributor.github_login}/{repo_name}",
                access_token=contributor.access_token,
                log_path=log_path,
            )
            if existing.status_code == 200:
                payload = existing.json()
                parent_full_name = str(payload.get("parent", {}).get("full_name", "")).lower()
                if parent_full_name and parent_full_name != target_full_name:
                    raise PRCreationError(
                        "github_existing_repo_not_fork",
                        f"{contributor.github_login}/{repo_name} already exists but is not a fork of {target_full_name}",
                    )
                return contributor.github_login, repo_name
            if existing.status_code not in {403, 404}:
                raise PRCreationError(
                    "github_fork_lookup_failed",
                    f"GitHub returned {existing.status_code} when checking for the contributor fork",
                )

            fork_create = self._request(
                client,
                method="POST",
                url=f"https://api.github.com/repos/{self.config.target_repo_owner}/{repo_name}/forks",
                access_token=contributor.access_token,
                log_path=log_path,
            )
            if fork_create.status_code >= 400:
                raise PRCreationError(
                    "github_fork_create_failed",
                    f"GitHub returned {fork_create.status_code} when creating the contributor fork",
                )

            deadline = monotonic() + 90
            while monotonic() < deadline:
                probe = self._request(
                    client,
                    method="GET",
                    url=f"https://api.github.com/repos/{contributor.github_login}/{repo_name}",
                    access_token=contributor.access_token,
                    log_path=log_path,
                )
                if probe.status_code == 200:
                    return contributor.github_login, repo_name
                sleep(2)
            raise PRCreationError(
                "github_fork_timeout",
                f"Timed out waiting for fork {contributor.github_login}/{repo_name} to become available",
            )

    def _pr_body(
        self,
        *,
        task_id: str,
        submission_id: str,
        author_name: str,
        author_email: str,
        contributor_login: str,
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
                f"- GitHub contributor: `@{contributor_login}`",
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
        contributor: ContributorGitHubAuth,
        source_repo_url: str,
        source_commit_sha: str,
        oracle_run_id: str,
        oracle_results_path: str | None,
        log_path: Path,
    ) -> PRResult:
        branch = f"web-submission/{task_id}-{submission_id}"
        commit_message = f"feat(tasks): add {task_id} from web submission"
        commit_author_name = contributor.github_name or author_name or contributor.github_login
        commit_author_email = contributor.github_email or author_email or self.config.git_author_email
        run_command(["git", "config", "user.name", commit_author_name], cwd=repo_dir, log_path=log_path)
        run_command(["git", "config", "user.email", commit_author_email], cwd=repo_dir, log_path=log_path)

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

        head_ref = self._head_ref(
            branch=branch,
            contributor_login=contributor.github_login,
            pushing_to_target_repo=contributor.github_login.lower() == self.config.target_repo_owner.lower(),
        )
        if self.config.github_pr_dry_run:
            compare_url = (
                f"{self.config.target_repo_html_url}/compare/"
                f"{self.config.target_base_branch}...{head_ref}?expand=1"
            )
            return PRResult(branch=branch, pr_number=None, pr_url=compare_url, dry_run=True)

        fork_owner, fork_repo = self._ensure_contributor_fork(contributor=contributor, log_path=log_path)
        pushing_to_target_repo = fork_owner.lower() == self.config.target_repo_owner.lower()
        head_ref = self._head_ref(
            branch=branch,
            contributor_login=fork_owner,
            pushing_to_target_repo=pushing_to_target_repo,
        )
        push_url = f"https://x-access-token:{contributor.access_token}@github.com/{fork_owner}/{fork_repo}.git"
        redacted_push_url = f"https://x-access-token:***@github.com/{fork_owner}/{fork_repo}.git"
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
                contributor_login=fork_owner,
                source_repo_url=source_repo_url,
                source_commit_sha=source_commit_sha,
                oracle_run_id=oracle_run_id,
                oracle_results_path=oracle_results_path,
            ),
            "draft": True,
        }
        with httpx.Client(timeout=60) as client:
            response = client.post(
                f"https://api.github.com/repos/{self.config.target_repo_owner}/{self.config.target_repo_name}/pulls",
                headers=self._headers(contributor.access_token),
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
