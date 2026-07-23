# LoopsBench Submission Service

`submission_service/` provides the backend API and worker for the LoopsBench web task submission flow used by the `Submit Task` pages in this repository.

The service accepts complete task bundle archives, runs preflight checks, clones the target benchmark repository, validates the task with `loopsbench tasks validate`, runs Oracle, and opens a Draft PR from the submitter's own GitHub account only if Oracle passes.

## Layout

```text
submission_service/
  app/
    main.py                    # FastAPI app
    worker.py                  # RQ worker entrypoint
    api/routes/                # /api/v1 routes
    jobs/process_submission.py # Main async pipeline
    jobs/cleanup_submissions.py
    services/                  # Preflight, repo, oracle, GitHub helpers
  tests/
```

## Environment

Important settings:

- `SUBMISSION_PROCESS_INLINE`
  - `true` for local development and tests
  - `false` when running a separate Redis + RQ worker
- `SUBMISSION_ARTIFACTS_ROOT`
  - defaults to `tmp/submission-service-artifacts`
- `SUBMISSION_DATABASE_URL`
  - defaults to a SQLite file under the artifacts root
- `SUBMISSION_TARGET_REPO_CLONE_URL`
  - defaults to `https://github.com/microsoft/Loopsbench.git`
- `SUBMISSION_TARGET_REPO_OWNER`
  - defaults to `microsoft`
- `SUBMISSION_TARGET_REPO_NAME`
  - defaults to `Loopsbench`
- `SUBMISSION_TARGET_REPO_HTML_URL`
  - defaults to `https://github.com/<target-owner>/<target-name>`
- `SUBMISSION_TARGET_BASE_BRANCH`
  - defaults to `main`
- `SUBMISSION_PUSH_REPO_OWNER`
  - legacy field retained for backward compatibility
- `SUBMISSION_PUSH_REPO_NAME`
  - legacy field retained for backward compatibility
- `SUBMISSION_PUSH_REPO_HTML_URL`
  - legacy field retained for backward compatibility
- `SUBMISSION_PYTHON_EXECUTABLE`
  - Python interpreter used to run the cloned LoopsBench CLI
  - this interpreter must have the LoopsBench runtime dependencies available
- `SUBMISSION_GITHUB_PR_DRY_RUN`
  - defaults to `true`
  - when `false`, contributors must connect GitHub so the backend can fork + push + open PRs with their own accounts
- `SUBMISSION_GITHUB_OAUTH_CLIENT_ID`
  - GitHub OAuth app client id
- `SUBMISSION_GITHUB_OAUTH_CLIENT_SECRET`
  - GitHub OAuth app client secret
- `SUBMISSION_GITHUB_OAUTH_REDIRECT_URL`
  - backend callback URL, for example `https://api.loopsbench.ai/api/v1/github/callback`
- `SUBMISSION_GITHUB_OAUTH_SCOPES`
  - comma-separated GitHub OAuth scopes; for a public repo the default `public_repo,read:user,user:email` is sufficient
- `SUBMISSION_SESSION_SECRET`
  - random backend secret used to protect stored contributor access tokens
- `SUBMISSION_GITHUB_SESSION_COOKIE_SECURE`
  - set to `true` in production HTTPS deployments; set to `false` for local HTTP development
- `SUBMISSION_ORACLE_DOCKER_IMAGE_STRATEGY`
  - defaults to `local-build` for uploaded task bundles
  - set this to `remote` only if the host has access to the published task image namespace/tag
- `SUBMISSION_ORACLE_DOCKER_IMAGE_NAMESPACE`
  - required when using `SUBMISSION_ORACLE_DOCKER_IMAGE_STRATEGY=remote`
- `SUBMISSION_ORACLE_DOCKER_IMAGE_TAG`
  - optional tag override for remote task images
- `SUBMISSION_API_ALLOWED_ORIGINS`
  - comma-separated CORS allowlist, for example `https://yourname.github.io`

