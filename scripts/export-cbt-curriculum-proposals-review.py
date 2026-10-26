#!/usr/bin/env python3
"""Export user-provided curriculum gap proposals to a human-review CSV."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "prisma/cbt-curriculum-user-proposals.json"
DEFAULT_OUTPUT = ROOT / "prisma/cbt-curriculum-user-proposals-review.csv"
FIELDS = [
    "level",
    "subject",
    "submittedSubjectLabel",
    "term",
    "topic",
    "claimedBasis",
    "officialCitation",
    "pdfPageReferences",
    "reviewStatus",
    "subjectIdentityReviewRequired",
    "reviewerNotes",
]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    proposal = json.loads(args.input.read_text(encoding="utf-8"))
    if proposal.get("status") != "proposed_not_verified_pending_human_review":
        raise ValueError("Proposal data must remain explicitly unverified and pending human review")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    row_count = 0
    with args.output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        for entry in proposal["entries"]:
            for topic in entry["topics"]:
                writer.writerow(
                    {
                        "level": entry["level"],
                        "subject": entry["subject"],
                        "submittedSubjectLabel": entry.get("submittedSubjectLabel", entry["subject"]),
                        "term": entry["term"],
                        "topic": topic,
                        "claimedBasis": proposal["source"]["claimedBasis"],
                        "officialCitation": "",
                        "pdfPageReferences": "",
                        "reviewStatus": entry.get("reviewStatus", "pending"),
                        "subjectIdentityReviewRequired": str(entry.get("subjectIdentityReviewRequired", False)).lower(),
                        "reviewerNotes": "",
                    }
                )
                row_count += 1

    print(f"Proposed topic slots: {len(proposal['entries'])}")
    print(f"Proposed topic rows exported: {row_count}")
    print("Verification status: NOT VERIFIED; awaiting human review and authoritative citations")
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
