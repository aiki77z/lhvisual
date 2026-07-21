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
  slug: "task_mlsys_autodiff_pa1",
  title: "MLSys Autodiff PA1",
  difficulty: "hard",
  category: "machine-learning",
  units: 18,
  layers: 10,
  timeout: "2h agent / 20m tests",
  model: "gpt-5.4-20260305",
  result: "0/93 passed",
  commits: [],
  trajectory: "tmp/mlsys_autodiff_real_dual_terminal_20260721T123223Z/recordings/agent.cast",
  cast: "tmp/mlsys_autodiff_real_dual_terminal_20260721T123223Z/recordings/tester.cast",
  castHref: "/cases/task_mlsys_autodiff_pa1/agent.cast",
  testerCastHref: "/cases/task_mlsys_autodiff_pa1/tester.cast",
  description:
    "A real dual-terminal gpt-5.4 run for an autodiff-backed ML systems assignment. The agent inspects the task DAG and source, attempts early-layer edits, restores a corrupted patch, and the tester container later reports 93 failing tests.",
};

export const caseDagNodes: CaseDagNode[] = [
  {
    id: "graph_node_factories",
    label: "Graph factories",
    layer: 0,
    file: "pa1/auto_diff.py",
    summary: "Variable, placeholder, and global op node builders.",
    status: "ready",
  },
  {
    id: "fused_node_factories",
    label: "Fused factories",
    layer: 1,
    file: "pa1/fused_ops.py",
    summary: "Node builders for fused matmul+layernorm and matmul+softmax.",
    status: "locked",
  },
  {
    id: "node_dispatch_ops",
    label: "Node dispatch",
    layer: 1,
    file: "pa1/auto_diff.py",
    summary: "Operator overload dispatch for add, sub, mul, and div.",
    status: "locked",
  },
  {
    id: "elementwise_arithmetic_ops",
    label: "Arithmetic ops",
    layer: 1,
    file: "pa1/auto_diff.py",
    summary: "Add, multiply, subtract, constants, and gradients.",
    status: "locked",
  },
  {
    id: "comparison_division_utils",
    label: "Compare/divide",
    layer: 2,
    file: "pa1/auto_diff.py",
    summary: "Comparison, division, and related utility gradients.",
    status: "locked",
  },
  {
    id: "topological_evaluator",
    label: "Evaluator",
    layer: 2,
    file: "pa1/auto_diff.py",
    summary: "Topological traversal and graph evaluation.",
    status: "locked",
  },
  {
    id: "reduction_expand_ops",
    label: "Reduce/expand",
    layer: 3,
    file: "pa1/auto_diff.py",
    summary: "Sum, expand, zeros-like, ones-like, and gradients.",
    status: "locked",
  },
  {
    id: "reverse_mode_gradients",
    label: "Reverse gradients",
    layer: 3,
    file: "pa1/auto_diff.py",
    summary: "Reverse-mode autodiff graph construction.",
    status: "locked",
  },
  {
    id: "broadcast_log_ops",
    label: "Broadcast/log",
    layer: 4,
    file: "pa1/auto_diff.py",
    summary: "Broadcast and logarithm forward/backward behavior.",
    status: "locked",
  },
  {
    id: "linear_algebra_ops",
    label: "Linear algebra",
    layer: 4,
    file: "pa1/auto_diff.py",
    summary: "Matmul and transpose computation and gradients.",
    status: "locked",
  },
  {
    id: "activation_math_ops",
    label: "Activation math",
    layer: 4,
    file: "pa1/auto_diff.py",
    summary: "ReLU, sqrt, power, mean, and related gradients.",
    status: "locked",
  },
  {
    id: "softmax_ops",
    label: "Softmax",
    layer: 5,
    file: "pa1/auto_diff.py",
    summary: "Softmax forward and Jacobian-vector product.",
    status: "locked",
  },
  {
    id: "layernorm_ops",
    label: "LayerNorm",
    layer: 6,
    file: "pa1/auto_diff.py",
    summary: "Layer normalization forward and backward.",
    status: "locked",
  },
  {
    id: "fused_softmax_op",
    label: "Fused softmax",
    layer: 6,
    file: "pa1/fused_ops.py",
    summary: "Fused matmul+softmax operation.",
    status: "locked",
  },
  {
    id: "softmax_loss_graph",
    label: "Softmax loss",
    layer: 6,
    file: "pa1/transformer.py",
    summary: "Average cross-entropy graph.",
    status: "locked",
  },
  {
    id: "fused_layernorm_op",
    label: "Fused layernorm",
    layer: 7,
    file: "pa1/fused_ops.py",
    summary: "Fused matmul+layernorm operation.",
    status: "locked",
  },
  {
    id: "transformer_forward",
    label: "Transformer graph",
    layer: 7,
    file: "pa1/transformer.py",
    summary: "Single-head attention encoder graph.",
    status: "locked",
  },
  {
    id: "sgd_epoch_loop",
    label: "SGD epoch",
    layer: 7,
    file: "pa1/transformer.py",
    summary: "Mini-batch SGD utility loop.",
    status: "locked",
  },
  {
    id: "train_model_graph_build",
    label: "Train graph",
    layer: 8,
    file: "pa1/transformer.py",
    summary: "Training graph and parameter setup.",
    status: "locked",
  },
  {
    id: "train_model_runtime_bindings",
    label: "Runtime bindings",
    layer: 9,
    file: "pa1/transformer.py",
    summary: "Runtime tensor mappings and final evaluation.",
    status: "locked",
  },
];

