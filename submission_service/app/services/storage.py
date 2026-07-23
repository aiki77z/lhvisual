from __future__ import annotations

import hashlib
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO

from submission_service.app.config import AppConfig


class StorageError(RuntimeError):
    pass


@dataclass(frozen=True)
class StoredArchive:
    filename: str
    sha256: str
    size_bytes: int
    path: Path


@dataclass(frozen=True)
class SubmissionPaths:
    root: Path
    upload_dir: Path
    upload_archive: Path
    extracted_dir: Path
    logs_dir: Path
    work_dir: Path
    repo_dir: Path
    oracle_dir: Path


def submission_paths(config: AppConfig, submission_id: str) -> SubmissionPaths:
    root = config.artifacts_root / "submissions" / submission_id
    return SubmissionPaths(
        root=root,
        upload_dir=root / "upload",
        upload_archive=root / "upload" / "archive.bin",
        extracted_dir=root / "extracted",
        logs_dir=root / "logs",
        work_dir=root / "work",
        repo_dir=root / "work" / "repo",
        oracle_dir=root / "oracle",
    )


def ensure_submission_dirs(paths: SubmissionPaths) -> None:
    for candidate in (
        paths.upload_dir,
        paths.extracted_dir,
        paths.logs_dir,
        paths.work_dir,
        paths.oracle_dir,
    ):
        candidate.mkdir(parents=True, exist_ok=True)


def store_upload(
    source: BinaryIO,
    destination: Path,
    *,
    filename: str,
    max_bytes: int,
) -> StoredArchive:
    hasher = hashlib.sha256()
    bytes_written = 0
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("wb") as handle:
        while True:
            chunk = source.read(1024 * 1024)
            if not chunk:
                break
            bytes_written += len(chunk)
            if bytes_written > max_bytes:
                raise StorageError("uploaded archive exceeds configured size limit")
            hasher.update(chunk)
            handle.write(chunk)
    return StoredArchive(
        filename=filename,
        sha256=hasher.hexdigest(),
        size_bytes=bytes_written,
        path=destination,
    )


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def list_logs(paths: SubmissionPaths) -> list[str]:
    if not paths.logs_dir.exists():
        return []
    return sorted(item.name for item in paths.logs_dir.iterdir() if item.is_file())


def relative_artifact_path(config: AppConfig, path: Path | None) -> str | None:
    if path is None:
        return None
    try:
        return str(path.relative_to(config.artifacts_root))
    except ValueError:
        return str(path)


def clean_directory(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)
