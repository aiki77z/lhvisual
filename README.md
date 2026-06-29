# LoopsBench

Project homepage for **LoopsBench: From Harness Engineering to Loop Engineering in Coding Agent Evaluation**. Vite + React + TypeScript, single-page site (home, leaderboard, about) deployed to GitHub Pages.

## Local development

```bash
npm install
npm run dev
```

## GitHub Pages deployment

This repo is configured for GitHub Pages through GitHub Actions.

### How it works

- If the repository name is `your-name.github.io`, the app is built at the site root.
- If the repository name is anything else, the Vite `base` path is set automatically to `/<repo-name>/`.
- A `404.html` fallback is generated during build so direct visits to routes like `/blog/leaderboard-methodology` still work on GitHub Pages.

### Publish steps

1. Create a GitHub repository.
2. Add the remote:

```bash
git remote add origin https://github.com/<your-name>/<repo-name>.git
```

3. Commit and push:

```bash
git add .
git commit -m "Initial Longhorizenbench site"
git push -u origin main
```

4. In GitHub, open `Settings -> Pages`.
5. Under `Build and deployment`, choose `GitHub Actions`.
6. Wait for the `Deploy Pages` workflow to finish.

### Result URL

- User or org site repo: `https://<your-name>.github.io/`
- Project repo: `https://<your-name>.github.io/<repo-name>/`

### Optional custom base path

If you need to override the detected base path, set `VITE_BASE_PATH` when building.
