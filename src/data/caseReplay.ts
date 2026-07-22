export type CaseNodeStatus = "done" | "running" | "testing" | "ready" | "locked" | "failed";

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
  result: "3/7 checks passed",
  commits: [],
  trajectory: "tmp/task_monogame_math2d_medium_real_dual_terminal_20260722T040410Z/recordings/agent.cast",
  cast: "tmp/task_monogame_math2d_medium_real_dual_terminal_20260722T040410Z/recordings/tester.cast",
  castHref: "/cases/task_monogame_math2d_medium/agent.cast",
  testerCastHref: "/cases/task_monogame_math2d_medium/tester.cast",
  description:
    "A real dual-terminal gpt-5.4 run for the MonoGame Math Arena task. The agent repairs math and game-side C# files, builds and runs replay artifacts, then the verifier accepts 3 checks and rejects 4 acceptance checks.",
};

export const caseDagNodes: CaseDagNode[] = [
  {
    id: "point_fix",
    label: "Point.ToVector2",
    layer: 0,
    file: "MonoGame.Framework/Point.cs",
    summary: "Fix point coordinate conversion used by arena scans.",
    status: "ready",
  },
  {
    id: "rectangle_math",
    label: "Rectangle",
    layer: 0,
    file: "MonoGame.Framework/Rectangle.cs",
    summary: "Intersects, Union, and Contains for collision checks.",
    status: "ready",
  },
  {
    id: "replay_io",
    label: "ReplayIO",
    layer: 0,
    file: "game_project/ReplayIO.cs",
    summary: "Load replay JSON and write verifier artifacts.",
    status: "ready",
  },
  {
    id: "mathhelper",
    label: "MathHelper",
    layer: 0,
    file: "MonoGame.Framework/MathHelper.cs",
    summary: "Clamp, Lerp, angle conversion, interpolation, and wrapping.",
    status: "ready",
  },
  {
    id: "vector3_math",
    label: "Vector3",
    layer: 1,
    file: "MonoGame.Framework/Vector3.cs",
    summary: "3D vector helpers used by transform and scoring paths.",
    status: "locked",
  },
  {
    id: "matrix_math",
    label: "Matrix",
    layer: 1,
    file: "MonoGame.Framework/Matrix.cs",
    summary: "Matrix transforms, rotations, projection, inverse, and lerp.",
    status: "locked",
  },
  {
    id: "color_math",
    label: "Color",
    layer: 1,
    file: "MonoGame.Framework/Color.cs",
    summary: "Color constructors, interpolation, and vector conversion.",
    status: "locked",
  },
  {
    id: "vector2_math",
    label: "Vector2",
    layer: 1,
    file: "MonoGame.Framework/Vector2.cs",
    summary: "2D vector arithmetic, normalization, reflection, and distance.",
    status: "locked",
  },
  {
    id: "scoring_system",
    label: "ScoringSystem",
    layer: 2,
    file: "game_project/ScoringSystem.cs",
    summary: "Compute math-driven path, velocity, and cross-product scores.",
    status: "locked",
  },
  {
    id: "transform_system",
    label: "TransformSystem",
    layer: 2,
    file: "game_project/TransformSystem.cs",
    summary: "Exercise Matrix, Vector3, and Color operations in trace output.",
    status: "locked",
  },
  {
    id: "sim_world",
    label: "SimWorld",
    layer: 3,
    file: "game_project/SimWorld.cs",
    summary: "Run deterministic arena simulation, events, trace, and final state.",
    status: "locked",
  },
  {
    id: "replay_runner",
    label: "ReplayRunner",
    layer: 3,
    file: "game_project/ReplayRunner.cs",
    summary: "Parse CLI options, invoke replay, and materialize final artifacts.",
    status: "locked",
  },
];

