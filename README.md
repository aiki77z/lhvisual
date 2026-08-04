# LoopsBench

Project homepage for **LoopsBench: From Harness Engineering to Loop Engineering in Coding Agent Evaluation**.
This repository contains the static Vite + React + TypeScript website deployed to GitHub Pages.

[Live site](https://loopsbench.ai) · [Paper](https://arxiv.org/abs/2608.00267) · [Benchmark source](https://github.com/microsoft/Loopsbench)

## What lives here

- the public site in `src/`
- the static benchmark snapshot in `public/benchmarks-data/`
- the GitHub-native `Submit Task` contribution guide page

This repository does **not** contain the task-submission backend anymore.
Task contribution happens in `https://github.com/microsoft/Loopsbench` through:

- the Task Proposal issue form
- the contribution guide
- the task template
- benchmark task pull requests

## Local development

```bash
npm install
npm run generate:contribution
npm run generate:benchmarks
npm run dev
```

If you want to override the GitHub links used by the `Submit Task` page locally, set:

```bash
VITE_TASK_PROPOSAL_URL=...
VITE_CONTRIBUTING_GUIDE_URL=...
VITE_TASK_TEMPLATE_URL=...
VITE_EXAMPLE_TASK_URL=...
```

`npm run generate:benchmarks` rebuilds `public/benchmarks-data/` from the sibling `../tasks/` directory in the main LoopsBench workspace.
`npm run generate:contribution` refreshes the checked-in task-structure example from `../tasks/_template/`.

The contribution generator also supports:

- `LOOPSBENCH_CONTRIBUTION_TEMPLATE_ROOT`
- `LOOPSBENCH_CONTRIBUTION_OUTPUT_PATH`

## Tests

```bash
npm test
npm run build
```

The smoke test verifies that the `Submit Task` page stays GitHub-native:

- proposal link is present
- contribution guide link is present
- Pull Request flow is mentioned
- Discord is absent
- file-upload controls are absent

## GitHub Pages

This repo is configured for GitHub Pages through GitHub Actions.

### Publish steps

1. Push to `main`.
2. In GitHub, open `Settings -> Pages`.
3. Under `Build and deployment`, choose `GitHub Actions`.
4. Wait for the `Deploy Pages` workflow to finish.

### Optional build-time link configuration

The GitHub-native contribution page can optionally receive:

- `VITE_TASK_PROPOSAL_URL`
- `VITE_CONTRIBUTING_GUIDE_URL`
- `VITE_TASK_TEMPLATE_URL`
- `VITE_EXAMPLE_TASK_URL`
