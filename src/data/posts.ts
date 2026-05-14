export type BlogMetric = {
  label: string;
  value: string;
  description: string;
};

export type BlogResultRow = {
  system: string;
  benchmark: string;
  resolved: string;
  note: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  subtitle: string;
  date: string;
  authors: string[];
  excerpt: string;
  metrics: BlogMetric[];
  resultRows: BlogResultRow[];
  note: string;
  sections: Array<{
    heading: string;
    body: string[];
  }>;
  citation: string;
};

export const posts: BlogPost[] = [
  {
    slug: "benchmarking-coding-agents",
    title: "Benchmarking Coding Agents on Real-World Software Tasks",
    subtitle:
      "A technical report on evaluating coding agents with leaderboard-driven metrics.",
    date: "May 2026",
    authors: ["Team Benchmark", "Contributors"],
    excerpt:
      "A compact report describing how coding agents are evaluated across realistic repository tasks, verified patches, and reproducible leaderboard submissions.",
    metrics: [
      {
        label: "Implementation",
        value: "312",
        description: "Tasks requiring repository edits and passing tests.",
      },
      {
        label: "Research",
        value: "84",
        description: "Tasks requiring issue triage and source localization.",
      },
      {
        label: "Performance",
        value: "47",
        description: "Tasks where correctness and runtime both matter.",
      },
    ],
    resultRows: [
      {
        system: "CodeAgent Alpha",
        benchmark: "Verified",
        resolved: "76.80%",
        note: "Highest mock verified score.",
      },
      {
        system: "PatchRunner",
        benchmark: "Verified",
        resolved: "72.40%",
        note: "Strong patch generation baseline.",
      },
      {
        system: "Longhorizen Solver",
        benchmark: "Verified",
        resolved: "68.90%",
        note: "Open-source reference submission.",
      },
    ],
    note:
      "This scaffold uses mock measurements only. The intent is to preserve the information architecture of a benchmark report while keeping data boundaries explicit.",
    sections: [
      {
        heading: "Introduction",
        body: [
          "Modern coding agents are increasingly evaluated in settings that look less like isolated programming puzzles and more like realistic maintenance work. A useful benchmark should therefore describe the repository context, the issue signal, and the standards used to accept or reject a patch.",
          "This mock report sketches the shape of such an evaluation. It emphasizes compact tables, transparent metadata, and a separation between submitted results and verified results.",
        ],
      },
      {
        heading: "Benchmark Design",
        body: [
          "The benchmark is organized around task families rather than model families. Each task includes an issue description, repository snapshot, evaluation harness, and acceptance criteria. Agents are compared by resolved percentage, with optional tags for open-source systems and newly submitted runs.",
          "The leaderboard view intentionally keeps filters close to the table. This makes it easier to audit which benchmark split, model class, and verification level is being examined.",
        ],
      },
      {
        heading: "Results",
        body: [
          "The table below mirrors the primary leaderboard metric in a narrower article format. It is not a separate source of truth; in a production system, both the dashboard and report would read from shared result data.",
          "Scores are reported as resolved percentages. A verified label indicates that a result has passed the review process defined by the benchmark maintainers.",
        ],
      },
      {
        heading: "Qualitative Analysis",
        body: [
          "The best-performing agents tend to combine repository retrieval, test-aware iteration, and conservative patch generation. Lower-scoring runs often fail at source localization before patching begins, which suggests that retrieval quality remains a major bottleneck.",
          "Open-source systems provide useful baselines because they make the evaluation process more inspectable. Proprietary systems may reach higher scores, but the submission record should still expose enough metadata for comparison.",
        ],
      },
      {
        heading: "Future Work",
        body: [
          "Future iterations should separate deterministic task outcomes from human-reviewed metadata, add longitudinal score tracking, and expose reproducibility artifacts for each submission.",
          "The scaffold is deliberately data-first so that a real API can replace mock arrays without changing the page hierarchy.",
        ],
      },
      {
        heading: "Citation",
        body: [
          "If this were a real benchmark report, this section would include a stable citation, dataset version, and archival reference for the evaluated task set.",
        ],
      },
    ],
    citation:
      "@misc{longhorizenbench_scaffold_2026, title={Benchmarking Coding Agents on Real-World Software Tasks}, author={Team Benchmark}, year={2026}, note={Mock frontend scaffold}}",
  },
  {
    slug: "leaderboard-methodology",
    title: "Leaderboard Methodology and Verification Notes",
    subtitle:
      "How benchmark splits, verification status, and result metadata should fit together.",
    date: "April 2026",
    authors: ["Evaluation Working Group"],
    excerpt:
      "A short methodology memo for interpreting verified runs, open-source baselines, and benchmark split comparisons.",
    metrics: [
      {
        label: "Splits",
        value: "5",
        description: "Benchmark tracks represented in the scaffold.",
      },
      {
        label: "Review states",
        value: "3",
        description: "Submitted, verified, and archived result states.",
      },
      {
        label: "Metadata fields",
        value: "12",
        description: "Core fields required for a comparable submission.",
      },
    ],
    resultRows: [
      {
        system: "Research Harness",
        benchmark: "Full",
        resolved: "54.60%",
        note: "Full split reference run.",
      },
      {
        system: "OpenFix Agent",
        benchmark: "Lite",
        resolved: "62.30%",
        note: "Open-source lite split run.",
      },
      {
        system: "VisionPatch",
        benchmark: "Multimodal",
        resolved: "46.20%",
        note: "Multimodal preview run.",
      },
    ],
    note:
      "Verification should be treated as a status attached to a submission, not as a replacement for the original reported score.",
    sections: [
      {
        heading: "Scope",
        body: [
          "Leaderboard methodology is most useful when it explains what a score includes and what it excludes. This mock article separates benchmark split, verification status, and model openness as independent dimensions.",
          "The dashboard filters are intentionally simple. They model the first layer of analysis without implying that all comparisons are equally meaningful.",
        ],
      },
      {
        heading: "Verification",
        body: [
          "A verified run should have a reproducible task set, a clear agent configuration, and enough logs to audit failures. The exact verification process can evolve, but the UI should make the state visible at a glance.",
        ],
      },
      {
        heading: "Reporting",
        body: [
          "Reports should use the same source data as the leaderboard whenever possible. This avoids drift between narrative summaries and dashboard values.",
        ],
      },
    ],
    citation:
      "@misc{leaderboard_methodology_2026, title={Leaderboard Methodology and Verification Notes}, author={Evaluation Working Group}, year={2026}}",
  },
  {
    slug: "release-notes",
    title: "Release Notes for the Benchmark Scaffold",
    subtitle:
      "A concise changelog for the initial mock leaderboard and technical report pages.",
    date: "March 2026",
    authors: ["Team Benchmark"],
    excerpt:
      "Initial mock data, benchmark tabs, sortable results, and article primitives for future technical writing.",
    metrics: [
      {
        label: "Pages",
        value: "4",
        description: "Leaderboard, alias route, blog index, and article detail.",
      },
      {
        label: "Components",
        value: "12+",
        description: "Reusable layout, table, filter, and article components.",
      },
      {
        label: "API calls",
        value: "0",
        description: "All content is local mock data.",
      },
    ],
    resultRows: [
      {
        system: "Baseline Agent",
        benchmark: "Full",
        resolved: "38.40%",
        note: "Example baseline entry.",
      },
      {
        system: "Mini Agent",
        benchmark: "Lite",
        resolved: "51.20%",
        note: "Small-model mock run.",
      },
      {
        system: "UI Repair Agent",
        benchmark: "Multimodal",
        resolved: "39.80%",
        note: "Visual repair mock run.",
      },
    ],
    note:
      "These notes are mock content. Replace them with generated release notes or manually authored posts when the content pipeline exists.",
    sections: [
      {
        heading: "Initial Surface",
        body: [
          "The first scaffold includes a research-style homepage, benchmark tabs, filters, selection state, and a compact data table.",
        ],
      },
      {
        heading: "Writing Primitives",
        body: [
          "Article pages include a restrained header, prose sections, metrics, result tables, notes, and citation blocks.",
        ],
      },
      {
        heading: "Next Steps",
        body: [
          "The next integration step is to replace local mock arrays with typed fetchers while preserving the component interfaces.",
        ],
      },
    ],
    citation:
      "@misc{benchmark_scaffold_release_notes_2026, title={Release Notes for the Benchmark Scaffold}, author={Team Benchmark}, year={2026}}",
  },
];
