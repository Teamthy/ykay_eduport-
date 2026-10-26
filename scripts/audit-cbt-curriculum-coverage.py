#!/usr/bin/env python3
"""Report subject-level presence in a CBT CSV against the supplied curriculum.

This is deliberately a strict identity check: it does not treat similar subject
names as equivalent and it does not claim topic or term coverage. Those require
an explicit, source-backed topic manifest.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "prisma/cbt-curriculum-subjects.json"
DEFAULT_BANK = ROOT / "prisma/cbt-bank-10k-draft.csv"


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (value or "").casefold()).strip()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--bank", type=Path, default=DEFAULT_BANK)
    args = parser.parse_args()

    with args.manifest.open(encoding="utf-8") as source:
        manifest = json.load(source)

    required = {
        (level.casefold(), normalize(subject)): (level.upper(), subject)
        for level, record in manifest["levels"].items()
        for subject in record["subjects"]
    }
    present: set[tuple[str, str]] = set()
    row_counts: Counter[tuple[str, str]] = Counter()
    term_counts: Counter[tuple[str, str, str]] = Counter()
    bank_pairs: set[tuple[str, str]] = set()
    topic_counts: Counter[tuple[str, str, str, str]] = Counter()

    with args.bank.open(newline="", encoding="utf-8-sig") as source:
        reader = csv.DictReader(source)
        headers = {header.casefold(): header for header in (reader.fieldnames or [])}
        level_column = headers.get("classlevel") or headers.get("class_level")
        subject_column = headers.get("subjectname") or headers.get("subject_name")
        term_column = headers.get("term")
        topic_column = headers.get("topic")
        if not level_column or not subject_column:
            print("ERROR: bank CSV must include classLevel and subjectName columns", file=sys.stderr)
            return 2

        for row in reader:
            level = normalize(row.get(level_column, "")).replace(" ", "")
            subject = normalize(row.get(subject_column, ""))
            pair = (level, subject)
            bank_pairs.add(pair)
            row_counts[pair] += 1
            if pair in required:
                present.add(pair)
                term = normalize(row.get(term_column, "")) if term_column else ""
                if term:
                    term_counts[(level, subject, term)] += 1
                topic = normalize(row.get(topic_column, "")) if topic_column else ""
                if topic:
                    topic_counts[(level, subject, term, topic)] += 1

    missing = sorted(
        (display_level, subject)
        for key, (display_level, subject) in required.items()
        if key not in present
    )
    extras = sorted(
        (level.upper(), subject)
        for level, subject in bank_pairs
        if level in manifest["levels"]
        and (level, subject) not in required
    )

    print(f"Source: {manifest['source']}")
    print(f"Bank: {args.bank.relative_to(ROOT) if args.bank.is_relative_to(ROOT) else args.bank}")
    print(f"Required class/subject pairs: {len(required)}")
    print(f"Exact subject-identity pairs present: {len(present)}")
    print(f"Exact subject-identity pairs missing: {len(missing)}")
    print("Topic coverage: NOT VERIFIED (this audit only checks class/subject identity)")
    print("Term coverage: NOT VERIFIED (missing/blank terms are not inferred)")

    if missing:
        print("\nMissing exact class/subject pairs:")
        for level, subject in missing:
            print(f"  {level}: {subject}")

    if extras:
        print("\nBank subject labels not in the manifest (review; not auto-mapped):")
        for level, subject in extras:
            print(f"  {level}: {subject}")

    print("\nPresent exact class/subject pairs (rows; distinct tagged terms; distinct topics):")
    display_by_key = {
        (level.casefold(), normalize(subject)): (level.upper(), subject)
        for level, record in manifest["levels"].items()
        for subject in record["subjects"]
    }
    for key in sorted(present):
        level, subject = display_by_key[key]
        terms = sorted(term for (row_level, row_subject, term), count in term_counts.items()
                      if (row_level, row_subject) == key and count)
        topics = {
            topic
            for row_level, row_subject, _term, topic in topic_counts
            if (row_level, row_subject) == key
        }
        print(f"  {level}: {subject} — {row_counts[key]} rows; {len(terms)} tagged terms; {len(topics)} topics")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
