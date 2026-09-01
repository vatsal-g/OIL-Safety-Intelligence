from __future__ import annotations

import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from src import taxonomy as TX
from src.models import bundle_status
from src.pipeline import analyze

app = FastAPI(title="Layer 2 Context Finder Service (backend bridge)")

# Enable CORS so Node/Express backend and local frontend tools can communicate freely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ReportRequest(BaseModel):
    reportText: str | None = None
    rawText: str | None = None
    text: str | None = None


def _clean_label(label: str | None) -> str | None:
    """Map the pipeline's 'unknown'/'none' sentinels to null for the backend."""
    if not label or label in (TX.UNKNOWN, TX.NONE):
        return None
    return label


def _reconstruct_hazard(result: dict) -> str:
    """Build the human-readable `reconstructedHazard` summary Prisma expects."""
    action_txt = _clean_label(result.get("action", {}).get("label"))
    object_txt = _clean_label(result.get("object", {}).get("label"))
    controls = result.get("control_deficiencies", [])
    sif = result.get("sif", {})

    parts: list[str] = []
    if action_txt and object_txt:
        parts.append(
            f"Reconstructed as {action_txt.replace('_', ' ')} involving {object_txt.replace('_', ' ')}."
        )
    elif action_txt:
        parts.append(f"Reconstructed as {action_txt.replace('_', ' ')}.")
    elif object_txt:
        parts.append(f"Involves {object_txt.replace('_', ' ')}.")
    else:
        parts.append("Insufficient context to reconstruct action or object.")

    if controls:
        top = controls[0]
        evidence = "; ".join(top.get("evidence", [])[:2]) or "model inference only"
        label_txt = _clean_label(top.get("label")) or top.get("label", "None")
        parts.append(
            f'Primary control deficiency: {label_txt.replace("_", " ")} (evidence: "{evidence}").'
        )
    else:
        parts.append("No control deficiency directly supported by report text.")

    sif_class = sif.get("classification", "Low")
    sif_score = sif.get("score", 0.0)
    parts.append(f"SIF potential: {sif_class} (score {sif_score:.2f}).")
    return " ".join(parts)


def _flatten(result: dict) -> dict:
    controls = result.get("control_deficiencies", [])
    sif_score = float(result.get("sif", {}).get("score", 0.0))

    return {
        "invoked": True,
        "action": _clean_label(result.get("action", {}).get("label")) or "None",
        "object": _clean_label(result.get("object", {}).get("label")) or "None",
        "controlDeficiency": (
            _clean_label(controls[0].get("label")) if controls else None
        )
        or "None",
        "confidenceScore": round(sif_score, 3),
        "reconstructedHazard": _reconstruct_hazard(result),
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "layer2-backend-bridge",
        "models": bundle_status(),
    }


@app.post("/analyze")
def analyze_report(req: ReportRequest):
    # Support reportText, rawText, or text keys interchangeably
    input_text = req.reportText or req.rawText or req.text or ""
    text = input_text.strip()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="reportText, rawText, or text is required and must be non-empty.",
        )

    start = time.perf_counter()
    try:
        rich_result = analyze(text)
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Layer 2 pipeline failed: {exc}"
        ) from exc

    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)

    flat = _flatten(rich_result)
    flat["executionTimeMs"] = elapsed_ms
    return flat


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5001)