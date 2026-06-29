export const repoUrl = "https://github.com/aiki77z/lhvisual";
export const paperUrl = "#";
export const datasetUrl = "#";

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

export const affiliations = "Microsoft · Nanjing University · University College London";

export const stats = [
  { value: "112", label: "dependency tasks" },
  { value: "5,300+", label: "development units" },
  { value: "8", label: "languages" },
  { value: "9", label: "domains" },
  { value: "6", label: "median DAG depth" },
  { value: "25.00%", label: "top resolve rate" },
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
