export const pipelinePhases = [
  {
    index: "01",
    label: "Native provenance",
    detail: "Authentic developer, educator, and researcher artifacts",
    anchor: "provenance",
  },
  {
    index: "02",
    label: "Task construction",
    detail: "Source-grounded units, dependency DAGs, and executable tests",
    anchor: "construction",
  },
  {
    index: "03",
    label: "Flow-aware evaluation",
    detail: "Ready-frontier release with persistent regression obligations",
    anchor: "evaluation",
  },
] as const;

export const sourceStreams = [
  {
    index: "A",
    title: "PR Sequences",
    provenance: "56 actively maintained repositories",
    body: "Full commit histories and merged pull-request streams preserve the order and structural evidence of real community development.",
    candidates: "148",
    released: "29",
    tone: "mint",
  },
  {
    index: "B",
    title: "Course Labs",
    provenance: "112 projects from 30 universities",
    body: "Complete native bundles retain handouts, skeleton code, and instructor-side reference tests across staged programming projects.",
    candidates: "112",
    released: "57",
    tone: "gold",
  },
  {
    index: "C",
    title: "Research Evolutions",
    provenance: "212 papers from 48 venues",
    body: "Citation closure recovers load-bearing inheritance edges around highly cited work with fully open-source official implementations.",
    candidates: "47",
    released: "26",
    tone: "coral",
  },
] as const;

export const constructionStages = [
  {
    index: "01",
    title: "Collect",
    detail: "Gather complete source artifacts from the three authentic, real-world provenance streams.",
    output: "source artifacts",
  },
  {
    index: "02",
    title: "Preprocess",
    detail: "Normalize heterogeneous histories, projects, and research clusters into atomic candidate tasks.",
    output: "candidate tasks",
  },
  {
    index: "03",
    title: "Select",
    detail: "Apply source-agnostic temporal-span and solution-scale thresholds to retain long-horizon work.",
    output: "112 tasks",
  },
  {
    index: "04",
    title: "Recover relations",
    detail: "Define separately testable development units and recover the dependency DAG that governs release.",
    output: "unit DAG",
  },
  {
    index: "05",
    title: "Instrument",
    detail: "Attach the public instruction, reproducible environment, and per-unit executable obligations.",
    output: "evaluation instance",
  },
] as const;

export const relationSignals = [
  {
    index: "01",
    title: "Historical sequence",
    detail: "Sequential PR chains along merged commit history.",
  },
  {
    index: "02",
    title: "Structural reuse",
    detail: "A later unit edits a file or symbol introduced earlier.",
  },
  {
    index: "03",
    title: "Producer → consumer",
    detail: "A unit calls or imports an authoritative definition created by a prerequisite.",
  },
  {
    index: "04",
    title: "Compositional layering",
    detail: "A unit extends a prerequisite class, schema, or interface.",
  },
] as const;

export const unitFields = [
  ["r", "requirement"],
  ["s", "file or symbol scope"],
  ["p", "prerequisite set"],
  ["Δ", "reference patch"],
  ["T", "standard tests"],
] as const;

export const instrumentationTracks = [
  {
    index: "I",
    title: "Instruction formalization",
    body: "Recover the developer's acceptance intent from the gold diff while withholding concrete edit locations and implementation structure.",
    output: "public contract",
  },
  {
    index: "II",
    title: "Environment synthesis",
    body: "Traverse the source frame, collect runtime dependencies, and write a Dockerfile plus docker-compose.yaml when services span containers.",
    output: "reproducible runtime",
  },
  {
    index: "III",
    title: "Test materialization",
    body: "Traverse the DAG in topological order and author each unit's tests against the prerequisite state used for ready-frontier release.",
    output: "executable obligations",
  },
] as const;

export const validationTrials = [
  {
    title: "Solvability",
    detail: "The full gold solution flips every test to pass.",
  },
  {
    title: "Non-triviality",
    detail: "The empty workspace flips none of the tests to pass.",
  },
  {
    title: "Discriminativeness",
    detail: "The unit's DAG ancestors alone leave at least one test failing.",
  },
] as const;
