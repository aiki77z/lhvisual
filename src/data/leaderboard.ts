export type SweepName = "model" | "loop";
export type DifficultyName = "easy" | "medium" | "hard";

export type DifficultyScore = {
  difficulty: DifficultyName;
  resolved: number;
  total: number;
  rr: number;
};

export type LeaderboardEntry = {
  id: string;
  rank: number;
  sweep: SweepName;
  model: string;
  family: string;
  loop: string;
  rrBase: number;
  rrLoop: number;
  tprBase: number;
  tprLoop: number;
  depth: number;
  tokens: number;
  oss: boolean;
  difficultyScores: DifficultyScore[];
};

export const sweeps: { id: SweepName; label: string; detail: string }[] = [
  { id: "model", label: "Model sweep", detail: "Fixed loop: Claude Code" },
  { id: "loop", label: "Loop sweep", detail: "Fixed model: gpt-5.4" },
];

export const difficultyBuckets: { id: DifficultyName; label: string; total: number }[] = [
  { id: "easy", label: "Easy", total: 17 },
  { id: "medium", label: "Medium", total: 43 },
  { id: "hard", label: "Hard", total: 52 },
];

function difficultyScores(easyResolved: number, mediumResolved: number, hardResolved: number): DifficultyScore[] {
  const resolvedByDifficulty: Record<DifficultyName, number> = {
    easy: easyResolved,
    medium: mediumResolved,
    hard: hardResolved,
  };

  return difficultyBuckets.map((bucket) => ({
    difficulty: bucket.id,
    resolved: resolvedByDifficulty[bucket.id],
    total: bucket.total,
    rr: (resolvedByDifficulty[bucket.id] / bucket.total) * 100,
  }));
}

