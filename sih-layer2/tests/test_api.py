"""FastAPI contract tests - run in-process, no server needed."""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from src.api import app

client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "models" in body


def test_taxonomy_lists_the_specified_vocabularies() -> None:
    body = client.get("/taxonomy").json()
    assert "pressure_testing" in body["actions"]
    assert "well_casing" in body["objects"]
    assert "no_isolation" in body["control_deficiencies"]
    assert "Energy Isolation" in body["iogp_rules"]


def test_analyze_returns_the_documented_shape() -> None:
    response = client.post(
        "/analyze",
        json={
            "report_id": "SIH-001",
            "text": "Worker was pressurizing a well casing using temporary equipment "
            "without a pressure regulator or pressure safety valve.",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["report_id"] == "SIH-001"
    for key in ("action", "object", "control_deficiencies", "sif", "iogp_rules", "evidence", "meta"):
        assert key in body
    assert body["action"]["label"] == "pressure_testing"
    assert body["sif"]["classification"] == "SIF_POTENTIAL"
    # Serialisable with the stdlib encoder => no numpy scalars leaked.
    json.dumps(body)


def test_analyze_accepts_optional_layer1_metadata() -> None:
    response = client.post(
        "/analyze",
        json={
            "report_id": "SIH-002",
            "text": "A worker entered a confined space without a gas test.",
            "layer1": {"facility": "Terminal B", "shift": "night"},
        },
    )
    assert response.status_code == 200
    assert response.json()["meta"]["layer1_context"]["facility"] == "Terminal B"


def test_analyze_without_report_id() -> None:
    response = client.post("/analyze", json={"text": "Welding without a permit."})
    assert response.status_code == 200
    assert response.json()["report_id"] is None


@pytest.mark.parametrize("payload", [{}, {"text": ""}, {"report_id": "x"}])
def test_analyze_rejects_missing_or_empty_text(payload: dict) -> None:
    assert client.post("/analyze", json=payload).status_code == 422


def test_batch_analyze() -> None:
    response = client.post(
        "/analyze/batch",
        json={
            "reports": [
                {"report_id": "a", "text": "Opened the flange without isolating the line."},
                {"report_id": "b", "text": "Slipped on a wet office floor."},
            ]
        },
    )
    assert response.status_code == 200
    results = response.json()["results"]
    assert [r["report_id"] for r in results] == ["a", "b"]
    assert results[1]["sif"]["classification"] != "SIF_POTENTIAL"


def test_openapi_docs_are_served() -> None:
    assert client.get("/openapi.json").status_code == 200
    assert client.get("/docs").status_code == 200
