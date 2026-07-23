import type { SubmissionEvent } from "../../types/submission";

type SubmissionTimelineProps = {
  events: SubmissionEvent[];
};

export function SubmissionTimeline({ events }: SubmissionTimelineProps) {
  if (!events.length) {
    return <p className="submit-muted">No status updates yet.</p>;
  }

  return (
    <ol className="submission-timeline">
      {events.map((event, index) => (
        <li key={`${event.created_at}-${index}`} className="timeline-item">
          <div className="timeline-marker" aria-hidden="true" />
          <div>
            <div className="timeline-head">
              <strong>{event.status.replace(/_/g, " ")}</strong>
              <time dateTime={event.created_at}>
                {new Date(event.created_at).toLocaleString()}
              </time>
            </div>
            <p>{event.message}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