// RR/TPR reported with and without the outer evaluation loop. Source: paper Table 1 (RQ1).
export const leaderboardEntries: LeaderboardEntry[] = [
  {
    id: "opus-4-7",
    rank: 1,
    sweep: "model",
    model: "Opus-4.7",
    family: "Claude",
    loop: "Claude Code",
    rrBase: 16.96,
    rrLoop: 25.0,
    tprBase: 41.18,
    tprLoop: 53.05,
    depth: 0.61,
    tokens: 6.91,
    oss: false,
    difficultyScores: difficultyScores(10, 13, 5),
  },
  {
    id: "gpt-5-5",
    rank: 2,
    sweep: "model",
    model: "GPT-5.5",
    family: "GPT",
    loop: "Claude Code",
    rrBase: 13.39,
    rrLoop: 20.54,
    tprBase: 38.04,
    tprLoop: 49.3,
    depth: 0.47,
    tokens: 7.18,
    oss: false,
    difficultyScores: difficultyScores(9, 10, 4),
  },
  {
    id: "glm-5-1",
    rank: 3,
    sweep: "model",
    model: "GLM-5.1",
    family: "GLM",
    loop: "Claude Code",
    rrBase: 13.39,
    rrLoop: 18.75,
    tprBase: 34.55,
    tprLoop: 45.49,
    depth: 0.44,
    tokens: 4.37,
    oss: true,
    difficultyScores: difficultyScores(8, 9, 4),
  },
  {
    id: "deepseek-v4p",
    rank: 4,
    sweep: "model",
    model: "DeepSeek-V4P",
    family: "DeepSeek",
    loop: "Claude Code",
    rrBase: 11.61,
    rrLoop: 18.75,
    tprBase: 36.07,
    tprLoop: 47.34,
    depth: 0.46,
    tokens: 3.59,
    oss: true,
    difficultyScores: difficultyScores(8, 9, 4),
  },
  {
    id: "gemini-3-1-pro",
    rank: 5,
    sweep: "model",
    model: "Gemini-3.1-Pro",
    family: "Gemini",
    loop: "Claude Code",
    rrBase: 8.93,
    rrLoop: 14.29,
    tprBase: 32.86,
    tprLoop: 43.59,
    depth: 0.31,
    tokens: 4.99,
    oss: false,
    difficultyScores: difficultyScores(7, 7, 2),
  },
  {
    id: "qwen3-6-plus",
    rank: 6,
    sweep: "model",
    model: "Qwen3.6-Plus",
    family: "Qwen",
    loop: "Claude Code",
    rrBase: 6.25,
    rrLoop: 9.82,
    tprBase: 36.43,
    tprLoop: 47.5,
    depth: 0.34,
    tokens: 4.25,
    oss: true,
    difficultyScores: difficultyScores(5, 5, 1),
  },
  {
    id: "kimi-2-6",
    rank: 7,
    sweep: "model",
    model: "Kimi-2.6",
    family: "Kimi",
    loop: "Claude Code",
    rrBase: 3.57,
    rrLoop: 6.25,
    tprBase: 21.27,
    tprLoop: 28.33,
    depth: 0.14,
    tokens: 2.02,
    oss: true,
    difficultyScores: difficultyScores(4, 2, 1),
  },
  {
    id: "grok-4-1-fr",
    rank: 8,
    sweep: "model",
    model: "Grok-4.1-FR",
    family: "Grok",
    loop: "Claude Code",
    rrBase: 2.68,
    rrLoop: 4.46,
    tprBase: 23.32,
    tprLoop: 30.97,
    depth: 0.15,
    tokens: 1.83,
    oss: false,
    difficultyScores: difficultyScores(3, 1, 1),
  },
  {
    id: "codex",
    rank: 1,
    sweep: "loop",
    model: "gpt-5.4",
    family: "Codex",
    loop: "Codex",
    rrBase: 13.39,
    rrLoop: 18.75,
    tprBase: 37.84,
    tprLoop: 49.06,
    depth: 0.49,
    tokens: 7.94,
    oss: false,
    difficultyScores: difficultyScores(8, 9, 4),
  },
  {
    id: "claude-code",
    rank: 2,
    sweep: "loop",
    model: "gpt-5.4",
    family: "Claude Code",
    loop: "Claude Code",
    rrBase: 12.5,
    rrLoop: 17.86,
    tprBase: 36.97,
    tprLoop: 48.21,
    depth: 0.42,
    tokens: 7.03,
    oss: false,
    difficultyScores: difficultyScores(8, 8, 4),
  },
  {
    id: "github-copilot",
    rank: 3,
    sweep: "loop",
    model: "gpt-5.4",
    family: "GitHub Copilot",
    loop: "GitHub Copilot",
    rrBase: 10.71,
    rrLoop: 15.18,
    tprBase: 34.21,
    tprLoop: 45.46,
    depth: 0.38,
    tokens: 8.26,
    oss: false,
    difficultyScores: difficultyScores(7, 7, 3),
  },
  {
    id: "openhands",
    rank: 4,
    sweep: "loop",
    model: "gpt-5.4",
    family: "OpenHands",
    loop: "OpenHands",
    rrBase: 6.25,
    rrLoop: 9.82,
    tprBase: 29.21,
    tprLoop: 39.3,
    depth: 0.2,
    tokens: 6.75,
    oss: true,
    difficultyScores: difficultyScores(5, 4, 2),
  },
  {
    id: "swe-agent",
    rank: 5,
    sweep: "loop",
    model: "gpt-5.4",
    family: "SWE-agent",
    loop: "SWE-agent",
    rrBase: 5.36,
    rrLoop: 8.93,
    tprBase: 28.07,
    tprLoop: 38.11,
    depth: 0.16,
    tokens: 7.18,
    oss: true,
    difficultyScores: difficultyScores(4, 4, 2),
  },
  {
    id: "mini-swe-agent",
    rank: 6,
    sweep: "loop",
    model: "gpt-5.4",
    family: "mini-swe-agent",
    loop: "mini-swe-agent",
    rrBase: 4.46,
    rrLoop: 7.14,
    tprBase: 25.96,
    tprLoop: 35.2,
    depth: 0.13,
    tokens: 8.86,
    oss: true,
    difficultyScores: difficultyScores(4, 3, 1),
  },
];
