import csv
import json
import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass(frozen=True)
class RepoSpec:
    subset: str
    library: str
    repo_url: str
    source_for_repo_url: str
    notes: str = ""


REPOS = [
    RepoSpec("Py2JS", "base58", "https://github.com/keis/base58.git", "RepoZero-Py2JS HF dataset folder + GitHub repo search exact name", "Best-effort mapping; dataset does not expose upstream URL directly."),
    RepoSpec("Py2JS", "bech32", "https://github.com/fiatjaf/bech32.git", "RepoZero-Py2JS HF dataset folder + PyPI homepage", "Best-effort mapping."),
    RepoSpec("Py2JS", "bencoder", "https://github.com/whtsky/bencoder.pyx.git", "RepoZero-Py2JS HF dataset folder + PyPI homepage", "Best-effort mapping."),
    RepoSpec("Py2JS", "bidict", "https://github.com/jab/bidict.git", "RepoZero-Py2JS HF dataset folder + PyPI repository URL"),
    RepoSpec("Py2JS", "bitarray", "https://github.com/ilanschnell/bitarray.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "bitstring", "https://github.com/scott-griffiths/bitstring.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "boltons", "https://github.com/mahmoud/boltons.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "canonicaljson", "https://github.com/matrix-org/python-canonicaljson.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "construct", "https://github.com/construct/construct.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "deepdiff", "https://github.com/seperman/deepdiff.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "ecdsa", "https://github.com/tlsfuzzer/python-ecdsa.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "fractions", "https://github.com/python/cpython.git", "RepoZero-Py2JS HF dataset folder + test import from Python stdlib fractions", "This is stdlib, so the upstream repo is CPython."),
    RepoSpec("Py2JS", "furl", "https://github.com/gruns/furl.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "idna", "https://github.com/kjd/idna.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "jose", "https://github.com/mpdavis/python-jose.git", "RepoZero-Py2JS HF dataset folder + test import + PyPI source URL"),
    RepoSpec("Py2JS", "jsonschema", "https://github.com/python-jsonschema/jsonschema.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "markdown", "https://github.com/Python-Markdown/markdown.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "moneyed", "https://github.com/py-moneyed/py-moneyed.git", "RepoZero-Py2JS HF dataset folder + PyPI homepage"),
    RepoSpec("Py2JS", "mpmath", "https://github.com/mpmath/mpmath.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "networkx", "https://github.com/networkx/networkx.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "pbkdf2", "https://github.com/dlitz/python-pbkdf2.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "pyaes", "https://github.com/ricmoo/pyaes.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "rlp", "https://github.com/ethereum/pyrlp.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "rsa", "https://github.com/sybrenstuvel/python-rsa.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "schedule", "https://github.com/dbader/schedule.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "sqlparse", "https://github.com/andialbrecht/sqlparse.git", "RepoZero-Py2JS HF dataset folder + canonical upstream"),
    RepoSpec("Py2JS", "whoosh", "https://github.com/mchaput/whoosh.git", "RepoZero-Py2JS HF dataset folder + canonical upstream", "Best-effort mapping; community fork exists."),
    RepoSpec("Py2JS", "yaml", "https://github.com/yaml/pyyaml.git", "RepoZero-Py2JS HF dataset folder + test import from yaml + canonical upstream"),
    RepoSpec("C2Rust", "Clipper", "https://github.com/skyrpex/clipper.git", "RepoZero-C2Rust HF dataset folder + exact repo name candidate", "Best-effort mapping; upstream may differ from newer Clipper2."),
    RepoSpec("C2Rust", "color", "https://github.com/ttalvitie/Color.git", "RepoZero-C2Rust HF dataset folder + test include ../color.hpp + namespace ColorSpace", "High uncertainty."),
    RepoSpec("C2Rust", "earcut.hpp", "https://github.com/mapbox/earcut.hpp.git", "RepoZero-C2Rust HF dataset folder + exact repo name"),
    RepoSpec("C2Rust", "exprtk", "https://github.com/ArashPartow/exprtk.git", "RepoZero-C2Rust HF dataset folder + exact repo name"),
    RepoSpec("C2Rust", "hopscotch-map", "https://github.com/Tessil/hopscotch-map.git", "RepoZero-C2Rust HF dataset folder + exact repo name"),
    RepoSpec("C2Rust", "idna-cpp", "https://github.com/mapbox/idna.git", "RepoZero-C2Rust HF dataset folder + test include ../idna.hpp + idna::to_ascii", "High uncertainty."),
    RepoSpec("C2Rust", "immer", "https://github.com/arximboldi/immer.git", "RepoZero-C2Rust HF dataset folder + exact repo name"),
    RepoSpec("C2Rust", "indicators", "https://github.com/p-ranav/indicators.git", "RepoZero-C2Rust HF dataset folder + exact repo name"),
    RepoSpec("C2Rust", "inflection-cpp", "https://github.com/hmarty/inflection-cpp.git", "RepoZero-C2Rust HF dataset folder + exact repo name candidate", "Best-effort mapping."),
    RepoSpec("C2Rust", "sortedcontainers-cpp", "https://github.com/dyn4j/sortedcontainers-cpp.git", "RepoZero-C2Rust HF dataset folder + exact repo name candidate", "High uncertainty."),
    RepoSpec("C2Rust", "url-parser", "https://github.com/nekipelov/url-parser.git", "RepoZero-C2Rust HF dataset folder + include/url_parser.h + exact repo name candidate", "High uncertainty."),
]


def run(cmd, cwd=None):
    completed = subprocess.run(
        cmd,
        cwd=cwd,
        check=True,
        capture_output=True,
        text=True,
        env={**os.environ, "GIT_TERMINAL_PROMPT": "0"},
    )
    return completed.stdout.strip()


def iso_to_date(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)


def inspect_repo(spec: RepoSpec, base_dir: Path):
    repo_dir = base_dir / f"{spec.subset}__{spec.library}".replace("/", "_")
    if repo_dir.exists():
        shutil.rmtree(repo_dir)

    run(["git", "clone", "--bare", "--filter=tree:0", "--single-branch", spec.repo_url, str(repo_dir)])
    latest_hash = run(["git", "--git-dir", str(repo_dir), "rev-parse", "HEAD"])
    first_hash = run(["git", "--git-dir", str(repo_dir), "rev-list", "--max-parents=0", "HEAD"]).splitlines()[0]
    latest_date = run(["git", "--git-dir", str(repo_dir), "show", "-s", "--format=%cI", latest_hash])
    first_date = run(["git", "--git-dir", str(repo_dir), "show", "-s", "--format=%cI", first_hash])

    first_dt = iso_to_date(first_date)
    latest_dt = iso_to_date(latest_date)
    duration_days = (latest_dt.date() - first_dt.date()).days
    return {
        "subset": spec.subset,
        "library": spec.library,
        "repo_url": spec.repo_url.removesuffix(".git"),
        "first_commit": first_hash,
        "first_date": first_dt.date().isoformat(),
        "last_commit_used": latest_hash,
        "last_date": latest_dt.date().isoformat(),
        "duration_days": duration_days,
        "source_for_repo_url": spec.source_for_repo_url,
        "source_for_last_commit": "Fallback to current default-branch HEAD; no pinned snapshot commit found in released RepoZero metadata/README.",
        "notes": spec.notes,
    }


def main():
    out_dir = Path(os.environ.get("REPOZERO_OUT_DIR", "artifacts/repozero_time"))
    out_dir.mkdir(parents=True, exist_ok=True)

    skip_libraries = {
        x.strip() for x in os.environ.get("REPOZERO_SKIP_LIBRARIES", "").split(",") if x.strip()
    }
    rows = []
    with tempfile.TemporaryDirectory(prefix="repozero_git_") as tmp:
        base_dir = Path(tmp)
        for spec in REPOS:
            if spec.library in skip_libraries:
                print(f"Skipping {spec.subset}/{spec.library}", flush=True)
                continue
            print(f"Inspecting {spec.subset}/{spec.library} -> {spec.repo_url}", flush=True)
            try:
                rows.append(inspect_repo(spec, base_dir))
            except Exception as exc:
                rows.append(
                    {
                        "subset": spec.subset,
                        "library": spec.library,
                        "repo_url": spec.repo_url.removesuffix(".git"),
                        "first_commit": "",
                        "first_date": "",
                        "last_commit_used": "",
                        "last_date": "",
                        "duration_days": "",
                        "source_for_repo_url": spec.source_for_repo_url,
                        "source_for_last_commit": "",
                        "notes": f"FAILED: {exc} | {spec.notes}",
                    }
                )

    csv_path = out_dir / "repozero_evidence.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "subset",
                "library",
                "repo_url",
                "first_commit",
                "first_date",
                "last_commit_used",
                "last_date",
                "duration_days",
                "source_for_repo_url",
                "source_for_last_commit",
                "notes",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    valid_rows = [r for r in rows if str(r["duration_days"]).isdigit()]
    total_days = sum(int(r["duration_days"]) for r in valid_rows)
    summary = {
        "unique_repo_count": len(valid_rows),
        "total_days": total_days,
        "total_months": round(total_days / 30.4375, 2),
        "total_years": round(total_days / 365.25, 2),
        "failed_repo_count": len(rows) - len(valid_rows),
    }
    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
