"""
Backwards-compatible entry point.

The original prototype exposed `src.inference.analyze(text)`. That signature is
preserved here so anything already importing it keeps working, but the real
implementation now lives in `src.pipeline`.

CLI:
    python -m src.inference "worker opened the flange while the line was still pressurized"
"""

from __future__ import annotations

import json
import sys
from typing import Any

from .pipeline import analyze as _analyze

__all__ = ["analyze", "main"]


def analyze(text: str, report_id: str | None = None, layer1: dict[str, Any] | None = None) -> dict[str, Any]:
    return _analyze(text, report_id=report_id, layer1=layer1)


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    text = " ".join(args).strip()
    if not text:
        text = (
            "Worker was pressurizing a well casing using temporary equipment "
            "without a pressure regulator or pressure safety valve."
        )
    print(json.dumps(analyze(text, report_id="cli-001"), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