export const caseDagEdges: CaseDagEdge[] = [
  { from: "mathhelper", to: "vector2_math", label: "Vector2 interpolation/clamping delegates to MathHelper" },
  { from: "mathhelper", to: "vector3_math", label: "Vector3 interpolation delegates to MathHelper" },
  { from: "mathhelper", to: "matrix_math", label: "Matrix.Lerp uses MathHelper.Lerp" },
  { from: "mathhelper", to: "color_math", label: "Color.Lerp uses MathHelper" },
  { from: "mathhelper", to: "scoring_system", label: "ScoringSystem calls MathHelper utilities" },
  { from: "vector3_math", to: "scoring_system", label: "Scoring velocity/cross-product paths use Vector3" },
  { from: "vector3_math", to: "transform_system", label: "TransformSystem uses Vector3 transforms" },
  { from: "matrix_math", to: "transform_system", label: "TransformSystem uses Matrix operations" },
  { from: "color_math", to: "transform_system", label: "TransformSystem records Color operations" },
  { from: "vector2_math", to: "sim_world", label: "SimWorld uses Vector2 motion and reflection" },
  { from: "point_fix", to: "sim_world", label: "Arena scans depend on Point.ToVector2" },
  { from: "rectangle_math", to: "sim_world", label: "Collision checks depend on Rectangle queries" },
  { from: "replay_io", to: "sim_world", label: "SimWorld receives ReplayDocument from ReplayIO" },
  { from: "scoring_system", to: "sim_world", label: "SimWorld consumes ScoringSystem methods" },
  { from: "transform_system", to: "sim_world", label: "SimWorld consumes TransformSystem methods" },
  { from: "sim_world", to: "replay_runner", label: "ReplayRunner creates SimWorld and builds final state" },
  { from: "replay_io", to: "replay_runner", label: "ReplayRunner writes JSON/hash artifacts" },
];

const initialMonoGameStatuses: Partial<Record<string, CaseNodeStatus>> = {
  point_fix: "ready",
  rectangle_math: "ready",
  replay_io: "ready",
  mathhelper: "ready",
  vector3_math: "locked",
  matrix_math: "locked",
  color_math: "locked",
  vector2_math: "locked",
  scoring_system: "locked",
  transform_system: "locked",
  sim_world: "locked",
  replay_runner: "locked",
};

