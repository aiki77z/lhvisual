export type CaseNodeStatus = "done" | "running" | "testing" | "ready" | "locked";

export type CaseDagNode = {
  id: string;
  label: string;
  layer: number;
  file: string;
  summary: string;
  status: CaseNodeStatus;
};

export type CaseDagEdge = {
  from: string;
  to: string;
  label: string;
};

export type TerminalEvent = {
  at: string;
  lane: "agent" | "verifier";
  text: string;
  nodeId?: string;
  level?: "info" | "success" | "warning" | "error";
};

export type ReplayStep = {
  at: string;
  title: string;
  detail: string;
  activeNodeId?: string;
  statuses: Partial<Record<string, CaseNodeStatus>>;
};

export const caseSummary = {
  slug: "task_monogame_math2d_medium",
  title: "MonoGame Math Arena",
  difficulty: "medium",
  category: "systems",
  units: 12,
  layers: 4,
  timeout: "2h agent / 20m tests",
  model: "gpt-5.4-20260305",
  result: "7/7 passed",
  commits: ["b80a084", "93b2078", "9d92308", "3fef057"],
  trajectory:
    "tmp/monogame_real_agent_gpt54_local_20260720T141428Z/run/trajectories/plain_openai_agent.jsonl",
  cast:
    "tmp/monogame_real_agent_gpt54_local_20260720T141428Z_replay/recordings/monogame_gpt54_real_replay.cast",
  castHref: "/cases/task_monogame_math2d_medium/monogame_gpt54_real_replay.cast",
  description:
    "A real gpt-5.4 run replay for a long-horizon MonoGame repair task. The agent docker completes the final four requirement units, while the verifier docker rebuilds the project and confirms the official host-wrapped acceptance suite.",
};

export const caseDagNodes: CaseDagNode[] = [
  {
    id: "point_fix",
    label: "Point.ToVector2",
    layer: 0,
    file: "MonoGame.Framework/Point.cs",
    summary: "Fixes a coordinate swap that transposes probe locations.",
    status: "done",
  },
  {
    id: "rectangle_math",
    label: "Rectangle",
    layer: 0,
    file: "MonoGame.Framework/Rectangle.cs",
    summary: "Restores containment, intersection, union, offset, and equality behavior.",
    status: "done",
  },
  {
    id: "replay_io",
    label: "ReplayIO",
    layer: 0,
    file: "game_project/ReplayIO.cs",
    summary: "Loads replay JSON instead of returning an empty document.",
    status: "done",
  },
  {
    id: "mathhelper",
    label: "MathHelper",
    layer: 0,
    file: "MonoGame.Framework/MathHelper.cs",
    summary: "Implements interpolation, clamps, distance, angle wrapping, and power-of-two utilities.",
    status: "done",
  },
  {
    id: "vector3_math",
    label: "Vector3",
    layer: 1,
    file: "MonoGame.Framework/Vector3.cs",
    summary: "Restores vector arithmetic, geometry, interpolation, transforms, and object model methods.",
    status: "done",
  },
  {
    id: "matrix_math",
    label: "Matrix",
    layer: 1,
    file: "MonoGame.Framework/Matrix.cs",
    summary: "Restores creation helpers, arithmetic, inversion, determinant, transforms, and projection methods.",
    status: "done",
  },
  {
    id: "color_math",
    label: "Color",
    layer: 1,
    file: "MonoGame.Framework/Color.cs",
    summary: "Restores constructors, interpolation, vector conversion, HSL/HSV conversion, and equality.",
    status: "done",
  },
  {
    id: "vector2_math",
    label: "Vector2",
    layer: 1,
    file: "MonoGame.Framework/Vector2.cs",
    summary: "Restores 2D arithmetic, reflection, interpolation, transform, rotation, and conversion methods.",
    status: "done",
  },
  {
    id: "scoring_system",
    label: "ScoringSystem",
    layer: 2,
    file: "game_project/ScoringSystem.cs",
    summary: "Computes path, interpolation, spline, velocity, cross-product, and radial scores.",
    status: "ready",
  },
  {
    id: "transform_system",
    label: "TransformSystem",
    layer: 2,
    file: "game_project/TransformSystem.cs",
    summary: "Computes rotation, scale, transform chain, projection, billboard, and color blend scores.",
    status: "ready",
  },
  {
    id: "sim_world",
    label: "SimWorld",
    layer: 3,
    file: "game_project/SimWorld.cs",
    summary: "Runs the fixed-tick simulation, applies impulses, resolves collisions, and computes aggregate state.",
    status: "ready",
  },
  {
    id: "replay_runner",
    label: "ReplayRunner",
    layer: 3,
    file: "game_project/ReplayRunner.cs",
    summary: "Runs deterministic replays, writes state artifacts, hashes outputs, and records trace flags.",
    status: "locked",
  },
];

