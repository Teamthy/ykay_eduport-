#!/usr/bin/env python3
"""Generate source-mapping CBT question drafts from the curriculum manifest.

This creates curriculum-alignment questions only. Every generated row remains
an unreviewed draft; the source scheme is not treated as textbook answer-key
validation. Existing question rows are copied without assigning terms.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "prisma/cbt-curriculum-topic-manifest.json"
DEFAULT_BASE = ROOT / "prisma/cbt-bank-10k-draft.csv"
DEFAULT_OUTPUT = ROOT / "prisma/cbt-bank-19k-draft.csv"
DEFAULT_REPORT = ROOT / "prisma/cbt-bank-19k-draft-report.json"
FIELDS = [
    "subjectSlug", "subjectName", "classLevel", "department", "topic", "term",
    "difficulty", "stem", "optionA", "optionB", "optionC", "optionD",
    "correctIndex", "explanation", "source",
]
SOURCE = "curriculum-map-draft"
DASHES = {"", "-", "--", "–", "—"}
# Mathematics is explicitly listed as General Mathematics in the supplied SS
# subject lists; the detailed class tables use the shorter Mathematics heading.
SUBJECT_SLUG_ALIASES = {
    (f"ss{grade}", "general mathematics"): f"mathematics-ss{grade}"
    for grade in (1, 2, 3)
}


def clean(text: Any) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def norm(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.casefold()).strip()


def slugify(text: str) -> str:
    slug = norm(text).replace(" ", "-")
    return re.sub(r"-+", "-", slug).strip("-")


def stable_index(seed: str, length: int) -> int:
    return int(hashlib.sha256(seed.encode("utf-8")).hexdigest()[:12], 16) % length


def deterministic_shuffle(values: list[str], seed: str) -> list[str]:
    return sorted(values, key=lambda value: hashlib.sha256(f"{seed}|{value}".encode()).hexdigest())


def render_options(correct: str, distractors: list[str], seed: str) -> tuple[list[str], int]:
    unique: dict[str, str] = {norm(correct): correct}
    for item in distractors:
        value = clean(item)
        key = norm(value)
        if value and key and key not in unique:
            unique[key] = value
        if len(unique) == 4:
            break
    if len(unique) != 4:
        raise ValueError(f"Need three distinct distractors for {seed!r}; received {len(unique) - 1}.")
    ordered = list(unique.values())
    options = deterministic_shuffle(ordered, seed)
    correct_index = next(index for index, value in enumerate(options) if norm(value) == norm(correct))
    return options, correct_index


def topic_detail(topic: dict[str, Any]) -> tuple[str, list[int]] | None:
    for evidence in topic.get("evidence", []):
        detail = clean(evidence.get("content"))
        if norm(detail) not in {norm(value) for value in DASHES}:
            if detail:
                pages = sorted({int(row["pdfPage"]) for row in topic["evidence"] if row.get("pdfPage")})
                return detail, pages
    return None


def slug_for(level: str, subject: str, existing: dict[tuple[str, str], str]) -> str:
    alias = SUBJECT_SLUG_ALIASES.get((level, norm(subject)))
    if alias:
        return alias
    exact = existing.get((level, norm(subject)))
    return exact or f"{slugify(subject)}-{level}"


def class_label(level: str) -> str:
    return level.upper().replace("SS", "SS").replace("JSS", "JSS")


def source_citation(pages: list[int]) -> str:
    if not pages:
        return "supplied curriculum scheme"
    if len(pages) == 1:
        return f"supplied curriculum scheme, PDF p. {pages[0]}"
    return "supplied curriculum scheme, PDF pp. " + ", ".join(map(str, pages))


def make_question(
    *, slug: str, subject: str, level: str, term: str, topic_label: str,
    detail: str, detail_pages: list[int], template_index: int,
    topic_distractors: list[str], detail_distractors: list[str], page_distractors: list[str],
) -> dict[str, str]:
    level_name = class_label(level)
    term_name = f"{term.title()} term"
    if template_index == 0:
        stem = (
            f"In the supplied {level_name} {subject} scheme, which {term_name} topic is associated "
            f"with this content: {detail}?"
        )
        options, correct_index = render_options(topic_label, topic_distractors, stem)
        explanation = (
            f"Source-mapping draft: the supplied scheme lists {detail!r} under {topic_label!r} "
            f"for {level_name} {subject}, {term_name.lower()} ({source_citation(detail_pages)}). "
            "This checks curriculum alignment, not independent subject-matter accuracy; review before publication."
        )
    elif template_index == 1:
        stem = (
            f"According to the supplied {level_name} {subject} scheme, what content is listed under "
            f"{topic_label} in the {term_name.lower()}?"
        )
        options, correct_index = render_options(detail, detail_distractors, stem)
        explanation = (
            f"Source-mapping draft: {detail!r} is listed under {topic_label!r} in {level_name} {subject}, "
            f"{term_name.lower()} ({source_citation(detail_pages)}). Review this generated item before publication."
        )
    elif template_index == 2:
        page_label = f"PDF p. {detail_pages[0]}" if detail_pages else "the supplied scheme"
        stem = (
            f"The supplied scheme lists {topic_label!r} on {page_label}. "
            f"In which term is this {level_name} {subject} topic placed?"
        )
        correct = term_name
        options, correct_index = render_options(
            correct,
            [candidate for candidate in ("First term", "Second term", "Third term", "Not listed") if norm(candidate) != norm(correct)],
            stem,
        )
        explanation = (
            f"The source scheme lists {topic_label!r} under {term_name.lower()} for {level_name} {subject} "
            f"({source_citation(detail_pages)}). This curriculum-mapping draft still needs human review."
        )
    else:
        page_label = f"PDF p. {detail_pages[0]}" if detail_pages else "the supplied scheme"
        stem = (
            f"On which PDF page does the supplied {level_name} {subject} scheme list "
            f"{topic_label!r} for the {term_name.lower()}?"
        )
        options, correct_index = render_options(page_label, page_distractors, stem)
        explanation = (
            f"The supplied scheme lists {topic_label!r} in {level_name} {subject}, {term_name.lower()} "
            f"({source_citation(detail_pages)}). The source row has no descriptive detail, so this is only a "
            "curriculum-navigation draft and needs human review."
        )
    return {
        "subjectSlug": slug,
        "subjectName": subject,
        "classLevel": level,
        "department": "general",
        "topic": topic_label,
        "term": term,
        "difficulty": "1",
        "stem": stem,
        "optionA": options[0],
        "optionB": options[1],
        "optionC": options[2],
        "optionD": options[3],
        "correctIndex": str(correct_index),
        "explanation": explanation,
        "source": SOURCE,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--base", type=Path, default=DEFAULT_BASE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    with args.base.open(newline="", encoding="utf-8-sig") as handle:
        base_rows = list(csv.DictReader(handle))
    if not base_rows:
        raise ValueError("Base question bank is empty.")
    if any(field not in base_rows[0] for field in FIELDS if field != "term"):
        raise ValueError("Base bank is missing required question columns.")

    exact_source_terms: dict[tuple[str, str, str], set[str]] = defaultdict(set)
    exact_source_pages: dict[tuple[str, str, str, str], set[int]] = defaultdict(set)
    for entry in manifest["entries"]:
        for topic in entry["topics"]:
            if not topic.get("eligibleForQuestionGeneration"):
                continue
            key = (entry["level"], norm(entry["subject"]), norm(topic["label"]))
            exact_source_terms[key].add(entry["term"])
            full_key = (*key, entry["term"])
            for evidence in topic.get("evidence", []):
                if evidence.get("pdfPage"):
                    exact_source_pages[full_key].add(int(evidence["pdfPage"]))

    existing_slugs: dict[tuple[str, str], str] = {}
    existing_stems: dict[str, set[str]] = defaultdict(set)
    base_assignment_groups: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    base_rows_for_output: list[dict[str, Any]] = []
    for row in base_rows:
        level = clean(row.get("classLevel")).lower()
        subject = clean(row.get("subjectName"))
        topic_label = clean(row.get("topic"))
        verified_term = clean(row.get("term"))
        source_key = (level, norm(subject), norm(topic_label))
        matching_terms = exact_source_terms.get(source_key, set())
        if not verified_term and len(matching_terms) == 1:
            verified_term = next(iter(matching_terms))
            assignment_key = (level, subject, verified_term, topic_label)
            assignment = base_assignment_groups.setdefault(
                assignment_key,
                {
                    "level": level,
                    "subject": subject,
                    "term": verified_term,
                    "topic": topic_label,
                    "questionCount": 0,
                    "sourcePdfPages": sorted(exact_source_pages.get((*source_key, verified_term), set())),
                },
            )
            assignment["questionCount"] += 1
        base_rows_for_output.append({**row, "term": verified_term})
        existing_slugs.setdefault((level, norm(subject)), clean(row.get("subjectSlug")))
        existing_stems[clean(row.get("subjectSlug"))].add(norm(clean(row.get("stem"))))

    topic_lookup: dict[tuple[str, str, str], list[tuple[str, dict[str, Any], str, list[int]]]] = defaultdict(list)
    generated_records: list[dict[str, str]] = []
    eligible_topics = 0
    topic_mode_counts: Counter[str] = Counter()
    excluded = Counter()
    topic_counts: Counter[tuple[str, str, str]] = Counter()

    for entry in manifest["entries"]:
        level, subject, term = entry["level"], entry["subject"], entry["term"]
        slug = slug_for(level, subject, existing_slugs)
        for topic in entry["topics"]:
            if not topic.get("eligibleForQuestionGeneration"):
                excluded[topic.get("questionGenerationExclusionReason", "not eligible")] += 1
                continue
            details = topic_detail(topic)
            if details:
                detail, pages = details
            else:
                detail = ""
                pages = sorted({int(row["pdfPage"]) for row in topic.get("evidence", []) if row.get("pdfPage")})
            if len(topic["label"]) > 240:
                excluded["topic exceeds 240-character import limit"] += 1
                continue
            eligible_topics += 1
            topic_mode_counts[topic.get("questionGenerationMode", "source_detail" if detail else "topic_reference_only")] += 1
            topic_lookup[(level, norm(subject), term)].append((topic["label"], topic, detail, pages))

    by_subject: dict[tuple[str, str], list[tuple[str, str, str, str, list[int]]]] = defaultdict(list)
    for entry in manifest["entries"]:
        level, subject, term = entry["level"], entry["subject"], entry["term"]
        for label, topic, detail, pages in topic_lookup.get((level, norm(subject), term), []):
            by_subject[(level, norm(subject))].append((term, label, detail, detail, pages))

    ambiguous_topic_details = 0
    per_topic_counts: Counter[int] = Counter()
    for entry in manifest["entries"]:
        level, subject, term = entry["level"], entry["subject"], entry["term"]
        own_topics = topic_lookup.get((level, norm(subject), term), [])
        all_subject_topics = by_subject.get((level, norm(subject)), [])
        slug = slug_for(level, subject, existing_slugs)
        for label, topic, detail, pages in own_topics:
            topic_candidates = [
                other_label
                for other_label, _, _, _ in own_topics
                if norm(other_label) != norm(label)
            ]
            topic_candidates = deterministic_shuffle(topic_candidates, f"topic|{level}|{subject}|{term}|{label}")
            if len({norm(value) for value in topic_candidates}) < 3:
                topic_candidates = deterministic_shuffle(
                    [row[1] for row in all_subject_topics if norm(row[1]) != norm(label)],
                    f"topic-all|{level}|{subject}|{term}|{label}",
                )

            detail_candidates = [
                other_detail
                for _, other_label, other_detail, _, _ in all_subject_topics
                if norm(other_label) != norm(label) and norm(other_detail) != norm(detail)
            ]
            detail_candidates = deterministic_shuffle(detail_candidates, f"detail|{level}|{subject}|{term}|{label}")
            target_page_labels = {f"PDF p. {page}" for page in pages}
            page_candidates = deterministic_shuffle(
                sorted(
                    {
                        f"PDF p. {page}"
                        for _, _, _, _, source_pages in all_subject_topics
                        for page in source_pages
                        if f"PDF p. {page}" not in target_page_labels
                    }
                ),
                f"page|{level}|{subject}|{term}|{label}",
            )
            if len(page_candidates) < 3:
                page_candidates = deterministic_shuffle(
                    sorted(
                        {
                            f"PDF p. {evidence['pdfPage']}"
                            for source_entry in manifest["entries"]
                            if source_entry["level"] == level
                            for source_topic in source_entry["topics"]
                            for evidence in source_topic.get("evidence", [])
                            if evidence.get("pdfPage")
                            and f"PDF p. {evidence['pdfPage']}" not in target_page_labels
                        }
                    ),
                    f"page-all|{level}|{subject}|{term}|{label}",
                )

            detail_key = norm(detail)
            same_detail_labels = {
                norm(other_label)
                for other_term, other_label, other_detail, _, _ in all_subject_topics
                if detail_key
                and other_term == term
                and norm(other_detail) == detail_key
                and norm(other_label) != norm(label)
            }
            ambiguous_detail = bool(same_detail_labels)
            if ambiguous_detail:
                ambiguous_topic_details += 1
            if not detail:
                template_indices = [2, 3]
            elif ambiguous_detail:
                template_indices = [1, 2]
            else:
                template_indices = [0, 1, 2]
            per_topic_counts[len(template_indices)] += 1
            for template_index in template_indices:
                row = make_question(
                    slug=slug,
                    subject=subject,
                    level=level,
                    term=term,
                    topic_label=label,
                    detail=detail,
                    detail_pages=pages,
                    template_index=template_index,
                    topic_distractors=topic_candidates,
                    detail_distractors=detail_candidates,
                    page_distractors=page_candidates,
                )
                stem_key = norm(row["stem"])
                if stem_key in existing_stems[slug]:
                    raise ValueError(f"Generated duplicate stem for {slug}: {row['stem']}")
                existing_stems[slug].add(stem_key)
                generated_records.append(row)
                topic_counts[(level, norm(subject), term)] += 1

    expected_generated = sum(question_count * topic_count for question_count, topic_count in per_topic_counts.items())
    if len(generated_records) != expected_generated:
        raise AssertionError(f"expected {expected_generated} generated rows, got {len(generated_records)}")

    output_fields = list(FIELDS)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=output_fields, extrasaction="ignore")
        writer.writeheader()
        for row in base_rows_for_output:
            writer.writerow({field: row.get(field, "") for field in output_fields})
        writer.writerows(generated_records)

    rows_by_entry = [
        {
            "level": level,
            "subject": subject,
            "term": term,
            "generatedQuestionCount": topic_counts[(level, norm(subject), term)],
            "eligibleTopicCount": len(topic_lookup.get((level, norm(subject), term), [])),
        }
        for level, subject, term in sorted(topic_lookup, key=lambda item: (item[0], item[1], item[2]))
    ]
    required_pairs = {
        (entry["level"], norm(entry["subject"])): {"level": entry["level"], "subject": entry["subject"]}
        for entry in manifest["entries"]
    }
    base_pairs = {
        (clean(row.get("classLevel")).lower(), norm(clean(row.get("subjectName"))))
        for row in base_rows
    }
    base_exact_pairs = set(required_pairs) & base_pairs
    report = {
        "status": "drafts_generated_not_reviewed",
        "baseBank": str(args.base.relative_to(ROOT) if args.base.is_relative_to(ROOT) else args.base),
        "baseRows": len(base_rows),
        "baseBankExactSubjectPairsPresent": len(base_exact_pairs),
        "baseBankExactSubjectPairsMissing": [
            required_pairs[key]
            for key in sorted(set(required_pairs) - base_exact_pairs)
        ],
        "baseBankAliasHandling": "exact class/subject identity only; no legacy subject aliases inferred",
        "generatedRows": len(generated_records),
        "mergedRows": len(base_rows) + len(generated_records),
        "eligibleSourceTopics": eligible_topics,
        "eligibleTopicModes": dict(topic_mode_counts),
        "questionsPerEligibleTopic": "2 or 3; ambiguous source-detail mappings omit the topic-identification item",
        "ambiguousTopicDetailMappings": ambiguous_topic_details,
        "generatedQuestionCountDistribution": {str(key): value for key, value in sorted(per_topic_counts.items())},
        "newQuestionSource": SOURCE,
        "baseQuestionTermsAssigned": sum(item["questionCount"] for item in base_assignment_groups.values()),
        "baseQuestionTermAssignmentGroups": sorted(
            base_assignment_groups.values(),
            key=lambda item: (item["level"], item["subject"], item["term"], item["topic"]),
        ),
        "baseQuestionTermHandling": "only exact class/subject/topic matches with one unique source term are assigned; all other legacy terms remain blank; no subject aliases are inferred",
        "excludedTopicRows": sum(excluded.values()),
        "exclusionReasons": dict(excluded),
        "sourceEntriesWithoutTopics": manifest["missingSourceEntries"],
        "coverageByClassSubjectTerm": rows_by_entry,
        "reviewWarning": "Generated items test source-scheme mapping and are drafts, not reviewed subject-matter questions.",
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Base rows: {len(base_rows)}; generated drafts: {len(generated_records)}; merged: {len(base_rows) + len(generated_records)}")
    print(f"Source topics represented by drafts: {eligible_topics}; excluded source-topic rows: {sum(excluded.values())}")
    print(f"Wrote {args.output} and {args.report}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
