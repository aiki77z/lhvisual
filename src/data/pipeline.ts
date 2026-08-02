export const pipelineFacts = [
  {
    label: "Execution scope",
    value: "Multi-language",
    detail:
      "The pipeline builds execution profiles and language adapters instead of assuming a single repository stack.",
  },
  {
    label: "Chain shape",
    value: "Long PR chains",
    detail:
      "A single exported task can cover a substantial landed PR chain rather than a tiny fixed window.",
  },
  {
    label: "Export unit",
    value: "1 PR = 1 unit",
    detail:
      "Public export is PR-centric: one PR maps to one requirement, one patch, and one test directory.",
  },
  {
    label: "Task export",
    value: "Slim task tree",
    detail:
      "The public task stays lean and runner-facing instead of exposing the full internal pipeline artifact set.",
  },
] as const;

export const pipelineFlowStages = [
  {
    title: "Repository intake and normalization",
    detail:
      "Select an open-source repository, recover landed PR facts on the default branch, and build the execution profile that drives later replay and testing.",
    outputs: ["RepoRecord", "ExecutionProfile"],
  },
  {
    title: "Chain construction and trim",
    detail:
      "Construct long candidate chains, trim them at PR granularity, and keep a stable replayable chain with auditable evidence and checkpoints.",
    outputs: ["CandidateChain", "StablePatchChain"],
  },
  {
    title: "PR-centric task export",
    detail:
      "Author semantic requirements, emit PR-numbered patches and tests, validate the task, and export a slim LoopsBench-compatible task tree.",
    outputs: ["requirements/<slug>.yaml", "task_<id>/"],
  },
] as const;

export const pipelineReleaseNote =
  "Coming soon";
