from __future__ import annotations

import shutil
import stat
import tarfile
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath

import yaml

from submission_service.app.config import AppConfig
from submission_service.app.services.storage import clean_directory


class PreflightError(RuntimeError):
    def __init__(self, code: str, summary: str):
        super().__init__(summary)
        self.code = code
        self.summary = summary


@dataclass(frozen=True)
class PreflightResult:
    task_dir: Path
    file_count: int
    total_size_bytes: int


REQUIRED_NAMES = {
    "task.yaml",
    "Dockerfile",
    "docker-compose.yaml",
    "solution.sh",
    "run-tests.sh",
}


def _append_log(log_path: Path | None, message: str) -> None:
    if log_path is None:
        return
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as handle:
        handle.write(message.rstrip() + "\n")


def _normalized_member_path(raw_name: str) -> PurePosixPath:
    normalized = PurePosixPath(raw_name.lstrip("./"))
    if not normalized.parts:
        raise PreflightError("empty_archive_entry", "archive contains an empty path entry")
    if normalized.is_absolute():
        raise PreflightError("absolute_archive_path", f"archive entry {raw_name!r} uses an absolute path")
    if any(part in {"", ".", ".."} for part in normalized.parts):
        raise PreflightError("unsafe_archive_path", f"archive entry {raw_name!r} is not safe to extract")
    return normalized


def _validate_task_directory(task_dir: Path, expected_task_id: str) -> None:
    missing = sorted(name for name in REQUIRED_NAMES if not (task_dir / name).exists())
    if missing:
        raise PreflightError(
            "missing_required_files",
            f"task bundle is missing required files: {', '.join(missing)}",
        )
    tests_dir = task_dir / "tests"
    if not tests_dir.is_dir():
        raise PreflightError("missing_tests_dir", "task bundle must contain a tests/ directory")

    task_yaml_path = task_dir / "task.yaml"
    try:
        task_yaml = yaml.safe_load(task_yaml_path.read_text(encoding="utf-8")) or {}
    except Exception as exc:  # pragma: no cover - defensive
        raise PreflightError("invalid_task_yaml", f"failed to parse task.yaml: {exc}") from exc

    task_name = task_yaml.get("task_name")
    if task_name is not None and task_name != expected_task_id:
        raise PreflightError(
            "task_name_mismatch",
            f"task.yaml task_name must equal {expected_task_id!r}",
        )


def _extract_from_zip(
    archive_path: Path,
    destination: Path,
    *,
    config: AppConfig,
) -> tuple[int, int]:
    file_count = 0
    total_size = 0
    with zipfile.ZipFile(archive_path) as bundle:
        for info in bundle.infolist():
            member_path = _normalized_member_path(info.filename)
            mode = info.external_attr >> 16
            if stat.S_ISLNK(mode):
                raise PreflightError("symlink_not_allowed", f"zip entry {info.filename!r} is a symlink")
            if any(
                checker(mode)
                for checker in (stat.S_ISCHR, stat.S_ISBLK, stat.S_ISFIFO, stat.S_ISSOCK)
            ):
                raise PreflightError("special_file_not_allowed", f"zip entry {info.filename!r} is a special file")
            target = destination.joinpath(*member_path.parts)
            if info.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            file_count += 1
            total_size += info.file_size
            if file_count > config.max_archive_members:
                raise PreflightError("archive_too_large", "archive contains too many files")
            if total_size > config.max_extract_bytes:
                raise PreflightError("archive_too_large", "archive expands beyond the configured limit")
            target.parent.mkdir(parents=True, exist_ok=True)
            with bundle.open(info) as source, target.open("wb") as handle:
                shutil.copyfileobj(source, handle)
    return file_count, total_size


def _extract_from_tar(
    archive_path: Path,
    destination: Path,
    *,
    config: AppConfig,
) -> tuple[int, int]:
    file_count = 0
    total_size = 0
    with tarfile.open(archive_path, "r:*") as bundle:
        for member in bundle.getmembers():
            member_path = _normalized_member_path(member.name)
            if member.issym() or member.islnk():
                raise PreflightError("symlink_not_allowed", f"tar entry {member.name!r} is a link")
            if any((member.ischr(), member.isblk(), member.isfifo(), member.isdev())):
                raise PreflightError("special_file_not_allowed", f"tar entry {member.name!r} is a special file")
            target = destination.joinpath(*member_path.parts)
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            if not member.isfile():
                raise PreflightError("unsupported_tar_entry", f"tar entry {member.name!r} is not a regular file")
            file_count += 1
            total_size += member.size
            if file_count > config.max_archive_members:
                raise PreflightError("archive_too_large", "archive contains too many files")
            if total_size > config.max_extract_bytes:
                raise PreflightError("archive_too_large", "archive expands beyond the configured limit")
            target.parent.mkdir(parents=True, exist_ok=True)
            extracted = bundle.extractfile(member)
            if extracted is None:
                raise PreflightError("tar_extract_failed", f"could not extract {member.name!r}")
            with extracted, target.open("wb") as handle:
                shutil.copyfileobj(extracted, handle)
    return file_count, total_size


def extract_and_validate_bundle(
    archive_path: Path,
    *,
    archive_name: str,
    destination: Path,
    expected_task_id: str,
    config: AppConfig,
    log_path: Path | None = None,
) -> PreflightResult:
    if not expected_task_id.startswith("task_"):
        raise PreflightError("invalid_task_id", "task_id must start with 'task_'")
    clean_directory(destination)
    _append_log(log_path, f"preflight: archive={archive_name} expected_task_id={expected_task_id}")
    if archive_name.endswith(".zip"):
        file_count, total_size = _extract_from_zip(archive_path, destination, config=config)
    elif archive_name.endswith(".tar.gz") or archive_name.endswith(".tgz"):
        file_count, total_size = _extract_from_tar(archive_path, destination, config=config)
    else:
        raise PreflightError("unsupported_archive", "archive must be .zip, .tar.gz, or .tgz")

    top_level_entries = sorted(path for path in destination.iterdir())
    if len(top_level_entries) != 1 or not top_level_entries[0].is_dir():
        raise PreflightError(
            "invalid_top_level_layout",
            "archive must unpack to a single top-level task_<slug>/ directory",
        )
    task_dir = top_level_entries[0]
    if task_dir.name != expected_task_id:
        raise PreflightError(
            "task_id_mismatch",
            f"top-level directory name {task_dir.name!r} does not match task_id {expected_task_id!r}",
        )
    _validate_task_directory(task_dir, expected_task_id)
    _append_log(
        log_path,
        f"preflight: ok files={file_count} total_size_bytes={total_size} task_dir={task_dir}",
    )
    return PreflightResult(task_dir=task_dir, file_count=file_count, total_size_bytes=total_size)
