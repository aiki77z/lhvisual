import { repoUrl } from "./paper";
import { generatedTaskStructureExample } from "./generatedContribution";

function withDefault(value: string | undefined, fallback: string) {
  return value && value.trim() ? value.trim() : fallback;
}

const viteEnv = (typeof import.meta !== "undefined" && import.meta.env)
  ? import.meta.env
  : undefined;

export const contributionLinks = {
  repoUrl,
  proposalUrl: withDefault(
    viteEnv?.VITE_TASK_PROPOSAL_URL,
    `${repoUrl}/issues/new?template=task-proposal.yml`,
  ),
  guideUrl: withDefault(
    viteEnv?.VITE_CONTRIBUTING_GUIDE_URL,
    `${repoUrl}/blob/main/CONTRIBUTING.md`,
  ),
  templateUrl: withDefault(
    viteEnv?.VITE_TASK_TEMPLATE_URL,
    `${repoUrl}/tree/main/tasks/_template`,
  ),
  exampleTaskUrl: withDefault(
    viteEnv?.VITE_EXAMPLE_TASK_URL,
    `${repoUrl}/tree/main/tasks/task_tcp_course_stack`,
  ),
};

export const contributionProcess = [
  {
    number: "01",
    title: "Review the criteria",
    body: "Read the contribution guide, inspect existing benchmark tasks, and confirm that the task has a real source, a clear long-horizon structure, and separately testable units.",
  },
  {
    number: "02",
    title: "Submit a proposal",
    body: "Open the GitHub Issue Form and describe the source repository, base revision, proposed modules, units, dependency DAG, and verification plan.",
  },
  {
    number: "03",
    title: "Build and validate",
    body: "After maintainer approval, fork the repository, initialize a task from the checked-in template, fill in the task files, and run the local validators plus Oracle.",
  },
  {
    number: "04",
    title: "Open a pull request",
    body: "Submit the complete task through GitHub Pull Request and link the approved Proposal issue. The task repository remains the only source of truth.",
  },
  {
    number: "05",
    title: "Review and publish",
    body: "Static checks, strict unit validation, Oracle, and maintainer review must all pass before the task can be merged and later published to Benchmarks.",
  },
];

export const taskCriteria = [
  {
    title: "Authentic source",
    body: "Trace the task back to a real development source such as a PR chain, course lab progression, research code evolution, or release milestone.",
  },
  {
    title: "Long-horizon development",
    body: "The task should require multiple coordinated units rather than a single isolated edit.",
  },
  {
    title: "Source-evidenced dependency DAG",
    body: "Every prerequisite edge should be justified by source evidence, not by an arbitrary contributor guess.",
  },
  {
    title: "Separately testable units",
    body: "Each unit needs a requirement, scope, prerequisites, and an acceptance signal that can be tested independently.",
  },
  {
    title: "Robust verification",
    body: "Base, partial, incorrect, and complete implementations must be distinguishable by the verifier.",
  },
  {
    title: "Reproducible environment",
    body: "The Docker environment and runtime dependencies must rebuild reliably on the harness.",
  },
  {
    title: "Legal redistribution",
    body: "Code, tests, patches, and any bundled data must be compatible with public benchmark distribution.",
  },
];

export const taskStructureExample = generatedTaskStructureExample;

export const contributionCommands = [
  {
    label: "Create from the checked-in template",
    note: "Copies tasks/_template/ into a new task directory so the file layout matches the repository conventions.",
    code: `pip install -e .
loopsbench tasks create task_my_new_case`,
  },
  {
    label: "Run static contribution validation",
    note: "Checks task.yaml, DAG files, requirement files, gold patch mappings, and path-safety constraints without running Docker.",
    code: "python3 scripts/validate_task_contribution.py --task-dir tasks/task_my_new_case --static-only",
  },
  {
    label: "Run the harness task validator",
    note: "Validates the core task manifest and required task files through the LoopsBench CLI.",
    code: "loopsbench tasks validate --task-id task_my_new_case",
  },
  {
    label: "Run strict unit / DAG validation",
    note: "Verifies the dependency order and fail-to-pass behavior for the unit-level patch sequence.",
    code: "python3 scripts/validate_per_pr.py --task-dir tasks/task_my_new_case --strict-fail-to-pass",
  },
  {
    label: "Run Oracle end-to-end",
    note: "Confirms that the gold solution resolves the task on the real harness before the PR is opened.",
    code: "loopsbench run --agent oracle --task-id task_my_new_case --dataset-path tasks --docker-image-strategy local-build",
  },
];

export const reviewPipeline = [
  "GitHub Proposal",
  "Proposal Approval",
  "Pull Request",
  "Static Checks",
  "Environment Build",
  "Base Validation",
  "Gold Validation",
  "Unit Validation",
  "Human Review",
  "Merge",
  "Publish",
];

export const contributionFaq = [
  {
    question: "What does the Proposal issue do?",
    answer: "The Proposal captures the task design, provenance, DAG plan, and verification strategy. It is not the vehicle for the finished task files.",
  },
  {
    question: "Can I upload a ZIP or finished task bundle on the website?",
    answer: "No. The website only links to the GitHub-native contribution flow. Full task files, tests, Docker setup, and gold patches must be submitted later through a Pull Request.",
  },
  {
    question: "What is the source repository URL?",
    answer: "Use the real upstream repository or source location that the task is derived from, so reviewers can verify provenance and dependency evidence.",
  },
  {
    question: "What is the source commit SHA?",
    answer: "Use the exact upstream source snapshot that the task is based on. It is not the merge commit that will later land in the LoopsBench repository.",
  },
  {
    question: "Where is the full task submitted?",
    answer: "The complete task is submitted through a GitHub Pull Request after the Proposal is approved and the local validators pass.",
  },
  {
    question: "Does Proposal approval guarantee the task will merge?",
    answer: "No. Proposal approval means the task idea is worth building, but the final task still has to pass CI, satisfy the verifier requirements, clear licensing review, and pass maintainer review.",
  },
];