export const caseDagEdges: CaseDagEdge[] = [
  { from: "graph_node_factories", to: "fused_node_factories", label: "Fused builders need graph nodes" },
  { from: "graph_node_factories", to: "node_dispatch_ops", label: "Operator overloads create graph nodes" },
  { from: "graph_node_factories", to: "elementwise_arithmetic_ops", label: "Arithmetic ops build on Node" },
  { from: "node_dispatch_ops", to: "comparison_division_utils", label: "Division dispatch feeds utilities" },
  { from: "elementwise_arithmetic_ops", to: "comparison_division_utils", label: "Division follows arithmetic" },
  { from: "graph_node_factories", to: "topological_evaluator", label: "Evaluator traverses Node graphs" },
  { from: "topological_evaluator", to: "reverse_mode_gradients", label: "Gradients depend on traversal" },
  { from: "elementwise_arithmetic_ops", to: "reduction_expand_ops", label: "Reductions use core ops" },
  { from: "reduction_expand_ops", to: "broadcast_log_ops", label: "Broadcast/log rely on reduction utilities" },
  { from: "comparison_division_utils", to: "linear_algebra_ops", label: "Later math follows utility ops" },
  { from: "reduction_expand_ops", to: "activation_math_ops", label: "Mean and activations use reductions" },
  { from: "linear_algebra_ops", to: "softmax_ops", label: "Softmax composes with matmul" },
  { from: "broadcast_log_ops", to: "softmax_ops", label: "Softmax loss needs log/broadcast" },
  { from: "softmax_ops", to: "layernorm_ops", label: "Normalization follows core tensor ops" },
  { from: "softmax_ops", to: "fused_softmax_op", label: "Fused softmax wraps softmax" },
  { from: "softmax_ops", to: "softmax_loss_graph", label: "Loss graph uses softmax" },
  { from: "layernorm_ops", to: "fused_layernorm_op", label: "Fused layernorm wraps layernorm" },
  { from: "fused_softmax_op", to: "transformer_forward", label: "Transformer can use fused softmax" },
  { from: "fused_layernorm_op", to: "transformer_forward", label: "Transformer can use fused layernorm" },
  { from: "softmax_loss_graph", to: "sgd_epoch_loop", label: "Training loop consumes loss" },
  { from: "transformer_forward", to: "train_model_graph_build", label: "Train graph wraps transformer" },
  { from: "sgd_epoch_loop", to: "train_model_runtime_bindings", label: "Runtime bindings drive SGD" },
  { from: "train_model_graph_build", to: "train_model_runtime_bindings", label: "Bindings need built graph" },
];

