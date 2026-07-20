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
  lane: "agent" | "tests" | "runner";
  text: string;
  nodeId?: string;
};

export const caseSummary = {
  slug: "task_monogame_math2d_medium",
  title: "MonoGame Math Arena",
  difficulty: "medium",
  category: "systems",
  units: 12,
  layers: 4,
  timeout: "2h agent / 20m tests",
  description:
    "A long-horizon repair task where an agent restores hollowed MonoGame math APIs, completes a deterministic headless game, runs unit tests along the DAG frontier, and passes integrated replay acceptance checks.",
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
    status: "testing",
  },
  {
    id: "scoring_system",
    label: "ScoringSystem",
    layer: 2,
    file: "game_project/ScoringSystem.cs",
    summary: "Computes path, interpolation, spline, velocity, cross-product, and radial scores.",
    status: "running",
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
    status: "locked",
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

export const terminalEvents: TerminalEvent[] = [
  { at: "00:00", lane: "agent", text: "$ inspect task.yaml module_dag.yaml unit_dag.json" },
  { at: "00:12", lane: "agent", text: "found 12 units across 4 DAG layers; starting ready frontier" },
  { at: "00:34", lane: "agent", nodeId: "mathhelper", text: "edit MonoGame.Framework/MathHelper.cs: restore Clamp, Lerp, Hermite, WrapAngle" },
  { at: "01:05", lane: "tests", nodeId: "mathhelper", text: "pytest tests/mathhelper/test_mathhelper_behavior.py -q" },
  { at: "01:16", lane: "tests", nodeId: "mathhelper", text: "17 passed; downstream vector and scoring units released" },
  { at: "01:43", lane: "agent", nodeId: "vector2_math", text: "implement Vector2 Reflect, RotateAround, TransformNormal, ToPoint" },
  { at: "02:05", lane: "tests", nodeId: "vector2_math", text: "running vector2_math behavior tests..." },
  { at: "02:25", lane: "agent", nodeId: "scoring_system", text: "complete path scoring pipeline using MathHelper + Vector3 primitives" },
  { at: "02:52", lane: "tests", nodeId: "scoring_system", text: "scoring_system tests active; regression set keeps MathHelper + Vector3 green" },
  { at: "03:30", lane: "agent", nodeId: "sim_world", text: "unlock SimWorld after replay_io, rectangle, vector2, scoring, transform dependencies pass" },
  { at: "04:12", lane: "runner", nodeId: "replay_runner", text: "bash /workspace/scripts/lhb_materialize_monogame_math_outputs.sh" },
  { at: "04:40", lane: "runner", text: "replay_run_1/final_state.sha256 generated" },
  { at: "04:58", lane: "runner", text: "replay_run_2/final_state.sha256 matches run 1" },
  { at: "05:20", lane: "runner", text: "pytest /tests/test_outputs.py -rA" },
  { at: "05:36", lane: "runner", text: "accepted: engine checks, math events, trace flags, determinism, reference hash" },
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
