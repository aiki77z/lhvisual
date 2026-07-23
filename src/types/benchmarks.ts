export type BenchmarkFilterOption = {
  value: string;
  count: number;
};

export type DagPreviewModuleLayer = {
  layer: number;
  nodeCount: number;
  locTotal: number;
  filesTotal: number;
  incomingEdges: number;
  outgoingEdges: number;
};

export type DagPreviewModuleLayerLink = {
  fromLayer: number;
  toLayer: number;
  count: number;
};

export type DagPreviewUnitLayer = {
  layer: number;
  unitCount: number;
  testedUnitCount: number;
};

export type BenchmarkTaskSummary = {
  id: string;
  taskName: string;
  title: string;
  summary: string;
  instructionPreview: string;
  category: string;
  difficulty: string;
  tags: string[];
  authorName: string;
  repoUrl: string;
  taskPath: string;
  moduleNodeCount: number;
  moduleEdgeCount: number;
  moduleLayerCount: number;
  moduleLocTotal: number;
  moduleFilesTotal: number;
  unitCount: number;
  unitLayerCount: number;
  testedUnitCount: number;
  testedUnitRatio: number;
  expertTimeEstimateMin: number;
  juniorTimeEstimateMin: number;
  dagPreview: {
    moduleLayers: DagPreviewModuleLayer[];
    moduleLayerLinks: DagPreviewModuleLayerLink[];
    unitLayers: DagPreviewUnitLayer[];
  };
};

export type BenchmarksIndexPayload = {
  benchmark: {
    id: string;
    name: string;
    description: string;
    taskCount: number;
    categoryCount: number;
    tagCount: number;
    totalUnits: number;
    totalTestedUnits: number;
    medianUnitLayers: number;
    medianModuleLayers: number;
  };
  filters: {
    categories: BenchmarkFilterOption[];
    difficulties: BenchmarkFilterOption[];
    tags: BenchmarkFilterOption[];
  };
  tasks: BenchmarkTaskSummary[];
};

export type ModuleDagNode = {
  id: string;
  label: string;
  path: string;
  description: string;
  filesCount: number;
  loc: number;
  implOrder: number;
  layer: number;
  indegree: number;
  outdegree: number;
};

export type ModuleDagEdge = {
  from: string;
  to: string;
  label: string;
};

export type ModuleDagDetail = {
  project: string;
  description: string;
  nodeCount: number;
  edgeCount: number;
  layerCount: number;
  layers: DagPreviewModuleLayer[];
  layerLinks: DagPreviewModuleLayerLink[];
  nodes: ModuleDagNode[];
  edges: ModuleDagEdge[];
  moduleLocTotal: number;
  moduleFilesTotal: number;
};

export type UnitDagDetail = {
  totalUnits: number;
  layerCount: number;
  edgeCount: number;
  testedUnits: number;
  layers: DagPreviewUnitLayer[];
};

export type BenchmarkTaskDetail = {
  id: string;
  taskName: string;
  title: string;
  summary: string;
  instructionPreview: string;
  instruction: string;
  category: string;
  difficulty: string;
  tags: string[];
  authorName: string;
  authorEmail: string | null;
  repoUrl: string;
  taskPath: string;
  parserName: string;
  maxAgentTimeoutSec: number;
  maxTestTimeoutSec: number;
  runTestsInSameShell: boolean;
  expertTimeEstimateMin: number;
  juniorTimeEstimateMin: number;
  moduleDag: ModuleDagDetail;
  unitDag: UnitDagDetail;
};