const initialAutodiffStatuses: Partial<Record<string, CaseNodeStatus>> = {
  graph_node_factories: "ready",
  fused_node_factories: "locked",
  node_dispatch_ops: "locked",
  elementwise_arithmetic_ops: "locked",
  comparison_division_utils: "locked",
  topological_evaluator: "locked",
  reduction_expand_ops: "locked",
  reverse_mode_gradients: "locked",
  broadcast_log_ops: "locked",
  linear_algebra_ops: "locked",
  activation_math_ops: "locked",
  softmax_ops: "locked",
  layernorm_ops: "locked",
  fused_softmax_op: "locked",
  softmax_loss_graph: "locked",
  fused_layernorm_op: "locked",
  transformer_forward: "locked",
  sgd_epoch_loop: "locked",
  train_model_graph_build: "locked",
  train_model_runtime_bindings: "locked",
};

export const replayTimeline: ReplayStep[] = [
  {
    at: "12:32:44",
    title: "Agent docker starts",
    detail: "The real agent run begins inside /workspace for task_mlsys_autodiff_pa1.",
    statuses: initialAutodiffStatuses,
  },
  {
    at: "12:32:47",
    title: "Survey requirements and unit DAG",
    detail: "The agent lists requirement files and prints /workspace/unit_dag.json before editing.",
    activeNodeId: "graph_node_factories",
    statuses: { ...initialAutodiffStatuses, graph_node_factories: "running" },
  },
  {
    at: "12:32:53",
    title: "Read early requirements",
    detail: "The agent reads layer 0 and layer 1 requirement files in the task-native dependency order.",
    activeNodeId: "graph_node_factories",
    statuses: {
      ...initialAutodiffStatuses,
      graph_node_factories: "running",
      fused_node_factories: "ready",
      node_dispatch_ops: "ready",
      elementwise_arithmetic_ops: "ready",
    },
  },
  {
    at: "12:32:57",
    title: "Inspect auto_diff.py",
    detail: "The first source inspection shows TODOs in Variable and core autodiff operations.",
    activeNodeId: "graph_node_factories",
    statuses: {
      ...initialAutodiffStatuses,
      graph_node_factories: "running",
      fused_node_factories: "ready",
      node_dispatch_ops: "ready",
      elementwise_arithmetic_ops: "ready",
    },
  },
  {
    at: "12:33:02",
    title: "Read Node / Variable definitions",
    detail: "The agent reads the opening auto_diff.py chunk containing Node overloads and Variable.",
    activeNodeId: "graph_node_factories",
    statuses: { graph_node_factories: "running", fused_node_factories: "ready", node_dispatch_ops: "ready", elementwise_arithmetic_ops: "ready" },
  },
  {
    at: "12:33:07",
    title: "Read operator TODOs",
    detail: "The next chunk shows comparison, subtraction, and other early operator TODOs.",
    activeNodeId: "elementwise_arithmetic_ops",
    statuses: { graph_node_factories: "running", node_dispatch_ops: "running", elementwise_arithmetic_ops: "running", fused_node_factories: "ready" },
  },
  {
    at: "12:33:14",
    title: "Inspect fused ops",
    detail: "The agent checks fused_ops.py because fused node factories sit in layer 1.",
    activeNodeId: "fused_node_factories",
    statuses: { graph_node_factories: "running", fused_node_factories: "running", node_dispatch_ops: "running", elementwise_arithmetic_ops: "running" },
  },
  {
    at: "12:33:17",
    title: "Briefly inspect transformer.py",
    detail: "The agent peeks at transformer.py for style/import expectations, despite the run still being early-layer focused.",
    activeNodeId: "transformer_forward",
    statuses: { graph_node_factories: "running", fused_node_factories: "running", node_dispatch_ops: "running", elementwise_arithmetic_ops: "running", transformer_forward: "locked" },
  },
  {
    at: "12:34:58",
    title: "Attempt bulk patch",
    detail: "A real Python patch command edits auto_diff.py and fused node builders, then reports patched.",
    activeNodeId: "graph_node_factories",
    statuses: { graph_node_factories: "running", fused_node_factories: "running", node_dispatch_ops: "running", elementwise_arithmetic_ops: "running" },
  },
  {
    at: "12:35:03",
    title: "Verify patched file",
    detail: "The agent reads the patched auto_diff.py and begins checking whether the early-layer edit worked.",
    activeNodeId: "graph_node_factories",
    statuses: { graph_node_factories: "testing", fused_node_factories: "running", node_dispatch_ops: "running", elementwise_arithmetic_ops: "running" },
  },
  {
    at: "12:35:10",
    title: "Patch corruption detected",
    detail: "The next read shows later TODO sections were corrupted by the bulk replace.",
    activeNodeId: "elementwise_arithmetic_ops",
    statuses: { graph_node_factories: "failed", fused_node_factories: "failed", node_dispatch_ops: "failed", elementwise_arithmetic_ops: "failed" },
  },
  {
    at: "12:35:17",
    title: "Restore auto_diff.py",
    detail: "The real terminal runs git checkout -- pa1/auto_diff.py and restores the file.",
    activeNodeId: "graph_node_factories",
    statuses: { graph_node_factories: "ready", fused_node_factories: "ready", node_dispatch_ops: "ready", elementwise_arithmetic_ops: "ready" },
  },
  {
    at: "12:37:23",
    title: "Re-read restored source",
    detail: "The agent reads the restored beginning of auto_diff.py again, with TODOs still present.",
    activeNodeId: "graph_node_factories",
    statuses: { graph_node_factories: "running", fused_node_factories: "ready", node_dispatch_ops: "ready", elementwise_arithmetic_ops: "ready" },
  },
  {
    at: "12:37:28",
    title: "Run interrupted",
    detail: "The agent reads another chunk and the cast ends with ^C before any requirement patch or commit is created.",
    activeNodeId: "graph_node_factories",
    statuses: { graph_node_factories: "failed", fused_node_factories: "ready", node_dispatch_ops: "ready", elementwise_arithmetic_ops: "ready" },
  },
  {
    at: "12:39:57",
    title: "Tester starts",
    detail: "The tester container observes the start signal and begins the hidden pytest suite.",
    activeNodeId: "graph_node_factories",
    statuses: { graph_node_factories: "testing", fused_node_factories: "testing", node_dispatch_ops: "testing", elementwise_arithmetic_ops: "testing" },
  },
  {
    at: "12:40:03",
    title: "Pytest failures stream",
    detail: "The tester collects 93 items and immediately starts emitting failures across test_outputs.py and test_expanded.py.",
    activeNodeId: "graph_node_factories",
    statuses: { graph_node_factories: "failed", fused_node_factories: "failed", node_dispatch_ops: "failed", elementwise_arithmetic_ops: "failed", topological_evaluator: "failed" },
  },
  {
    at: "12:40:07",
    title: "Failure root cause",
    detail: "The first failure points at pa1/auto_diff.py:74, where Variable.__init__ still raises NotImplementedError.",
    activeNodeId: "graph_node_factories",
    statuses: { ...initialAutodiffStatuses, graph_node_factories: "failed", fused_node_factories: "failed", node_dispatch_ops: "failed", elementwise_arithmetic_ops: "failed", topological_evaluator: "failed", sgd_epoch_loop: "failed" },
  },
  {
    at: "12:40:11",
    title: "Verifier rejects run",
    detail: "The test terminal reports 93 failed, 2 warnings in 7.34s.",
    activeNodeId: "graph_node_factories",
    statuses: { ...initialAutodiffStatuses, graph_node_factories: "failed", fused_node_factories: "failed", node_dispatch_ops: "failed", elementwise_arithmetic_ops: "failed", topological_evaluator: "failed", reduction_expand_ops: "failed", reverse_mode_gradients: "failed", broadcast_log_ops: "failed", linear_algebra_ops: "failed", activation_math_ops: "failed", softmax_ops: "failed", layernorm_ops: "failed", fused_softmax_op: "failed", softmax_loss_graph: "failed", fused_layernorm_op: "failed", transformer_forward: "failed", sgd_epoch_loop: "failed", train_model_graph_build: "failed", train_model_runtime_bindings: "failed" },
  },
];

