#!/usr/bin/env python3
"""Create a term/topic work queue from the verified class/subject checklist.

This intentionally contains no week field. It does not invent topics, infer
term assignments for legacy questions, or generate question content.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SUBJECT_MANIFEST = ROOT / "prisma/cbt-curriculum-subjects.json"
OUTPUT = ROOT / "prisma/cbt-curriculum-topic-workqueue.json"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--subjects", type=Path, default=SUBJECT_MANIFEST)
    parser.add_argument("--output", type=Path, default=OUTPUT)
    parser.add_argument("--force", action="store_true", help="replace an existing work-queue output file")
    args = parser.parse_args()
    if args.output.exists() and not args.force:
        parser.error(f"refusing to overwrite existing file {args.output}; pass --force to replace it")

    source = json.loads(args.subjects.read_text(encoding="utf-8"))
    entries = [
        {
            "level": level,
            "subject": subject,
            "term": term,
            "topics": [],
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
        "status": "term_topic_scaffold_only_not_ready_for_question_generation",
        "topicRequirements": "Copy exact topic labels into each class/subject/term entry from the supplied scheme and retain a citation; do not infer missing topics.",
        "entries": entries,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(document, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    pending = sum(entry["status"] == "pending_source_mapping" for entry in entries)
    print(f"Wrote {args.output}: {len(entries)} term slots; {pending} pending; no weeks or topics invented.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
