from __future__ import annotations

from redis import Redis
from rq import Queue, Worker

from submission_service.app.config import load_config


def run_worker() -> None:
    config = load_config()
    if config.process_inline:
        raise SystemExit(
            "SUBMISSION_PROCESS_INLINE is enabled; disable it before starting a standalone worker."
    )
    redis = Redis.from_url(config.redis_url)
    queue = Queue(config.queue_name, connection=redis)
    worker = Worker([queue], connection=redis)
    worker.work()


if __name__ == "__main__":
    run_worker()
