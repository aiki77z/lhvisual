import { toAppPath } from "./site";
import type { BenchmarkTaskDetail, BenchmarksIndexPayload } from "../types/benchmarks";

const cache = new Map<string, Promise<unknown>>();

async function fetchJson<T>(path: string): Promise<T> {
  const url = toAppPath(path);
  const existing = cache.get(url);
  if (existing) {
    return existing as Promise<T>;
  }

  const request = fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load benchmark data: ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
  });

  cache.set(url, request);
  return request;
}

export function getBenchmarksIndex() {
  return fetchJson<BenchmarksIndexPayload>("/benchmarks-data/index.json");
}

export function getBenchmarkTask(taskId: string) {
  return fetchJson<BenchmarkTaskDetail>(`/benchmarks-data/tasks/${encodeURIComponent(taskId)}.json`);
}
