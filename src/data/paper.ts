export const repoUrl = "https://github.com/microsoft/Loopsbench";
export const websiteRepoUrl = "https://github.com/aiki77z/lhvisual";
export const paperUrl = "https://arxiv.org/abs/2608.00267";
export const datasetUrl = `${repoUrl}/tree/main/tasks`;

export const authors = [
  { name: "Han Li", href: "https://openreview.net/profile?id=~Han_Li44" },
  { name: "Zhemin Fang", href: "https://openreview.net/profile?id=~Zhemin_Fang1" },
  { name: "Rili Feng", href: "https://openreview.net/profile?id=~Rili_Feng1" },
  { name: "Yingqi Zhao", href: "https://openreview.net/profile?id=~Yingqi_Zhao2" },
  { name: "Jiaheng Liu", href: "" },
  { name: "Pengfei Gao", href: "https://openreview.net/profile?id=~Pengfei_Gao1" },
  { name: "He Ye", href: "https://openreview.net/profile?id=~He_Ye2" },
  { name: "Dayi Lin", href: "https://openreview.net/profile?id=~Dayi_Lin1" },
  { name: "Qingwei Lin", href: "https://openreview.net/profile?id=~Qingwei_Lin1" },
  { name: "Saravan Rajmohan", href: "https://openreview.net/profile?id=~Saravan_Rajmohan3" },
  { name: "Dongmei Zhang", href: "https://openreview.net/profile?id=~Dongmei_Zhang2" },
];

export const affiliations = "Microsoft · Nanjing University · University College London · Shanghai Jiao Tong University";

export const stats = [
  { value: "112", label: "dependency tasks" },
  { value: "5,300+", label: "development units" },
  { value: "8", label: "languages" },
  { value: "9", label: "domains" },
  { value: "6", label: "median DAG depth" },
  { value: "25.00%", label: "top resolve rate" },
];

export const abstractParagraphs = [
  "Coding agent infrastructure is shifting from harness engineering toward loop engineering as coding agents are deployed for sustained long horizon software development. Existing benchmarks often center on localized tasks or end state outcomes, offering limited insight into sustained execution. We introduce LoopsBench, a long horizon benchmark for loop engineering in coding agent evaluation. Each task is a dependency DAG over separately testable development units with source evidenced prerequisite edges. LoopsBench comprises 112 tasks from authentic sources spanning 8 programming languages and 9 domains. Its flow aware runtime releases tests along the ready frontier and retains completed nodes as regression obligations. We evaluate frontier coding agents paired with widely used loop implementations. The strongest configuration, Opus-4.7 with Claude Code and outer continuation, resolves 25.00% of tasks. Recorded plans recover only part of the source recovered prerequisite DAG, and regression events remain visible across the evaluated loop profiles. We open source the benchmark data and code, including all tasks, more than 5,300 development units, and executable tests, at microsoft/Loopsbench.",
];

export const introductionBlocks = [
  {
    heading: "",
    body: "Current coding agent systems increasingly expose loop mechanisms for sustained software work, e.g., Codex goal mode, Claude Code goal mode, and Claude Code dynamic workflows. These mechanisms do not replace the harness. They add a higher level control surface over it, so objectives, progress criteria, and work distribution can persist across extended execution. The core challenge therefore moves from harness engineering alone to loop engineering over the harness. In long-horizon coding, the loop must govern execution across task structure, state continuity, and regression pressure as dependent work accumulates.",
  },
  {
    heading: "Limitations of Existing Benchmarks.",
    body: "Existing benchmarks reflect this regime only partially. SWE-bench and its variants broaden repository level issue resolution along freshness, language coverage, and patch scale. Feature level benchmarks further expand the requested change. Their task abstraction nevertheless remains largely terminal: agents receive self contained issues or flat specifications and are judged by final task success. This design measures issue resolution ability but does not reveal whether an agent preserves intermediate obligations, avoids regressions, or follows a viable order through dependent subproblems. Diagnostic long horizon evaluation should expose intermediate development units, track accumulated obligations, and make execution order observable.",
  },
  {
    heading: "LoopsBench as a Benchmark for Loop Engineering Evaluation.",
    body: "LoopsBench addresses these requirements by representing each task as a dependency DAG whose nodes are source grounded development units and whose edges encode prerequisite relations. The graph makes intermediate units separately testable and provides a source recovered development order as a descriptive reference for sequencing analysis, not as a claim of optimality. The flow aware evaluation runtime releases ready frontier tests, keeps completed nodes active as regression obligations, and records a loop trace while leaving execution order open. LoopsBench contains 112 dependency-structured tasks from three authentic, real-world sources, with 29 PR Sequences, 57 Course Labs, and 26 Research Evolutions spanning 9 domains and 8 programming languages. The benchmark has a median dependency depth of 6 and more than 5,300 development units. This positions LoopsBench, to our knowledge, as the first benchmark for loop engineering evaluation, pairing explicit unit dependency DAGs with a flow-aware harness and loop trace diagnostics.",
  },
  {
    heading: "Takeaways.",
    body: "Three findings emerge. First, the strongest model and loop configuration resolves only 25.00% of LoopsBench. Second, evaluated loops omit prerequisite relations, produce longer patches, and author sparse tests. Third, context renewal differs across loop implementations, while regression events remain visible in every profile, identifying routing and state tracking as central limitations.",
  },
  {
    heading: "Contributions.",
    body: "LoopsBench provides a graph structured evaluation contract, a scalable task construction pipeline, and 112 source grounded long horizon tasks. Its trace based analysis separates model and loop effects while measuring planning, implementation, testing, routing, and state retention.",
  },
];

export const sources = [
  {
    count: "29",
    title: "PR Sequences",
    body: "Ordered pull request chains from real repositories, recovering prerequisite edges from merge history.",
  },
  {
    count: "57",
    title: "Course Labs",
    body: "University lab assignments with staged units and instructor test suites graded along a dependency order.",
  },
  {
    count: "26",
    title: "Research Evolutions",
    body: "Iterative research code, where later units build on earlier results across the project lifecycle.",
  },
];

export const comparisonRows = [
  { name: "LoopsBench", multi: true, dag: true, patch: "1,631", tests: "44", time: "6.6m", self: true },
  { name: "SWE-bench", multi: false, dag: false, patch: "33", tests: "9", time: "24.6d", self: false },
  { name: "SWE-bench Pro", multi: false, dag: false, patch: "462", tests: "38", time: "1.7m", self: false },
  { name: "FeatureBench", multi: true, dag: false, patch: "1,256", tests: "38", time: "19.5d", self: false },
  { name: "ProgramBench", multi: true, dag: false, patch: "2,104", tests: "52", time: "12.4d", self: false },
];
