#!/usr/bin/env python3
"""Check generated CBT answer keys against the source topic manifest.

This verifies template logic, unique options, term/topic identity, and PDF
citations. It does not review subject-matter truth, pedagogical quality, or
replace a human approval decision.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "prisma/cbt-curriculum-topic-manifest.json"
DEFAULT_BANK = ROOT / "prisma/cbt-bank-19k-draft.csv"
DEFAULT_REPORT = ROOT / "prisma/cbt-bank-19k-answer-key-audit.json"
DRAFT_SOURCE = "curriculum-map-draft"


def normalize(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", (value or "").casefold())
    ascii_value = decomposed.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", " ", ascii_value).strip()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--bank", type=Path, default=DEFAULT_BANK)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    topic_map: dict[tuple[str, str, str, str], dict] = {}
    legacy_term_map: dict[tuple[str, str, str], set[str]] = defaultdict(set)
    for entry in manifest["entries"]:
        for topic in entry["topics"]:
            topic_key = (entry["level"], normalize(entry["subject"]), entry["term"], normalize(topic["label"]))
            topic_map[topic_key] = topic
            if topic.get("eligibleForQuestionGeneration"):
                legacy_term_map[(entry["level"], normalize(entry["subject"]), normalize(topic["label"]))].add(entry["term"])

    generated = 0
    legacy_tagged = 0
    errors: list[str] = []
    template_counts: Counter[str] = Counter()
    with args.bank.open(newline="", encoding="utf-8-sig") as handle:
        rows = csv.DictReader(handle)
        for line_number, row in enumerate(rows, start=2):
            level = row["classLevel"].strip().lower()
            subject_key = normalize(row["subjectName"])
            topic_key = normalize(row["topic"])
            term = row.get("term", "").strip().lower()
            options = [row[f"option{letter}"] for letter in "ABCD"]
            correct_index = int(row["correctIndex"])
            correct = options[correct_index]
            stem = row["stem"]
            source = row.get("source", "")

            if source != DRAFT_SOURCE:
                if term:
                    legacy_tagged += 1
                    matches = legacy_term_map.get((level, subject_key, topic_key), set())
                    if matches != {term}:
                        errors.append(f"line {line_number}: legacy term assignment is not uniquely source-backed")
                continue

            generated += 1
            key = (level, subject_key, term, topic_key)
            topic = topic_map.get(key)
            if not topic or not topic.get("eligibleForQuestionGeneration"):
                errors.append(f"line {line_number}: exact class/subject/term/topic not eligible in source manifest")
                continue
            if len({normalize(option) for option in options}) != 4:
                errors.append(f"line {line_number}: options are not distinct")
            evidence = topic.get("evidence", [])
            details = {normalize(item.get("content", "")) for item in evidence if normalize(item.get("content", ""))}
            pages = {int(item["pdfPage"]) for item in evidence if item.get("pdfPage")}
            citation_pages = {int(value) for value in re.findall(r"PDF p(?:p)?\.\s*(\d+)", row["explanation"])}
            if not pages or not (pages & citation_pages):
                errors.append(f"line {line_number}: explanation has no matching PDF-page citation")
            normalized_correct = normalize(correct)

            if stem.startswith("In the supplied "):
                template = "topic-from-source-detail"
                template_counts[template] += 1
                if normalized_correct != topic_key or not any(detail and detail in normalize(stem) for detail in details):
                    errors.append(f"line {line_number}: topic-identification answer/detail does not match source")
            elif stem.startswith("According to the supplied "):
                template = "source-detail-from-topic"
                template_counts[template] += 1
                if normalized_correct not in details or not topic["label"].casefold() in stem.casefold():
                    errors.append(f"line {line_number}: source-detail answer does not match topic evidence")
            elif stem.startswith("The supplied scheme lists "):
                template = "term-from-topic"
                template_counts[template] += 1
                if normalized_correct != normalize(f"{term.title()} term") or not topic["label"].casefold() in stem.casefold():
                    errors.append(f"line {line_number}: term answer does not match source entry")
            elif stem.startswith("On which PDF page does the supplied "):
                template = "page-from-topic-reference"
                template_counts[template] += 1
                page_match = re.fullmatch(r"PDF p\.\s*(\d+)", correct, re.IGNORECASE)
                if not page_match or int(page_match.group(1)) not in pages or topic["label"].casefold() not in stem.casefold():
                    errors.append(f"line {line_number}: page answer does not match source reference")
            else:
                errors.append(f"line {line_number}: unrecognized generated question template")

    report = {
        "status": "automated_source_mapping_passed_human_review_pending" if not errors else "automated_source_mapping_failed",
        "bank": str(args.bank.relative_to(ROOT) if args.bank.is_relative_to(ROOT) else args.bank),
        "bankSha256": hashlib.sha256(args.bank.read_bytes()).hexdigest(),
        "sourcePdfSha256": manifest.get("source", {}).get("sha256"),
        "generatedDraftsChecked": generated,
        "exactMatchLegacyTermAssignmentsChecked": legacy_tagged,
        "questionTemplates": dict(template_counts),
        "issueCount": len(errors),
        "issueSamples": errors[:100],
        "humanReview": "NOT VERIFIED; this audit only compares generated answer keys and citations to the source manifest",
        "sourceGapsRemain": len(manifest.get("missingSourceEntries", [])),
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("Audit type: static generated-answer/source-manifest comparison")
    print(f"Generated curriculum drafts checked: {generated}")
    print(f"Exact-match legacy term assignments checked: {legacy_tagged}")
    print(f"Question templates: {dict(template_counts)}")
    print("Subject-matter accuracy / pedagogical quality / human approval: NOT VERIFIED")
    print(f"Wrote {args.report}")
    if errors:
        print(f"FAIL: {len(errors)} issue(s)")
        for error in errors[:100]:
            print(f"  {error}")
        if len(errors) > 100:
            print(f"  … and {len(errors) - 100} more")
        return 1
    print("PASS: every checked answer key and citation matches its exact source mapping")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
