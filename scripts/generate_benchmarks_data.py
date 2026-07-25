#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
from collections import Counter, defaultdict, deque
from pathlib import Path
from statistics import median

import yaml

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_ROOT = REPO_ROOT / "public" / "benchmarks-data"
DEFAULT_REPO_URL = "https://github.com/microsoft/Loopsbench"
TITLE_ACRONYMS = {
    "afl": "AFL",
    "ansible": "Ansible",
    "bpf": "BPF",
    "cpa": "CPA",
    "cvc": "CVC",
    "dafny": "Dafny",
    "db": "DB",
    "django": "Django",
    "echarts": "ECharts",
    "evosuite": "EvoSuite",
    "frama": "Frama",
    "gem5": "gem5",
    "godot": "Godot",
    "jenkins": "Jenkins",
    "jpf": "JPF",
    "ligra": "Ligra",
    "linux011": "Linux 0.11",
    "llvm": "LLVM",
    "lsm": "LSM",
    "mininet": "Mininet",
    "ml": "ML",
    "mlir": "MLIR",
    "mlsys": "MLSys",
    "monogame": "MonoGame",
    "mysql": "MySQL",
    "navidrome": "Navidrome",
    "nodebb": "NodeBB",
    "numpy": "NumPy",
    "os": "OS",
    "rdma": "RDMA",
    "riscv": "RISC-V",
    "rustlike": "Rust-like",
    "scotty3d": "Scotty3D",
    "seg": "Segment",
    "smt": "SMT",
    "souffle": "Souffle",
    "sysy": "SysY",
    "tcp": "TCP",
    "typescript": "TypeScript",
}
BOILERPLATE_PREFIXES = (
    "you are an autonomous engineer.",
    "the repository at /workspace is at an earlier state of a real-world project.",
    "your working directory is /workspace.",
    "your working directory is `/workspace`.",
    "the project code is already present.",
    "the project code is already present under",
    "the full source tree is already present under",
    "implement the following modules:",
    "the following modules need to be implemented",
    "the tests also depend on these signatures and entry points:",
    "the following functions are called directly by the test suite.",
)


def _default_tasks_root() -> Path:
    candidates = (
        REPO_ROOT.parent / "tasks",
        REPO_ROOT.parent.parent / "tasks",
        Path("/sdb-disk/lih/lh/tasks"),
    )
    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()
    return candidates[0].resolve()


DEFAULT_TASKS_ROOT = _default_tasks_root()


def _tasks_root() -> Path:
    return Path(os.environ.get("LOOPSBENCH_BENCHMARK_TASKS_ROOT", DEFAULT_TASKS_ROOT)).resolve()


def _output_root() -> Path:
    return Path(
        os.environ.get("LOOPSBENCH_BENCHMARK_OUTPUT_ROOT", DEFAULT_OUTPUT_ROOT)
    ).resolve()


