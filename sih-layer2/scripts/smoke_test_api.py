"""
Smoke-test a *running* Layer 2 service over HTTP.

Start the server first:
    python -m uvicorn src.api:app --reload
Then, in a second terminal:
    python scripts/smoke_test_api.py

Exits non-zero if any check fails, so it can be used in CI.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"

CASES: list[tuple[str, str, dict[str, object]]] = [
    (
        "pressure test without a PSV",
        "Worker was pressurizing a well casing using temporary equipment without a "
        "pressure regulator or pressure safety valve.",
        {"action": "pressure_testing", "control": "missing_pressure_control", "sif": "SIF_POTENTIAL"},
    ),
    (
        "confined space entry with no gas test",
        "A worker entered a confined space without verifying that the atmosphere had been tested.",
        {"action": "confined_space", "control": "no_gas_test"},
    ),
    (
        "electrical panel without LOTO",
        "A maintenance technician opened an electrical panel without isolating and locking out the power supply.",
        {"control": "no_isolation", "sif": "SIF_POTENTIAL"},
    ),
    (
        "office slip - must not be SIF",
        "An employee slipped on a wet office floor while walking to the break room.",
        {"not_sif": True},
    ),
]


def get(path: str) -> dict:
    with urllib.request.urlopen(f"{BASE}{path}", timeout=30) as response:
        return json.loads(response.read())


def post(path: str, payload: dict) -> dict:
    request = urllib.request.Request(
        f"{BASE}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read())


def main() -> int:
    failures: list[str] = []

    try:
        health = get("/health")
    except urllib.error.URLError as error:
        print(f"[FAIL] cannot reach {BASE}: {error}")
        print("       start the server with: python -m uvicorn src.api:app --reload")
        return 2
    print(f"[ok]   GET /health -> {health['status']}  models_available={health['models'].get('models_available')}")
    if health.get("status") != "ok":
        failures.append("/health did not report ok")

    taxonomy = get("/taxonomy")
    print(f"[ok]   GET /taxonomy -> {len(taxonomy['actions'])} actions, {len(taxonomy['objects'])} objects")

    for name, text, expect in CASES:
        result = post("/analyze", {"report_id": f"SMOKE-{name[:8]}", "text": text})
        controls = [c["label"] for c in result["control_deficiencies"]]
        print(
            f"[ok]   POST /analyze  {name}\n"
            f"         action={result['action']['label']} ({result['action']['confidence']})"
            f"  object={result['object']['label']}\n"
            f"         controls={controls}\n"
            f"         sif={result['sif']['score']} {result['sif']['classification']}"
            f"  iogp={result['iogp_rules']}"
        )
        if "action" in expect and result["action"]["label"] != expect["action"]:
            failures.append(f"{name}: action {result['action']['label']} != {expect['action']}")
        if "control" in expect and expect["control"] not in controls:
            failures.append(f"{name}: missing control {expect['control']}")
        if "sif" in expect and result["sif"]["classification"] != expect["sif"]:
            failures.append(f"{name}: sif {result['sif']['classification']} != {expect['sif']}")
        if expect.get("not_sif") and result["sif"]["classification"] == "SIF_POTENTIAL":
            failures.append(f"{name}: unexpectedly classified SIF_POTENTIAL")
        for control in result["control_deficiencies"]:
            if not control["evidence"]:
                failures.append(f"{name}: {control['label']} asserted with no evidence")

    batch = post("/analyze/batch", {"reports": [{"report_id": "b1", "text": t} for _, t, _ in CASES]})
    print(f"[ok]   POST /analyze/batch -> {len(batch['results'])} results")

    if failures:
        print("\n".join(f"[FAIL] {f}" for f in failures))
        return 1
    print("\nAll API smoke checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
