#!/usr/bin/env python3
"""Create a non-generative work queue for term/topic extraction.

This only expands the verified class/subject checklist into term slots. It does
not add topics, infer terms for legacy questions, or create question content.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SUBJECT_MANIFEST = ROOT / "prisma/cbt-curriculum-subjects.json"
OUTPUT = ROOT / "prisma/cbt-curriculum-topic-manifest.json"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--subjects", type=Path, default=SUBJECT_MANIFEST)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()

    source = json.loads(args.subjects.read_text(encoding="utf-8"))
    entries = [
        {
            "level": level,
            "subject": subject,
            "term": term,
            "weeks": [],
            "status": "pending_source_mapping",
            "sourceReference": None,
        }
        for level, record in source["levels"].items()
        for subject in record["subjects"]
        for term in source["terms"]
    ]
    document = {
        "schemaVersion": 1,
        "source": source["source"],
        "status": "scaffold_only_not_ready_for_question_generation",
        "topicRequirements": "For each term, copy the scheme's week numbers and topic labels with source references; do not infer weeks or topics.",
        "entries": entries,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(document, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    pending = sum(entry["status"] == "pending_source_mapping" for entry in entries)
    print(f"Wrote {args.output}: {len(entries)} term slots; {pending} pending; 0 weeks or topics invented.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