export const terminalEvents: TerminalEvent[] = [
  { at: "12:32:44", lane: "agent", text: "[agent] iteration=0 request" },
  {
    at: "12:32:47",
    lane: "agent",
    nodeId: "graph_node_factories",
    text: "$ find requirements -maxdepth 1 -type f | sort; cat /workspace/unit_dag.json",
  },
  {
    at: "12:32:53",
    lane: "agent",
    nodeId: "graph_node_factories",
    text: "$ for f in requirements/{graph_node_factories,fused_node_factories,node_dispatch_ops,...}.yaml; do sed ...; done",
  },
  {
    at: "12:32:57",
    lane: "agent",
    nodeId: "graph_node_factories",
    text: "$ sed -n '1,240p' pa1/auto_diff.py && sed -n '240,520p' pa1/auto_diff.py",
  },
  { at: "12:33:02", lane: "agent", nodeId: "graph_node_factories", text: "read_file /workspace/pa1/auto_diff.py offset=0 limit=220" },
  {
    at: "12:33:07",
    lane: "agent",
    nodeId: "elementwise_arithmetic_ops",
    text: "read_file /workspace/pa1/auto_diff.py offset=220 limit=260",
  },
  {
    at: "12:33:10",
    lane: "agent",
    nodeId: "activation_math_ops",
    text: "read_file /workspace/pa1/auto_diff.py offset=480 limit=220",
  },
  { at: "12:33:14", lane: "agent", nodeId: "fused_node_factories", text: "read_file /workspace/pa1/fused_ops.py offset=0 limit=220" },
  { at: "12:33:17", lane: "agent", nodeId: "transformer_forward", text: "read_file /workspace/pa1/transformer.py offset=0 limit=220" },
  { at: "12:33:21", lane: "agent", nodeId: "sgd_epoch_loop", text: "read_file /workspace/pa1/transformer.py offset=220 limit=160" },
  {
    at: "12:34:58",
    lane: "agent",
    nodeId: "graph_node_factories",
    text: "$ python3 - <<'PY' ... Path('pa1/auto_diff.py').read_text(); text.replace(...); write_text(...)",
  },
  { at: "12:34:59", lane: "agent", nodeId: "graph_node_factories", level: "success", text: "bash -> exit=0 stdout=patched" },
  { at: "12:35:03", lane: "agent", nodeId: "graph_node_factories", text: "read_file /workspace/pa1/auto_diff.py offset=30 limit=220" },
  {
    at: "12:35:10",
    lane: "agent",
    nodeId: "elementwise_arithmetic_ops",
    level: "warning",
    text: "read_file offset=245 shows later TODO sections were corrupted by the bulk replace",
  },
  {
    at: "12:35:17",
    lane: "agent",
    nodeId: "graph_node_factories",
    level: "warning",
    text: "$ git checkout -- pa1/auto_diff.py && echo restored -> restored",
  },
  { at: "12:37:23", lane: "agent", nodeId: "graph_node_factories", text: "read_file /workspace/pa1/auto_diff.py offset=0 limit=220" },
  { at: "12:37:28", lane: "agent", nodeId: "elementwise_arithmetic_ops", text: "read_file /workspace/pa1/auto_diff.py offset=220 limit=420" },
  { at: "12:39:56", lane: "agent", level: "error", text: "^C" },
  { at: "12:32:44", lane: "verifier", text: "[tester] waiting for /workspace/.lhb-start-tests" },
  { at: "12:39:57", lane: "verifier", text: "[tester] start signal observed" },
  { at: "12:40:03", lane: "verifier", nodeId: "graph_node_factories", text: "pytest starts: collected 93 items" },
  { at: "12:40:04", lane: "verifier", nodeId: "graph_node_factories", level: "error", text: "../tests/test_outputs.py FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF [33%]" },
  { at: "12:40:05", lane: "verifier", nodeId: "elementwise_arithmetic_ops", level: "error", text: "../tests/test_expanded.py FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF [82%]" },
  {
    at: "12:40:07",
    lane: "verifier",
    nodeId: "graph_node_factories",
    level: "error",
    text: "test_div_compute -> ad.Variable('x1') -> pa1/auto_diff.py:74 NotImplementedError",
  },
  {
    at: "12:40:08",
    lane: "verifier",
    nodeId: "sgd_epoch_loop",
    level: "error",
    text: "test_transformer_sgd_epoch_skips_incomplete_tail_batch -> transformer.py:125 NotImplementedError",
  },
  {
    at: "12:40:11",
    lane: "verifier",
    level: "error",
    text: "93 failed, 2 warnings in 7.34s",
  },
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
