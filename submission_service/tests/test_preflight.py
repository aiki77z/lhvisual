from __future__ import annotations

import stat
import zipfile
from pathlib import Path

import pytest

from submission_service.app.services.preflight import PreflightError, extract_and_validate_bundle


def _write_valid_task_tree(root: Path, task_id: str) -> None:
    task_dir = root / task_id
    (task_dir / "tests").mkdir(parents=True)
    (task_dir / "task.yaml").write_text(f"task_name: {task_id}\n", encoding="utf-8")
    for name in ("Dockerfile", "docker-compose.yaml", "solution.sh", "run-tests.sh"):
        (task_dir / name).write_text("# test\n", encoding="utf-8")
    (task_dir / "tests" / "test_outputs.py").write_text("def test_ok():\n    assert True\n", encoding="utf-8")


def test_extract_and_validate_bundle_accepts_valid_zip(tmp_path: Path, test_config) -> None:
    task_id = "task_valid_bundle"
    staging = tmp_path / "staging"
    _write_valid_task_tree(staging, task_id)
    archive_path = tmp_path / "bundle.zip"
    with zipfile.ZipFile(archive_path, "w") as bundle:
        for file_path in (staging / task_id).rglob("*"):
            if file_path.is_dir():
                continue
            bundle.write(file_path, file_path.relative_to(staging))

    result = extract_and_validate_bundle(
        archive_path,
        archive_name="bundle.zip",
        destination=tmp_path / "extract",
        expected_task_id=task_id,
        config=test_config,
    )

    assert result.task_dir.name == task_id
    assert (result.task_dir / "task.yaml").is_file()
    assert result.file_count >= 6


def test_extract_and_validate_bundle_allows_missing_task_name(tmp_path: Path, test_config) -> None:
    task_id = "task_missing_task_name"
    staging = tmp_path / "staging"
    _write_valid_task_tree(staging, task_id)
    (staging / task_id / "task.yaml").write_text("instruction: sample\n", encoding="utf-8")
    archive_path = tmp_path / "bundle.zip"
    with zipfile.ZipFile(archive_path, "w") as bundle:
        for file_path in (staging / task_id).rglob("*"):
            if file_path.is_dir():
                continue
            bundle.write(file_path, file_path.relative_to(staging))

    result = extract_and_validate_bundle(
        archive_path,
        archive_name="bundle.zip",
        destination=tmp_path / "extract",
        expected_task_id=task_id,
        config=test_config,
    )

    assert result.task_dir.name == task_id


def test_extract_and_validate_bundle_rejects_zip_symlink(tmp_path: Path, test_config) -> None:
    archive_path = tmp_path / "bundle.zip"
    with zipfile.ZipFile(archive_path, "w") as bundle:
        info = zipfile.ZipInfo("task_bad_bundle/link")
        info.external_attr = (stat.S_IFLNK | 0o777) << 16
        bundle.writestr(info, "task_bad_bundle/task.yaml")

    with pytest.raises(PreflightError) as exc_info:
        extract_and_validate_bundle(
            archive_path,
            archive_name="bundle.zip",
            destination=tmp_path / "extract",
            expected_task_id="task_bad_bundle",
            config=test_config,
        )

    assert exc_info.value.code == "symlink_not_allowed"
