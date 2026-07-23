# LoopsBench

Project homepage for **LoopsBench: From Harness Engineering to Loop Engineering in Coding Agent Evaluation**. Vite + React + TypeScript, single-page site (home, run guide and replay, leaderboard, about) deployed to GitHub Pages.

This repo now contains two pieces:

- the static Vite + React + TypeScript site in `src/`
- the task-submission backend in `submission_service/`

## Local frontend development

```bash
npm install
npm run dev
```

If you want the submit-task page to talk to a local backend, set `VITE_SUBMISSION_API_BASE=http://localhost:8000`.

## Task submission backend

The backend API and worker live in `submission_service/`. It powers the web flow that accepts a task bundle, runs validation and Oracle, and opens a PR after Oracle passes.

Quick local startup:

```bash
python3 -m venv .venv-submission
. .venv-submission/bin/activate
pip install -e ./submission_service[dev,runner]

export SUBMISSION_PROCESS_INLINE=true
export SUBMISSION_API_ALLOWED_ORIGINS=http://localhost:5173
export SUBMISSION_GITHUB_PR_DRY_RUN=true
python -m uvicorn submission_service.app.main:app --reload --host 0.0.0.0 --port 8000
```

Important runtime note:

- GitHub Pages only serves the frontend. The backend must run as a separate process on a VM, container, or bare-metal host.
- Oracle and `loopsbench tasks validate` need a Python interpreter with LoopsBench runtime dependencies available. If the backend virtualenv does not have those dependencies, point `SUBMISSION_PYTHON_EXECUTABLE` at a different interpreter that does.

See `submission_service/README.md` for the backend environment variables and worker mode.

## Single-machine deployment

This repo now includes host-side ops scripts in `ops/` for a practical single-machine deployment:

```bash
cp .env.submission.example .env.submission
# edit .env.submission

ops/setup_submission_env.sh
ops/sync_local_target_repo.sh
ops/install_submission_systemd.sh
ops/status_submission_stack.sh
```

The `install_submission_systemd.sh` script installs and enables user-level `systemd` services with automatic restart for the API and worker. After that, `ops/start_submission_stack.sh`, `ops/stop_submission_stack.sh`, and `ops/status_submission_stack.sh` operate through `systemd`.

Optional HTTPS public tunnel for the API:

```bash
ops/start_submission_tunnel.sh
```

Then copy the `https://...trycloudflare.com` URL from `runtime/logs/submission-tunnel.log` and use it as `VITE_SUBMISSION_API_BASE` in your frontend build.

## GitHub Pages deployment

This repo is configured for GitHub Pages through GitHub Actions.

### How it works

- If the repository name is `your-name.github.io`, the app is built at the site root.
- If the repository name is anything else, the Vite `base` path is set automatically to `/<repo-name>/`.
- A `404.html` fallback is generated during build so direct visits to routes like `/submit` still work on GitHub Pages.

### Publish steps

1. Create a GitHub repository.
2. Add the remote:

```bash
git remote add origin https://github.com/<your-name>/<repo-name>.git
```

3. Commit and push:

```bash
git add .
git commit -m "Add LoopsBench site and submission backend"
git push -u origin main
```

4. In GitHub, open `Settings -> Pages`.
5. Under `Build and deployment`, choose `GitHub Actions`.
6. Wait for the `Deploy Pages` workflow to finish.

For the submit-task feature to work on GitHub Pages, the repository build should receive a real API base URL through the repository variable `VITE_SUBMISSION_API_BASE`. If that variable is unset, the production site on `loopsbench.ai` / `www.loopsbench.ai` falls back at runtime to `https://api.loopsbench.ai`.

### Result URL

- User or org site repo: `https://<your-name>.github.io/`
- Project repo: `https://<your-name>.github.io/<repo-name>/`

### Optional custom base path

If you need to override the detected base path, set `VITE_BASE_PATH` when building.
