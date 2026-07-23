from __future__ import annotations

import os
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence


@dataclass(frozen=True)
class CommandResult:
    args: tuple[str, ...]
    returncode: int
    stdout: str
    stderr: str
    cwd: str | None


def _append_log(log_path: Path | None, content: str) -> None:
    if log_path is None:
        return
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(content)


def run_command(
    args: Sequence[str],
    *,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    log_path: Path | None = None,
    redacted_args: Sequence[str] | None = None,
    timeout: int | None = None,
) -> CommandResult:
    display_args = tuple(redacted_args or args)
    _append_log(
        log_path,
        f"$ {' '.join(display_args)}\n"
        + (f"cwd={cwd}\n" if cwd else "")
        + "\n",
    )
    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)
    completed = subprocess.run(
        list(args),
        cwd=cwd,
        env=merged_env,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    _append_log(
        log_path,
        f"returncode={completed.returncode}\n"
        f"--- stdout ---\n{completed.stdout}\n"
        f"--- stderr ---\n{completed.stderr}\n",
    )
    return CommandResult(
        args=tuple(args),
        returncode=completed.returncode,
        stdout=completed.stdout,
        stderr=completed.stderr,
        cwd=str(cwd) if cwd else None,
    )