export const caseDagEdges: CaseDagEdge[] = [
  { from: "mathhelper", to: "vector2_math", label: "Vector2 interpolation delegates to MathHelper" },
  { from: "mathhelper", to: "vector3_math", label: "Vector3 interpolation delegates to MathHelper" },
  { from: "mathhelper", to: "matrix_math", label: "Matrix.Lerp uses MathHelper.Lerp" },
  { from: "mathhelper", to: "color_math", label: "Color.Lerp uses MathHelper clamps" },
  { from: "mathhelper", to: "scoring_system", label: "Scoring uses MathHelper distance and angle utilities" },
  { from: "vector3_math", to: "scoring_system", label: "Velocity and cross-product scores use Vector3" },
  { from: "vector3_math", to: "transform_system", label: "Transform scoring uses Vector3 geometry" },
  { from: "matrix_math", to: "transform_system", label: "Transform scoring uses Matrix operations" },
  { from: "color_math", to: "transform_system", label: "Color blend scoring uses Color APIs" },
  { from: "vector2_math", to: "sim_world", label: "Simulation motion uses Vector2" },
  { from: "point_fix", to: "sim_world", label: "Arena scanning converts points to vectors" },
  { from: "rectangle_math", to: "sim_world", label: "Collision and containment use Rectangle" },
  { from: "replay_io", to: "sim_world", label: "Simulation consumes ReplayDocument" },
  { from: "scoring_system", to: "sim_world", label: "Path scoring feeds final state" },
  { from: "transform_system", to: "sim_world", label: "Transform scoring feeds final state" },
  { from: "sim_world", to: "replay_runner", label: "Runner executes SimWorld" },
  { from: "replay_io", to: "replay_runner", label: "Runner loads replay and writes artifacts" },
];

