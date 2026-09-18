"""
FastAPI service for Layer 2.

Run from the `layer2_sih` folder:

    python -m uvicorn src.api:app --reload

Layer 1 (Node/Express) is expected to POST /analyze. The optional `layer1`
object on the request is echoed back under `meta.layer1_context` so metadata
(site, reporter, timestamp, Layer 1 triage scores) can be threaded through
later without an API change.
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

from . import __version__, taxonomy as TX
from .models import bundle_status, legacy_artifacts
from .pipeline import analyze

app = FastAPI(
    title="SIH 2026 Layer 2 - Context Finder",
    version=__version__,
    description=(
        "Infers Action, Object/Environment, Control Deficiency, SIF potential and "
        "IOGP Life-Saving Rule candidates from an unclear safety report, with the "
        "supporting text for every prediction. Prototype - not validated for "
        "production safety decisions."
    ),
)


class AnalyzeRequest(BaseModel):
    report_id: str | None = None
    text: str = Field(min_length=1, description="Free-text safety report narrative.")
    layer1: dict[str, Any] | None = Field(
        default=None,
        description="Optional Layer 1 metadata; echoed back untouched under meta.layer1_context.",
    )


class BatchRequest(BaseModel):
    reports: list[AnalyzeRequest] = Field(min_length=1, max_length=200)


@app.get("/health")
def health() -> dict[str, Any]:
    status = bundle_status()
    return {
        "status": "ok",
        "service": "layer2-context-finder",
        "version": __version__,
        "models": status,
        "legacy_artifacts_present": legacy_artifacts(),
    }


@app.get("/taxonomy")
def taxonomy() -> dict[str, list[str]]:
    return {
        "actions": list(TX.ACTIONS),
        "objects": list(TX.OBJECTS),
        "control_deficiencies": list(TX.CONTROL_DEFICIENCIES),
        "iogp_rules": list(TX.IOGP_RULES),
        "sif_classes": list(TX.SIF_CLASSES),
    }


@app.post("/analyze")
def analyze_report(request: AnalyzeRequest) -> dict[str, Any]:
    return analyze(request.text, report_id=request.report_id, layer1=request.layer1)


@app.post("/analyze/batch")
def analyze_batch(request: BatchRequest) -> dict[str, Any]:
    return {
        "count": len(request.reports),
        "results": [
            analyze(item.text, report_id=item.report_id, layer1=item.layer1)
            for item in request.reports
        ],
    }
