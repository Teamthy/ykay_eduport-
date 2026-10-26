#!/usr/bin/env python3
"""Audit exact source-mapped term/topic coverage in a draft CBT CSV.

This is a deterministic CSV-to-manifest comparison, not a factual review of
question quality and not a database/production check. It does not infer aliases
or fill missing source terms.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TOPIC_MANIFEST = ROOT / "prisma/cbt-curriculum-topic-manifest.json"
DEFAULT_BANK = ROOT / "prisma/cbt-bank-19k-draft.csv"


def normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", (value or "").casefold())
    ascii_value = decomposed.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", " ", ascii_value).strip()


def term_key(value: str) -> str:
    raw = normalize(value)
    aliases = {
        "first term": "first", "term 1": "first", "1st": "first", "1": "first",
        "second term": "second", "term 2": "second", "2nd": "second", "2": "second",
        "third term": "third", "term 3": "third", "3rd": "third", "3": "third",
    }
    return aliases.get(raw, raw)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--topic-manifest", type=Path, default=DEFAULT_TOPIC_MANIFEST)
    parser.add_argument("--bank", type=Path, default=DEFAULT_BANK)
    args = parser.parse_args()

    manifest = json.loads(args.topic_manifest.read_text(encoding="utf-8"))
    source_entries = manifest.get("entries", [])
    eligible: dict[tuple[str, str, str, str], dict] = {}
    all_source_topics = 0
    for entry in source_entries:
        for topic in entry.get("topics", []):
            all_source_topics += 1
            if topic.get("eligibleForQuestionGeneration"):
                eligible[(entry["level"], normalize(entry["subject"]), entry["term"], normalize(topic["label"]))] = {
                    "entry": entry,
                    "topic": topic,
                }

    bank_rows = 0
    term_tagged = 0
    tagged_generated = 0
    has_week_column = False
    covered: set[tuple[str, str, str, str]] = set()
    exact_pairs: set[tuple[str, str]] = set()
    row_count_by_level: Counter[str] = Counter()
    source_count_by_level: Counter[str] = Counter()
    unassigned_by_level: Counter[str] = Counter()
    with args.bank.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        headers = {header.casefold(): header for header in (reader.fieldnames or [])}
        has_week_column = any("week" in header.casefold() for header in (reader.fieldnames or []))
        required = {"classlevel", "subjectname", "topic", "term", "source"}
        if not required.issubset(headers):
            missing = sorted(required - set(headers))
            print(f"ERROR: bank is missing required columns: {', '.join(missing)}", file=sys.stderr)
            return 2
        for row in reader:
            bank_rows += 1
            level = re.sub(r"\s+", "", normalize(row.get(headers["classlevel"], "")))
            subject = normalize(row.get(headers["subjectname"], ""))
            term = term_key(row.get(headers["term"], ""))
            topic = normalize(row.get(headers["topic"], ""))
            source = row.get(headers["source"], "")
            pair = (level, subject)
            exact_pairs.add(pair)
            row_count_by_level[level] += 1
            if term:
                term_tagged += 1
                source_count_by_level[level] += 1
                if "curriculum-map-draft" in source:
                    tagged_generated += 1
            else:
                unassigned_by_level[level] += 1
            if term and topic:
                covered.add((level, subject, term, topic))

    missing = sorted(set(eligible) - covered)
    covered_source_keys = set(eligible) & covered
    represented_source_entries = sum(bool(entry.get("topics")) for entry in source_entries)
    missing_source_entries = manifest.get("missingSourceEntries", [])
    ineligible_count = all_source_topics - len(eligible)
    ineligible_reasons = Counter(
        topic.get("questionGenerationExclusionReason", "unspecified")
        for entry in source_entries
        for topic in entry.get("topics", [])
        if not topic.get("eligibleForQuestionGeneration")
    )
    unique_subject_pairs = {
        (entry["level"], normalize(entry["subject"])) for entry in source_entries
    }
    source_pairs_present = unique_subject_pairs & exact_pairs

    print(f"Audit type: static source-manifest / CSV comparison")
    print(f"Manifest source PDF SHA-256: {manifest.get('source', {}).get('sha256', 'unknown')}")
    print(f"Bank: {args.bank.relative_to(ROOT) if args.bank.is_relative_to(ROOT) else args.bank}")
    print(f"Bank rows: {bank_rows}")
    print(f"Question term-tagged rows: {term_tagged}; blank/unassigned: {bank_rows - term_tagged}")
    print(f"Tagged generated curriculum drafts: {tagged_generated}")
    print(f"Question term/topic field contains week column: {'YES' if has_week_column else 'NO'}")
    print(f"Source class/subject pairs present exactly: {len(source_pairs_present)}/{len(unique_subject_pairs)}")
    print(f"Source class/subject/term entries with extracted topics: {represented_source_entries}/{len(source_entries)}")
    print(f"Class/subject/term entries with no source topics: {len(missing_source_entries)}")
    print(f"Distinct source topic labels: {all_source_topics}")
    print(f"Question-generation-eligible source topic labels: {len(eligible)}")
    print(f"Ineligible source labels (administrative/placeholder/length): {ineligible_count}")
    for reason, count in sorted(ineligible_reasons.items()):
        print(f"  {reason}: {count}")
    print(f"Eligible source topic labels represented by exact class/subject/term/topic: {len(covered_source_keys)}/{len(eligible)}")
    print("Factual correctness / human review: NOT VERIFIED; generated rows are drafts.")
    print("Database import, staging, and live-production state: NOT VERIFIED by this audit.")

    if missing_source_entries:
        print("\nSource term entries not found in the supplied PDF (not inferred):")
        for entry in missing_source_entries:
            print(f"  {entry['level']} | {entry['subject']} | {entry['term']}")
    if missing:
        print("\nEligible source topic labels not represented in the bank:")
        for level, subject, term, topic in missing[:100]:
            record = eligible[(level, subject, term, topic)]
            refs = ", ".join(record["entry"].get("sourceReferences", [])) or "no page reference"
            print(f"  {level} | {record['entry']['subject']} | {term} | {record['topic']['label']} ({refs})")
        if len(missing) > 100:
            print(f"  … and {len(missing) - 100} more")

    if has_week_column or missing:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