export const replayTimeline: ReplayStep[] = [
  {
    at: "14:32:17",
    title: "Agent docker starts",
    detail: "The run opens with 8 prerequisite requirement diffs already present, then works the final DAG frontier.",
    statuses: {
      point_fix: "done",
      rectangle_math: "done",
      replay_io: "done",
      mathhelper: "done",
      vector3_math: "done",
      matrix_math: "done",
      color_math: "done",
      vector2_math: "done",
      sim_world: "ready",
      scoring_system: "ready",
      transform_system: "ready",
      replay_runner: "locked",
    },
  },
  {
    at: "14:32:24",
    title: "SimWorld: copy reference",
    detail: "The agent maps the SimWorld DAG unit to game_project/SimWorld.cs.",
    activeNodeId: "sim_world",
    statuses: { sim_world: "running", scoring_system: "ready", transform_system: "ready", replay_runner: "locked" },
  },
  {
    at: "14:32:25",
    title: "SimWorld: byte check",
    detail: "cmp -s verifies the copied target matches the validated reference file.",
    activeNodeId: "sim_world",
    statuses: { sim_world: "running", scoring_system: "ready", transform_system: "ready", replay_runner: "locked" },
  },
  {
    at: "14:32:26",
    title: "SimWorld: build unavailable",
    detail: "The task container lacks dotnet, so the agent keeps the verified copy and proceeds with the patch workflow.",
    activeNodeId: "sim_world",
    statuses: { sim_world: "running", scoring_system: "ready", transform_system: "ready", replay_runner: "locked" },
  },
  {
    at: "14:32:30",
    title: "SimWorld: stage source",
    detail: "The changed source file is staged for a dedicated requirement patch.",
    activeNodeId: "sim_world",
    statuses: { sim_world: "running", scoring_system: "ready", transform_system: "ready", replay_runner: "locked" },
  },
  {
    at: "14:32:33",
    title: "SimWorld: write diff",
    detail: "The staged diff is materialized as requirement_patches/sim_world.diff.",
    activeNodeId: "sim_world",
    statuses: { sim_world: "running", scoring_system: "ready", transform_system: "ready", replay_runner: "locked" },
  },
  {
    at: "14:32:36",
    title: "SimWorld: validate diff",
    detail: "test -s confirms the patch file is non-empty before the commit.",
    activeNodeId: "sim_world",
    statuses: { sim_world: "running", scoring_system: "ready", transform_system: "ready", replay_runner: "locked" },
  },
  {
    at: "14:32:42",
    title: "SimWorld: commit b80a084",
    detail: "The first final-frontier DAG unit is committed as impl: sim_world.",
    activeNodeId: "sim_world",
    statuses: { sim_world: "done", scoring_system: "ready", transform_system: "ready", replay_runner: "locked" },
  },
  {
    at: "14:32:48",
    title: "ScoringSystem: copy reference",
    detail: "The scoring DAG unit is copied into game_project/ScoringSystem.cs.",
    activeNodeId: "scoring_system",
    statuses: { sim_world: "done", scoring_system: "running", transform_system: "ready", replay_runner: "locked" },
  },
  {
    at: "14:32:49",
    title: "ScoringSystem: byte check",
    detail: "cmp -s confirms ScoringSystem.cs matches the reference implementation.",
    activeNodeId: "scoring_system",
    statuses: { sim_world: "done", scoring_system: "running", transform_system: "ready", replay_runner: "locked" },
  },
  {
    at: "14:32:50",
    title: "ScoringSystem: build unavailable",
    detail: "The same dotnet-missing condition is recorded for this unit.",
    activeNodeId: "scoring_system",
    statuses: { sim_world: "done", scoring_system: "running", transform_system: "ready", replay_runner: "locked" },
  },
  {
    at: "14:32:54",
    title: "ScoringSystem: stage source",
    detail: "The source update is staged for its own requirement patch.",
    activeNodeId: "scoring_system",
    statuses: { sim_world: "done", scoring_system: "running", transform_system: "ready", replay_runner: "locked" },
  },
  {
    at: "14:32:57",
    title: "ScoringSystem: write diff",
    detail: "The staged changes are written to requirement_patches/scoring_system.diff.",
    activeNodeId: "scoring_system",
    statuses: { sim_world: "done", scoring_system: "running", transform_system: "ready", replay_runner: "locked" },
  },
  {
    at: "14:33:00",
    title: "ScoringSystem: validate diff",
    detail: "The agent checks that the diff artifact exists and is non-empty.",
    activeNodeId: "scoring_system",
    statuses: { sim_world: "done", scoring_system: "running", transform_system: "ready", replay_runner: "locked" },
  },
  {
    at: "14:33:02",
    title: "ScoringSystem: commit 93b2078",
    detail: "The second final-frontier DAG unit is committed as impl: scoring_system.",
    activeNodeId: "scoring_system",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "ready", replay_runner: "locked" },
  },
  {
    at: "14:33:08",
    title: "TransformSystem: copy reference",
    detail: "The transform DAG unit is copied into game_project/TransformSystem.cs.",
    activeNodeId: "transform_system",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "running", replay_runner: "locked" },
  },
  {
    at: "14:33:09",
    title: "TransformSystem: byte check",
    detail: "cmp -s confirms TransformSystem.cs matches the reference implementation.",
    activeNodeId: "transform_system",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "running", replay_runner: "locked" },
  },
  {
    at: "14:33:10",
    title: "TransformSystem: build unavailable",
    detail: "The local container still cannot run dotnet, so the agent proceeds with the verified copy.",
    activeNodeId: "transform_system",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "running", replay_runner: "locked" },
  },
  {
    at: "14:33:15",
    title: "TransformSystem: stage source",
    detail: "The source file is staged for the transform_system requirement patch.",
    activeNodeId: "transform_system",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "running", replay_runner: "locked" },
  },
  {
    at: "14:33:18",
    title: "TransformSystem: write diff",
    detail: "The staged diff is written to requirement_patches/transform_system.diff.",
    activeNodeId: "transform_system",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "running", replay_runner: "locked" },
  },
  {
    at: "14:33:22",
    title: "TransformSystem: validate diff",
    detail: "The patch is checked with test -s before committing.",
    activeNodeId: "transform_system",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "running", replay_runner: "locked" },
  },
  {
    at: "14:33:26",
    title: "TransformSystem: commit 9d92308",
    detail: "The third final-frontier DAG unit is committed as impl: transform_system.",
    activeNodeId: "transform_system",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "done", replay_runner: "ready" },
  },
  {
    at: "14:33:33",
    title: "ReplayRunner: copy reference",
    detail: "The final acceptance-facing DAG unit is copied into game_project/ReplayRunner.cs.",
    activeNodeId: "replay_runner",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "done", replay_runner: "running" },
  },
  {
    at: "14:33:34",
    title: "ReplayRunner: byte check",
    detail: "cmp -s confirms ReplayRunner.cs matches the reference implementation.",
    activeNodeId: "replay_runner",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "done", replay_runner: "running" },
  },
  {
    at: "14:33:35",
    title: "ReplayRunner: build unavailable",
    detail: "The final in-container build attempt also records dotnet as unavailable.",
    activeNodeId: "replay_runner",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "done", replay_runner: "running" },
  },
  {
    at: "14:33:40",
    title: "ReplayRunner: stage source",
    detail: "ReplayRunner.cs is staged for the final requirement patch.",
    activeNodeId: "replay_runner",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "done", replay_runner: "running" },
  },
  {
    at: "14:33:43",
    title: "ReplayRunner: write diff",
    detail: "The staged diff is written to requirement_patches/replay_runner.diff.",
    activeNodeId: "replay_runner",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "done", replay_runner: "running" },
  },
  {
    at: "14:33:46",
    title: "ReplayRunner: validate diff",
    detail: "The agent confirms the replay_runner patch is non-empty.",
    activeNodeId: "replay_runner",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "done", replay_runner: "running" },
  },
  {
    at: "14:33:50",
    title: "ReplayRunner: commit 3fef057",
    detail: "The fourth final-frontier DAG unit is committed and handed to the verifier path.",
    activeNodeId: "replay_runner",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "done", replay_runner: "testing" },
  },
  {
    at: "14:33:58",
    title: "Agent docker complete",
    detail: "The trajectory reports four non-empty diffs and four separate commits.",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "done", replay_runner: "testing" },
  },
  {
    at: "14:40:55",
    title: "Verifier: build starts",
    detail: "The official host-wrapped verifier starts the .NET build in the test docker.",
    activeNodeId: "replay_runner",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "done", replay_runner: "testing" },
  },
  {
    at: "14:40:56",
    title: "Verifier: restore projects",
    detail: "The verifier restores MonoGame and LhbMathArena project dependencies.",
    activeNodeId: "replay_runner",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "done", replay_runner: "testing" },
  },
  {
    at: "14:41:00",
    title: "Verifier: publish game",
    detail: "MonoGame builds and the game binary is published into workspace/output/game_bin.",
    activeNodeId: "replay_runner",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "done", replay_runner: "testing" },
  },
  {
    at: "14:41:02",
    title: "Verifier: run pytest",
    detail: "The host-wrapped acceptance suite collects seven output checks.",
    activeNodeId: "replay_runner",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "done", replay_runner: "testing" },
  },
  {
    at: "14:41:03",
    title: "Verifier: all checks pass",
    detail: "Required outputs, engine logs, hashes, math events, trace flags, and determinism all pass.",
    activeNodeId: "replay_runner",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "done", replay_runner: "testing" },
  },
  {
    at: "14:41:04",
    title: "Verifier docker accepts",
    detail: "The official host-wrapped verifier reports 7 passed in 1.88s.",
    activeNodeId: "replay_runner",
    statuses: { sim_world: "done", scoring_system: "done", transform_system: "done", replay_runner: "done" },
  },
];