export const replayTimeline: ReplayStep[] = [
  {
    at: "04:04:15",
    title: "Dual docker replay starts",
    detail: "The agent tmux session attaches in /workspace while the tester waits for the run output file.",
    statuses: initialMonoGameStatuses,
  },
  {
    at: "04:04:28",
    title: "Survey requirements",
    detail: "The agent lists all MonoGame Math Arena requirements, checks git state, and looks for requirement patches.",
    activeNodeId: "mathhelper",
    statuses: { ...initialMonoGameStatuses, point_fix: "running", rectangle_math: "running", replay_io: "running", mathhelper: "running" },
  },
  {
    at: "04:04:33",
    title: "Read task and source layout",
    detail: "The terminal streams the requirement YAMLs, required output artifacts, and MonoGame/game_project file tree.",
    activeNodeId: "replay_io",
    statuses: {
      ...initialMonoGameStatuses,
      point_fix: "running",
      rectangle_math: "running",
      replay_io: "running",
      mathhelper: "running",
      vector2_math: "ready",
      vector3_math: "ready",
      matrix_math: "ready",
      color_math: "ready",
    },
  },
  {
    at: "04:04:39",
    title: "Find hollowed C# files",
    detail: "A grep over MonoGame and game_project surfaces missing returns and skeleton game systems.",
    activeNodeId: "rectangle_math",
    statuses: {
      point_fix: "running",
      rectangle_math: "running",
      replay_io: "running",
      mathhelper: "running",
      vector2_math: "ready",
      vector3_math: "ready",
      matrix_math: "ready",
      color_math: "ready",
    },
  },
  {
    at: "04:04:42",
    title: "Inspect MathHelper",
    detail: "The agent reads MathHelper.cs around angle wrapping and interpolation helpers.",
    activeNodeId: "mathhelper",
    statuses: { point_fix: "running", rectangle_math: "running", replay_io: "running", mathhelper: "running", vector2_math: "ready", vector3_math: "ready", matrix_math: "ready", color_math: "ready" },
  },
  {
    at: "04:04:50",
    title: "Inspect Vector2",
    detail: "Vector2.cs shows hollowed arithmetic and out-parameter methods used by the simulation.",
    activeNodeId: "vector2_math",
    statuses: { point_fix: "running", rectangle_math: "running", replay_io: "running", mathhelper: "running", vector2_math: "running", vector3_math: "ready", matrix_math: "ready", color_math: "ready" },
  },
  {
    at: "04:06:19",
    title: "Inspect Vector3",
    detail: "After more source reads, the agent opens Vector3.cs and prepares a broad math patch.",
    activeNodeId: "vector3_math",
    statuses: { point_fix: "running", rectangle_math: "running", replay_io: "running", mathhelper: "running", vector2_math: "running", vector3_math: "running", matrix_math: "ready", color_math: "ready" },
  },
  {
    at: "04:07:14",
    title: "Patch math framework",
    detail: "A real Python script patches MathHelper, Vector2, Rectangle, Point, Color, Matrix, and Vector3 stubs.",
    activeNodeId: "vector2_math",
    statuses: { point_fix: "running", rectangle_math: "running", replay_io: "running", mathhelper: "running", vector2_math: "running", vector3_math: "running", matrix_math: "running", color_math: "running" },
  },
  {
    at: "04:07:54",
    title: "Write ReplayIO",
    detail: "The agent writes game_project/ReplayIO.cs to load replay data and materialize JSON artifacts.",
    activeNodeId: "replay_io",
    statuses: { point_fix: "done", rectangle_math: "running", replay_io: "running", mathhelper: "done", vector2_math: "running", vector3_math: "running", matrix_math: "running", color_math: "running" },
  },
  {
    at: "04:08:06",
    title: "Write scoring system",
    detail: "ScoringSystem.cs is replaced with math-driven path, velocity, and cross-product scoring logic.",
    activeNodeId: "scoring_system",
    statuses: { point_fix: "done", rectangle_math: "running", replay_io: "done", mathhelper: "done", vector2_math: "running", vector3_math: "running", matrix_math: "running", color_math: "running", scoring_system: "running" },
  },
  {
    at: "04:08:22",
    title: "Write transform system",
    detail: "TransformSystem.cs is written to exercise Matrix, Vector3, and Color paths.",
    activeNodeId: "transform_system",
    statuses: { point_fix: "done", rectangle_math: "running", replay_io: "done", mathhelper: "done", vector2_math: "running", vector3_math: "running", matrix_math: "running", color_math: "running", scoring_system: "running", transform_system: "running" },
  },
  {
    at: "04:08:39",
    title: "Write replay runner",
    detail: "ReplayRunner.cs is replaced to parse CLI arguments, call SimWorld, and write replay artifacts.",
    activeNodeId: "replay_runner",
    statuses: { point_fix: "done", rectangle_math: "running", replay_io: "done", mathhelper: "done", vector2_math: "running", vector3_math: "running", matrix_math: "running", color_math: "running", scoring_system: "running", transform_system: "running", replay_runner: "running" },
  },
  {
    at: "04:09:06",
    title: "Write SimWorld",
    detail: "SimWorld.cs is written with deterministic replay, event stream, trace flags, and final state output.",
    activeNodeId: "sim_world",
    statuses: { point_fix: "done", rectangle_math: "running", replay_io: "done", mathhelper: "done", vector2_math: "running", vector3_math: "running", matrix_math: "running", color_math: "running", scoring_system: "running", transform_system: "running", sim_world: "running", replay_runner: "running" },
  },
  {
    at: "04:09:10",
    title: "Build attempt exposes compile errors",
    detail: "dotnet build surfaces out-parameter and framework compile issues in Matrix/Vector3/Color paths.",
    activeNodeId: "matrix_math",
    statuses: { point_fix: "done", rectangle_math: "running", replay_io: "done", mathhelper: "done", vector2_math: "running", vector3_math: "testing", matrix_math: "testing", color_math: "testing", scoring_system: "running", transform_system: "running", sim_world: "running", replay_runner: "running" },
  },
  {
    at: "04:10:31",
    title: "Patch compile errors",
    detail: "The agent applies targeted Matrix/Vector3 fixes and prepares to run the built game.",
    activeNodeId: "matrix_math",
    statuses: { point_fix: "done", rectangle_math: "running", replay_io: "done", mathhelper: "done", vector2_math: "running", vector3_math: "running", matrix_math: "running", color_math: "running", scoring_system: "running", transform_system: "running", sim_world: "running", replay_runner: "running" },
  },
  {
    at: "04:10:49",
    title: "Local replay run",
    detail: "The agent builds game_project and runs a headless replay into /workspace/output/test_*.json artifacts.",
    activeNodeId: "replay_runner",
    statuses: { point_fix: "done", rectangle_math: "testing", replay_io: "done", mathhelper: "done", vector2_math: "testing", vector3_math: "testing", matrix_math: "testing", color_math: "testing", scoring_system: "testing", transform_system: "testing", sim_world: "testing", replay_runner: "testing" },
  },
  {
    at: "04:11:20",
    title: "Produce required artifacts",
    detail: "The real command runs build_monogame, engine checks, two replay runs, hash copy, and determinism report generation.",
    activeNodeId: "sim_world",
    statuses: { point_fix: "done", rectangle_math: "testing", replay_io: "done", mathhelper: "done", vector2_math: "testing", vector3_math: "testing", matrix_math: "testing", color_math: "testing", scoring_system: "testing", transform_system: "testing", sim_world: "testing", replay_runner: "testing" },
  },
  {
    at: "04:11:57",
    title: "Agent finishes",
    detail: "The agent reports 12/12 implemented and output artifacts produced, then exits with code 0.",
    activeNodeId: "replay_runner",
    statuses: { point_fix: "done", rectangle_math: "testing", replay_io: "done", mathhelper: "done", vector2_math: "testing", vector3_math: "testing", matrix_math: "testing", color_math: "testing", scoring_system: "testing", transform_system: "testing", sim_world: "testing", replay_runner: "testing" },
  },
  {
    at: "04:07:41",
    title: "Tester starts official run",
    detail: "The tester docker sees /workspace/.lhb-run-tests-output.txt and starts the host-wrapped verifier.",
    activeNodeId: "replay_runner",
    statuses: { point_fix: "done", rectangle_math: "testing", replay_io: "done", mathhelper: "done", vector2_math: "testing", vector3_math: "testing", matrix_math: "testing", color_math: "testing", scoring_system: "testing", transform_system: "testing", sim_world: "testing", replay_runner: "testing" },
  },
  {
    at: "04:08:03",
    title: "Verifier build output streams",
    detail: "The test docker emits .NET 8 build output with framework warnings while preparing acceptance checks.",
    activeNodeId: "matrix_math",
    statuses: { point_fix: "done", rectangle_math: "testing", replay_io: "done", mathhelper: "done", vector2_math: "testing", vector3_math: "testing", matrix_math: "testing", color_math: "testing", scoring_system: "testing", transform_system: "testing", sim_world: "testing", replay_runner: "testing" },
  },
  {
    at: "04:12:30",
    title: "3 checks pass",
    detail: "The verifier confirms required outputs exist, the engine log has no failures, and hash files are valid.",
    activeNodeId: "replay_io",
    statuses: { point_fix: "done", rectangle_math: "testing", replay_io: "done", mathhelper: "done", vector2_math: "testing", vector3_math: "testing", matrix_math: "testing", color_math: "testing", scoring_system: "testing", transform_system: "testing", sim_world: "testing", replay_runner: "testing" },
  },
  {
    at: "04:12:30",
    title: "4 checks fail",
    detail: "The verifier rejects engine pass_count, missing collision events, rectangle trace usage, and deterministic final hash.",
    activeNodeId: "sim_world",
    statuses: { point_fix: "done", rectangle_math: "failed", replay_io: "done", mathhelper: "done", vector2_math: "testing", vector3_math: "testing", matrix_math: "testing", color_math: "testing", scoring_system: "done", transform_system: "done", sim_world: "failed", replay_runner: "failed" },
  },
];

export const terminalEvents: TerminalEvent[] = [];

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
