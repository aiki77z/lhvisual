from __future__ import annotations

from pathlib import Path


_CANDIDATE_CLI_PATHS = (
    Path("loopsbench") / "cli" / "main.py",
    Path("long_horizon_bench") / "cli" / "main.py",
)


def resolve_harness_cli_path(repo_dir: Path) -> Path:
    for relative_path in _CANDIDATE_CLI_PATHS:
        candidate = repo_dir / relative_path
        if candidate.exists():
            return candidate
    expected = " or ".join(str(path) for path in _CANDIDATE_CLI_PATHS)
    raise FileNotFoundError(f"target repository clone does not contain {expected}")
