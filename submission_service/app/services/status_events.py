from __future__ import annotations

from submission_service.app.models import Submission, SubmissionEvent, utc_now


def append_event(
    submission: Submission,
    status: str,
    message: str,
) -> SubmissionEvent:
    submission.status = status
    submission.updated_at = utc_now()
    event = SubmissionEvent(submission_id=submission.id, status=status, message=message)
    submission.events.append(event)
    return event


def mark_error(
    submission: Submission,
    *,
    status: str,
    error_code: str,
    error_summary: str,
    event_message: str,
) -> SubmissionEvent:
    submission.error_code = error_code
    submission.error_summary = error_summary
    return append_event(submission, status, event_message)