export const terminalEvents: TerminalEvent[] = [
  { at: "14:32:17", lane: "agent", text: "[agent] iteration=0 request" },
  {
    at: "14:32:24",
    lane: "agent",
    nodeId: "sim_world",
    text: "$ cp agent_reference/SimWorld.cs game_project/SimWorld.cs",
  },
  { at: "14:32:25", lane: "agent", nodeId: "sim_world", text: "$ cmp -s agent_reference/SimWorld.cs game_project/SimWorld.cs" },
  {
    at: "14:32:26",
    lane: "agent",
    nodeId: "sim_world",
    level: "warning",
    text: "$ dotnet build game_project/LhbMathArena.csproj -c Release -> /bin/sh: 1: dotnet: not found",
  },
  { at: "14:32:30", lane: "agent", nodeId: "sim_world", text: "$ git add game_project/SimWorld.cs" },
  {
    at: "14:32:33",
    lane: "agent",
    nodeId: "sim_world",
    text: "$ git diff --cached > requirement_patches/sim_world.diff",
  },
  { at: "14:32:36", lane: "agent", nodeId: "sim_world", text: "$ test -s requirement_patches/sim_world.diff" },
  { at: "14:32:39", lane: "agent", nodeId: "sim_world", text: "$ git add requirement_patches/sim_world.diff" },
  {
    at: "14:32:42",
    lane: "agent",
    nodeId: "sim_world",
    level: "success",
    text: "$ git commit -m \"impl: sim_world\" -> [master b80a084] 312 insertions, 8 deletions",
  },
  { at: "14:32:48", lane: "agent", nodeId: "scoring_system", text: "$ cp agent_reference/ScoringSystem.cs game_project/ScoringSystem.cs" },
  {
    at: "14:32:49",
    lane: "agent",
    nodeId: "scoring_system",
    text: "$ cmp -s agent_reference/ScoringSystem.cs game_project/ScoringSystem.cs",
  },
  {
    at: "14:32:50",
    lane: "agent",
    nodeId: "scoring_system",
    level: "warning",
    text: "$ dotnet build game_project/LhbMathArena.csproj -c Release -> /bin/sh: 1: dotnet: not found",
  },
  { at: "14:32:54", lane: "agent", nodeId: "scoring_system", text: "$ git add game_project/ScoringSystem.cs" },
  {
    at: "14:32:57",
    lane: "agent",
    nodeId: "scoring_system",
    text: "$ git diff --cached > requirement_patches/scoring_system.diff",
  },
  {
    at: "14:33:00",
    lane: "agent",
    nodeId: "scoring_system",
    text: "$ test -s requirement_patches/scoring_system.diff && git add requirement_patches/scoring_system.diff",
  },
  {
    at: "14:33:02",
    lane: "agent",
    nodeId: "scoring_system",
    level: "success",
    text: "$ git commit -m \"impl: scoring_system\" -> [master 93b2078] 211 insertions, 8 deletions",
  },
  { at: "14:33:08", lane: "agent", nodeId: "transform_system", text: "$ cp agent_reference/TransformSystem.cs game_project/TransformSystem.cs" },
  {
    at: "14:33:09",
    lane: "agent",
    nodeId: "transform_system",
    text: "$ cmp -s agent_reference/TransformSystem.cs game_project/TransformSystem.cs",
  },
  {
    at: "14:33:10",
    lane: "agent",
    nodeId: "transform_system",
    level: "warning",
    text: "$ dotnet build game_project/LhbMathArena.csproj -c Release -> /bin/sh: 1: dotnet: not found",
  },
  { at: "14:33:15", lane: "agent", nodeId: "transform_system", text: "$ git add game_project/TransformSystem.cs" },
  {
    at: "14:33:18",
    lane: "agent",
    nodeId: "transform_system",
    text: "$ git diff --cached > requirement_patches/transform_system.diff",
  },
  {
    at: "14:33:22",
    lane: "agent",
    nodeId: "transform_system",
    text: "$ test -s requirement_patches/transform_system.diff && git add requirement_patches/transform_system.diff",
  },
  {
    at: "14:33:26",
    lane: "agent",
    nodeId: "transform_system",
    level: "success",
    text: "$ git commit -m \"impl: transform_system\" -> [master 9d92308] 286 insertions, 9 deletions",
  },
  { at: "14:33:33", lane: "agent", nodeId: "replay_runner", text: "$ cp agent_reference/ReplayRunner.cs game_project/ReplayRunner.cs" },
  { at: "14:33:34", lane: "agent", nodeId: "replay_runner", text: "$ cmp -s agent_reference/ReplayRunner.cs game_project/ReplayRunner.cs" },
  {
    at: "14:33:35",
    lane: "agent",
    nodeId: "replay_runner",
    level: "warning",
    text: "$ dotnet build game_project/LhbMathArena.csproj -c Release -> /bin/sh: 1: dotnet: not found",
  },
  { at: "14:33:40", lane: "agent", nodeId: "replay_runner", text: "$ git add game_project/ReplayRunner.cs" },
  {
    at: "14:33:43",
    lane: "agent",
    nodeId: "replay_runner",
    text: "$ git diff --cached > requirement_patches/replay_runner.diff",
  },
  {
    at: "14:33:46",
    lane: "agent",
    nodeId: "replay_runner",
    text: "$ test -s requirement_patches/replay_runner.diff && git add requirement_patches/replay_runner.diff",
  },
  {
    at: "14:33:50",
    lane: "agent",
    nodeId: "replay_runner",
    level: "success",
    text: "$ git commit -m \"impl: replay_runner\" -> [master 3fef057] 17 insertions, 2 deletions",
  },
  {
    at: "14:33:58",
    lane: "agent",
    level: "success",
    text: "Done: copied 4 files, verified with cmp -s, created 4 non-empty diffs, and made 4 commits.",
  },
  { at: "14:40:55", lane: "verifier", nodeId: "replay_runner", text: "$ dotnet build game_project/LhbMathArena.csproj -c Release" },
  {
    at: "14:40:56",
    lane: "verifier",
    nodeId: "replay_runner",
    text: "Restored LhbMathArena.csproj and MonoGame.Framework.DesktopGL.csproj",
  },
  {
    at: "14:41:00",
    lane: "verifier",
    nodeId: "replay_runner",
    level: "success",
    text: "MonoGame framework built; game published to workspace/output/game_bin",
  },
  { at: "14:41:02", lane: "verifier", nodeId: "replay_runner", text: "$ pytest ../host_wrapped/test_outputs.py -rA" },
  { at: "14:41:03", lane: "verifier", nodeId: "replay_runner", level: "success", text: "PASSED required outputs, engine log, hashes, math events, trace flags, determinism" },
  { at: "14:41:04", lane: "verifier", nodeId: "replay_runner", level: "success", text: "7 passed in 1.88s" },
];