## Install

This service has its own dependency manifest. From the `lhvisual/` repository root:

```bash
cd /sdb-disk/lih/lh/Long-Horizon-Bench/lhvisual
python3 -m venv .venv-submission
. .venv-submission/bin/activate
pip install -e ./submission_service[dev,runner]
```

If Oracle should run with a different interpreter than the one hosting FastAPI, set:

```bash
export SUBMISSION_PYTHON_EXECUTABLE=/abs/path/to/loopsbench-env/bin/python
```

If you prefer not to install it as a package yet, set `PYTHONPATH` to the repository root before starting the service.

## Run The API

Local development, inline mode:

```bash
cd /sdb-disk/lih/lh/Long-Horizon-Bench/lhvisual
export SUBMISSION_PROCESS_INLINE=true
export SUBMISSION_GITHUB_PR_DRY_RUN=true
export SUBMISSION_API_ALLOWED_ORIGINS=http://localhost:5173
python -m uvicorn submission_service.app.main:app --reload --host 0.0.0.0 --port 8000
```

This starts the API only. If you keep `SUBMISSION_PROCESS_INLINE=true`, requests are processed in-process. That is good enough for development and tests.

## Run A Separate Worker

Worker mode:

```bash
cd /sdb-disk/lih/lh/Long-Horizon-Bench/lhvisual
export SUBMISSION_PROCESS_INLINE=false
export SUBMISSION_REDIS_URL=redis://localhost:6379/0
python -m submission_service.app.worker
```

## Local host deployment

For a simple single-machine deployment from this repository:

```bash
cd /sdb-disk/lih/lh/Long-Horizon-Bench/lhvisual
cp .env.submission.example .env.submission
# edit .env.submission
ops/setup_submission_env.sh
ops/sync_local_target_repo.sh
ops/install_submission_systemd.sh
ops/status_submission_stack.sh
```

`ops/install_submission_systemd.sh` installs user-level `systemd` services for the API and worker with automatic restart. After installation, `ops/start_submission_stack.sh` and `ops/stop_submission_stack.sh` control those services.

If you need an HTTPS URL for GitHub Pages to call, start the quick tunnel:

```bash
ops/start_submission_tunnel.sh
grep -o 'https://[-a-z0-9.]*trycloudflare.com' runtime/logs/submission-tunnel.log
```

Important deployment caveats:

- A real PR requires GitHub OAuth to be configured so contributors can connect their own accounts.
- For a public upstream repo, contributors need scopes that allow fork + push + PR creation. For a private upstream repo, contributors also need direct access to that private repository.
- The GitHub Pages repository build should receive the API URL through `VITE_SUBMISSION_API_BASE`. If it is unset, the production site on `loopsbench.ai` / `www.loopsbench.ai` falls back at runtime to `https://api.loopsbench.ai`.

## Cleanup Old Artifacts

```bash
cd /sdb-disk/lih/lh/Long-Horizon-Bench/lhvisual
python - <<'PY'
from submission_service.app.jobs.cleanup_submissions import run_cleanup
print(run_cleanup())
PY
```

## Frontend Integration

Set the LoopsBench site build to point at the API:

```bash
cd /sdb-disk/lih/lh/Long-Horizon-Bench/lhvisual
export VITE_SUBMISSION_API_BASE=http://localhost:8000
npm run dev
```

For GitHub Pages or any other static deployment, `VITE_SUBMISSION_API_BASE` should point at a separately hosted API service. Pages cannot run the FastAPI backend. The checked-in frontend also contains a production-only runtime fallback from `loopsbench.ai` / `www.loopsbench.ai` to `https://api.loopsbench.ai`.

## Verification

The backend test suite includes:

- archive preflight checks
- inline end-to-end submission processing using a local fake target repository

Run:

```bash
cd /sdb-disk/lih/lh/Long-Horizon-Bench/lhvisual
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 python -m pytest submission_service/tests -q
```