def _repo_url() -> str:
    value = os.environ.get("LOOPSBENCH_BENCHMARK_REPO_URL", DEFAULT_REPO_URL).strip()
    return value or DEFAULT_REPO_URL


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def _plain_text(value: str) -> str:
    lines: list[str] = []
    for raw_line in value.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        line = re.sub(r"^\s{0,3}#{1,6}\s+", "", raw_line)
        line = re.sub(r"^\s{0,3}>\s?", "", line)
        line = re.sub(r"^\s*[-*+]\s+", "", line)
        line = re.sub(r"\*\*([^*]+)\*\*", r"\1", line)
        line = re.sub(r"__([^_]+)__", r"\1", line)
        line = re.sub(r"`([^`]+)`", r"\1", line)
        line = _normalize_text(line)
        lines.append(line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def _pick_instruction_preview(instruction: str) -> str:
    return _truncate_summary(_pick_instruction_summary(instruction), max_length=220)


def _pick_instruction_summary(instruction: str) -> str:
    blocks = _meaningful_instruction_blocks(instruction)
    if not blocks:
        return _truncate_summary(_normalize_text(_plain_text(instruction)))

    summary = blocks[0]
    if len(summary) < 140 and len(blocks) > 1:
        candidate = f"{summary} {blocks[1]}"
        if len(candidate) <= 360:
            return _truncate_summary(candidate)
    return _truncate_summary(summary)


def _is_boilerplate_block(value: str) -> bool:
    lowered = value.lower()
    return any(lowered.startswith(prefix) for prefix in BOILERPLATE_PREFIXES)


def _meaningful_instruction_blocks(instruction: str) -> list[str]:
    meaningful: list[str] = []
    blocks = [block.strip() for block in re.split(r"\n\s*\n", instruction.strip()) if block.strip()]
    for block in blocks:
        normalized = _normalize_text(_plain_text(block))
        if not normalized or _is_boilerplate_block(normalized):
            continue
        meaningful.append(normalized)
    return meaningful


def _humanize_task_name(value: str) -> str:
    normalized = re.sub(r"^task_", "", value).strip("_")
    if not normalized:
        return value

    normalized = re.sub(r"[_-]+", " ", normalized)
    humanized: list[str] = []

    for token in normalized.split():
        lower = token.lower()
        if lower in TITLE_ACRONYMS:
            humanized.append(TITLE_ACRONYMS[lower])
        elif token.isdigit():
            humanized.append(token)
        elif re.fullmatch(r"seg\d+", lower):
            humanized.append(f"Segment {token[3:]}")
        elif re.search(r"[A-Z]", token[1:]):
            humanized.append(token)
        else:
            humanized.append(token.capitalize())

    return " ".join(humanized)


def _truncate_summary(value: str, *, max_length: int = 280) -> str:
    normalized = _normalize_text(value)
    if len(normalized) <= max_length:
        return normalized

    sentences = [sentence.strip() for sentence in re.split(r"(?<=[.!?])\s+", normalized) if sentence.strip()]
    collected: list[str] = []
    for sentence in sentences:
        candidate = " ".join(collected + [sentence]).strip()
        if len(candidate) > max_length:
            break
        collected.append(sentence)
        if len(candidate) >= int(max_length * 0.7):
            return candidate

    if collected:
        return " ".join(collected)

    trimmed = normalized[: max_length + 1].rsplit(" ", 1)[0].rstrip(",;:")
    return f"{trimmed}…"


def _safe_author_name(task: dict) -> str:
    raw = _normalize_text(str(task.get("author_name") or ""))
    if not raw:
        return "Unknown contributor"
    if raw == "LHB Dataset Author":
        return "LoopsBench dataset author"
    return raw


def _safe_author_email(task: dict) -> str | None:
    raw = _normalize_text(str(task.get("author_email") or ""))
    if not raw or raw.endswith("@long-horizon-bench.example"):
        return None
    return raw


def _compute_module_layers(nodes: list[dict], edges: list[dict]) -> tuple[dict[str, int], list[dict], list[dict]]:
    node_ids = [str(node["id"]) for node in nodes]
    indegree = {node_id: 0 for node_id in node_ids}
    outgoing: dict[str, list[str]] = defaultdict(list)
    incoming: dict[str, list[str]] = defaultdict(list)

    for edge in edges:
        source = str(edge["from"])
        target = str(edge["to"])
        if source not in indegree or target not in indegree:
            continue
        indegree[target] += 1
        outgoing[source].append(target)
        incoming[target].append(source)

    queue: deque[str] = deque(sorted(node_id for node_id, degree in indegree.items() if degree == 0))
    layer_by_id = {node_id: 0 for node_id in queue}
    indegree_left = dict(indegree)
    visited: list[str] = []

    while queue:
        node_id = queue.popleft()
        visited.append(node_id)
        current_layer = layer_by_id.get(node_id, 0)
        for target in outgoing.get(node_id, []):
            layer_by_id[target] = max(layer_by_id.get(target, 0), current_layer + 1)
            indegree_left[target] -= 1
            if indegree_left[target] == 0:
                queue.append(target)

    if len(visited) != len(node_ids):
        for node_id in node_ids:
            layer_by_id.setdefault(node_id, 0)

    layer_stats: dict[int, dict] = {}
    for node in nodes:
        node_id = str(node["id"])
        layer = layer_by_id.get(node_id, 0)
        stats = layer_stats.setdefault(
            layer,
            {
                "layer": layer,
                "nodeCount": 0,
                "locTotal": 0,
                "filesTotal": 0,
                "incomingEdges": 0,
                "outgoingEdges": 0,
            },
        )
        stats["nodeCount"] += 1
        stats["locTotal"] += int(node.get("loc") or 0)
        stats["filesTotal"] += int(node.get("files_count") or 0)
        stats["incomingEdges"] += len(incoming.get(node_id, []))
        stats["outgoingEdges"] += len(outgoing.get(node_id, []))

    layer_links: Counter[tuple[int, int]] = Counter()
    for edge in edges:
        source = str(edge["from"])
        target = str(edge["to"])
        layer_links[(layer_by_id.get(source, 0), layer_by_id.get(target, 0))] += 1

    return (
        layer_by_id,
        [layer_stats[key] for key in sorted(layer_stats)],
        [
            {
                "fromLayer": from_layer,
                "toLayer": to_layer,
                "count": count,
            }
            for (from_layer, to_layer), count in sorted(layer_links.items())
        ],
    )


def _compute_unit_layer_stats(unit_dag: dict) -> tuple[list[dict], int]:
    layers: dict[int, dict] = {}
    tested_units = 0
    for node in unit_dag.get("nodes", []):
        layer = int(node.get("layer") or 0)
        stats = layers.setdefault(
            layer,
            {
                "layer": layer,
                "unitCount": 0,
                "testedUnitCount": 0,
            },
        )
        stats["unitCount"] += 1
        if bool(node.get("has_tests")):
            stats["testedUnitCount"] += 1
            tested_units += 1
    return [layers[key] for key in sorted(layers)], tested_units


def _build_task_payload(task_dir: Path, *, repo_url: str) -> tuple[dict, dict]:
    task_yaml = yaml.safe_load((task_dir / "task.yaml").read_text(encoding="utf-8"))
    module_dag = yaml.safe_load((task_dir / "module_dag.yaml").read_text(encoding="utf-8"))
    unit_dag = json.loads((task_dir / "unit_dag.json").read_text(encoding="utf-8"))

    module_nodes_raw = list(module_dag.get("nodes") or [])
    module_edges_raw = list(module_dag.get("edges") or [])
    unit_layers, tested_units = _compute_unit_layer_stats(unit_dag)
    module_layers_by_id, module_layers, module_layer_links = _compute_module_layers(module_nodes_raw, module_edges_raw)

    module_nodes = []
    outdegree = Counter(str(edge["from"]) for edge in module_edges_raw)
    indegree = Counter(str(edge["to"]) for edge in module_edges_raw)
    for node in module_nodes_raw:
        node_id = str(node["id"])
        module_nodes.append(
            {
                "id": node_id,
                "label": _normalize_text(_plain_text(str(node.get("label") or node_id))),
                "path": str(node.get("path") or "."),
                "description": _normalize_text(_plain_text(str(node.get("description") or ""))),
                "filesCount": int(node.get("files_count") or 0),
                "loc": int(node.get("loc") or 0),
                "implOrder": int(node.get("impl_order") or 0),
                "layer": module_layers_by_id.get(node_id, 0),
                "indegree": indegree[node_id],
                "outdegree": outdegree[node_id],
            }
        )

    module_edges = [
        {
            "from": str(edge["from"]),
            "to": str(edge["to"]),
            "label": _normalize_text(_plain_text(str(edge.get("label") or ""))),
        }
        for edge in module_edges_raw
    ]

    task_name = str(task_yaml.get("task_name") or task_dir.name)
    title = _normalize_text(_plain_text(str(module_dag.get("project") or ""))) or _humanize_task_name(task_name)
    instruction = _plain_text(str(task_yaml.get("instruction") or ""))
    summary = _pick_instruction_summary(instruction)
    instruction_preview = _pick_instruction_preview(instruction)
    module_description = _normalize_text(_plain_text(str(module_dag.get("description") or ""))) or summary
    tags = [str(tag) for tag in task_yaml.get("tags", []) if str(tag).strip()]
    module_loc_total = sum(node["loc"] for node in module_nodes)
    module_files_total = sum(node["filesCount"] for node in module_nodes)

    detail = {
        "id": task_dir.name,
        "taskName": task_name,
        "title": title,
        "summary": summary,
        "instructionPreview": instruction_preview,
        "instruction": instruction,
        "category": str(task_yaml.get("category") or "unknown"),
        "difficulty": str(task_yaml.get("difficulty") or "unknown"),
        "tags": tags,
        "authorName": _safe_author_name(task_yaml),
        "authorEmail": _safe_author_email(task_yaml),
        "repoUrl": f"{repo_url}/tree/main/tasks/{task_dir.name}",
        "taskPath": f"tasks/{task_dir.name}",
        "parserName": str(task_yaml.get("parser_name") or "unknown"),
        "maxAgentTimeoutSec": int(task_yaml.get("max_agent_timeout_sec") or 0),
        "maxTestTimeoutSec": float(task_yaml.get("max_test_timeout_sec") or 0),
        "runTestsInSameShell": bool(task_yaml.get("run_tests_in_same_shell")),
        "expertTimeEstimateMin": int(task_yaml.get("expert_time_estimate_min") or 0),
        "juniorTimeEstimateMin": int(task_yaml.get("junior_time_estimate_min") or 0),
        "moduleDag": {
            "project": title,
            "description": module_description,
            "nodeCount": len(module_nodes),
            "edgeCount": len(module_edges),
            "layerCount": len(module_layers),
            "layers": module_layers,
            "layerLinks": module_layer_links,
            "nodes": module_nodes,
            "edges": module_edges,
            "moduleLocTotal": module_loc_total,
            "moduleFilesTotal": module_files_total,
        },
        "unitDag": {
            "totalUnits": int(unit_dag.get("total_units") or len(unit_dag.get("nodes", []))),
            "layerCount": int(unit_dag.get("num_layers") or len(unit_layers)),
            "edgeCount": len(unit_dag.get("edges", [])),
            "testedUnits": tested_units,
            "layers": unit_layers,
        },
    }

    summary_entry = {
        "id": detail["id"],
        "taskName": detail["taskName"],
        "title": detail["title"],
        "summary": detail["summary"],
        "instructionPreview": detail["instructionPreview"],
        "category": detail["category"],
        "difficulty": detail["difficulty"],
        "tags": detail["tags"],
        "authorName": detail["authorName"],
        "repoUrl": detail["repoUrl"],
        "taskPath": detail["taskPath"],
        "moduleNodeCount": detail["moduleDag"]["nodeCount"],
        "moduleEdgeCount": detail["moduleDag"]["edgeCount"],
        "moduleLayerCount": detail["moduleDag"]["layerCount"],
        "moduleLocTotal": detail["moduleDag"]["moduleLocTotal"],
        "moduleFilesTotal": detail["moduleDag"]["moduleFilesTotal"],
        "unitCount": detail["unitDag"]["totalUnits"],
        "unitLayerCount": detail["unitDag"]["layerCount"],
        "testedUnitCount": detail["unitDag"]["testedUnits"],
        "testedUnitRatio": round(
            detail["unitDag"]["testedUnits"] / detail["unitDag"]["totalUnits"],
            4,
        )
        if detail["unitDag"]["totalUnits"]
        else 0,
        "expertTimeEstimateMin": detail["expertTimeEstimateMin"],
        "juniorTimeEstimateMin": detail["juniorTimeEstimateMin"],
        "dagPreview": {
            "moduleLayers": detail["moduleDag"]["layers"],
            "moduleLayerLinks": detail["moduleDag"]["layerLinks"],
            "unitLayers": detail["unitDag"]["layers"],
        },
    }

    return summary_entry, detail


def main() -> None:
    tasks_root = _tasks_root()
    output_root = _output_root()
    tasks_output_root = output_root / "tasks"
    repo_url = _repo_url()
    if not tasks_root.exists():
        raise SystemExit(f"Tasks root not found: {tasks_root}")

    output_root.mkdir(parents=True, exist_ok=True)
    tasks_output_root.mkdir(parents=True, exist_ok=True)

    task_dirs = sorted(path for path in tasks_root.iterdir() if path.is_dir() and path.name.startswith("task_"))

    summaries: list[dict] = []
    category_counts: Counter[str] = Counter()
    difficulty_counts: Counter[str] = Counter()
    tag_counts: Counter[str] = Counter()
    total_units = 0
    total_tested_units = 0
    unit_layers: list[int] = []
    module_layers: list[int] = []

    for task_dir in task_dirs:
        summary, detail = _build_task_payload(task_dir, repo_url=repo_url)
        summaries.append(summary)
        category_counts[summary["category"]] += 1
        difficulty_counts[summary["difficulty"]] += 1
        tag_counts.update(summary["tags"])
        total_units += summary["unitCount"]
        total_tested_units += summary["testedUnitCount"]
        unit_layers.append(summary["unitLayerCount"])
        module_layers.append(summary["moduleLayerCount"])

        (tasks_output_root / f"{task_dir.name}.json").write_text(
            json.dumps(detail, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )

    summaries.sort(key=lambda item: (item["title"].lower(), item["id"]))

    index_payload = {
        "benchmark": {
            "id": "loopsbench",
            "name": "LoopsBench",
            "description": "Dependency-native coding tasks with module DAGs for task overview and unit DAGs for real execution scale.",
            "taskCount": len(summaries),
            "categoryCount": len(category_counts),
            "tagCount": len(tag_counts),
            "totalUnits": total_units,
            "totalTestedUnits": total_tested_units,
            "medianUnitLayers": median(unit_layers) if unit_layers else 0,
            "medianModuleLayers": median(module_layers) if module_layers else 0,
        },
        "filters": {
            "categories": [
                {"value": value, "count": count}
                for value, count in sorted(category_counts.items(), key=lambda item: (-item[1], item[0].lower()))
            ],
            "difficulties": [
                {"value": value, "count": count}
                for value, count in sorted(difficulty_counts.items(), key=lambda item: (item[0], item[1]))
            ],
            "tags": [
                {"value": value, "count": count}
                for value, count in sorted(tag_counts.items(), key=lambda item: (-item[1], item[0].lower()))
            ],
        },
        "tasks": summaries,
    }

    (output_root / "index.json").write_text(
        json.dumps(index_payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    print(f"Wrote {len(summaries)} task summaries to {output_root}")


if __name__ == "__main__":
    main()