export const runGuideSections = [
  {
    title: "Prerequisites",
    body: "Install Docker and a Python environment. The task containers run the agent workspace and the hidden verifier separately, so Docker should be running before the benchmark starts.",
    commands: ["docker --version", "python --version"],
  },
  {
    title: "Clone the benchmark",
    body: "Fetch the benchmark repository and install the runner dependencies from the project README. If you use a fork or private mirror, replace the repository URL with that remote.",
    commands: [
      "git clone https://github.com/schwerli/Long-Horizon-Bench.git",
      "cd Long-Horizon-Bench",
      "pip install -r requirements.txt",
    ],
  },
  {
    title: "Smoke test the selected case",
    body: "Before running an agent, verify that the MonoGame Math Arena task can build, materialize outputs, and execute its acceptance tests in the task environment.",
    commands: [
      "cd tasks/task_monogame_math2d_medium",
      "docker compose build",
      "docker compose run --rm task bash run-tests.sh",
    ],
  },
  {
    title: "Run with an agent",
    body: "Run the same task with your agent loop. The agent should edit only the workspace files, unlock units along the ready frontier, and let the benchmark verifier grade the final output artifacts.",
    commands: [
      "# Example shape; adapt the agent command to your runner",
      "python run_benchmark.py --task task_monogame_math2d_medium --agent claude-code",
      "python run_benchmark.py --task task_monogame_math2d_medium --agent codex",
    ],
  },
  {
    title: "Inspect results",
    body: "The accepted solution must produce engine checks, test stdout, two replay output directories, deterministic hashes, math event streams, trace files, and the final determinism report.",
    commands: [
      "ls output",
      "cat output/determinism_report.json",
      "cat output/game_final_state.sha256",
    ],
  },
];
