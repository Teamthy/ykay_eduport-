#!/usr/bin/env python3
"""Extract term/topic rows from the user-supplied scheme PDF.

Requires pdfplumber (install from requirements-cbt-curriculum-extraction.txt).
Week numbers are intentionally not exported; source page references are kept.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PDF = ROOT / "docs/cbt-curriculum/source-scheme.pdf"
DEFAULT_SUBJECTS = ROOT / "prisma/cbt-curriculum-subjects.json"
DEFAULT_OUTPUT = ROOT / "prisma/cbt-curriculum-topic-manifest.json"

HEADING_RE = re.compile(
    r"\b(?P<prefix>JSS|SSS?|SS)\s*(?P<grade>[123])\s+"
    r"(?P<subject>[^\n]+?)(?:\s+SCHEME\s+OF\s+WOR?K)?\s*$",
    re.IGNORECASE | re.MULTILINE,
)
TERM_RE = re.compile(r"\b(FIRST|SECOND|THIRD)\s+TERM\b", re.IGNORECASE)
ADMIN_TOPIC_RE = re.compile(
    r"\b(mid[ -]?term|revision|examination|exams?|break|closing|vacation|holiday|"
    r"welcome test|resumption test|mock test|mock examination|graduation)\b",
    re.IGNORECASE,
)

# Canonical labels use the official subject-list pages, while these aliases
# reconcile section headings such as "Financial Accounting" with "Accounting".
ALIASES = {
    "physical and health education": "Physical and Health Education",
    "physical health education": "Physical and Health Education",
    "christian religious studies crs": "Christian Religious Studies",
    "christian religious studies": "Christian Religious Studies",
    "islamic religious studies irs": "Islamic Studies",
    "islamic religious studies": "Islamic Studies",
    "islamic studies": "Islamic Studies",
    "cultural and creative arts cca": "Cultural and Creative Arts",
    "cultural and creative arts": "Cultural and Creative Arts",
    "cultural creative arts cca": "Cultural and Creative Arts",
    "cultural creative arts": "Cultural and Creative Arts",
    "literature in english": "Literature in English",
    "literature in english lit": "Literature in English",
    "foods nutrition": "Foods & Nutrition",
    "food and nutrition": "Foods & Nutrition",
    "financial accounting": "Accounting",
    "accounting": "Accounting",
    "catering and craft": "Catering Craft",
    "catering craft": "Catering Craft",
    "catering and craft practice": "Catering Craft",
    "solar photovoltaic pv installation and maintenance": "Solar Photovoltaic Installation and Maintenance",
    "solar photovoltaic installation and maintenance": "Solar Photovoltaic Installation and Maintenance",
    "solar photovoltaic installation maintenance": "Solar Photovoltaic Installation and Maintenance",
    "fashion design garment making": "Fashion Design and Garment Making",
    "fashion design and garment making": "Fashion Design and Garment Making",
    "english studies": "English Language",
    "english language": "English Language",
    "general mathematics": "General Mathematics",
    "mathematics": "General Mathematics",
    "agricultural science": "Agriculture",
    "agriculture": "Agriculture",
    "social and citizenship studies": "Social and Citizenship Studies",
    "citizenship and heritage studies": "Citizenship and Heritage Studies",
}


def clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").replace("\u00a0", " ")).strip()


def normalise(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", ascii_value.casefold()).strip()


def canonical_subject(raw: str, level: str, official_names: list[str]) -> str:
    raw = re.sub(r"\s+SCHEME\s+OF\s+WOR.*$", "", clean(raw), flags=re.IGNORECASE)
    key = normalise(re.sub(r"\s*\((?:CCA|CRS|IRS)\)\s*$", "", raw, flags=re.IGNORECASE))
    official_by_key = {normalise(name): name for name in official_names}
    if key in official_by_key:
        return official_by_key[key]
    aliased = ALIASES.get(key)
    if aliased:
        return official_by_key.get(normalise(aliased), aliased)
    if key == "english studies" and level.startswith("jss"):
        return official_by_key.get("english studies", "English Studies")
    if key == "mathematics" and level.startswith("jss"):
        return official_by_key.get("mathematics", "Mathematics")
    return clean(raw).title()


def parse_context(context: str, expected_levels: dict[str, Any]) -> tuple[str, str, str, str] | None:
    headings = list(HEADING_RE.finditer(context))
    terms = list(TERM_RE.finditer(context))
    if not headings or not terms:
        return None
    heading = headings[-1]
    term_matches = [term for term in terms if term.start() >= heading.start()]
    if not term_matches:
        term_matches = terms
    term = term_matches[-1]
    prefix = heading.group("prefix").upper()
    grade = heading.group("grade")
    level = ("jss" if prefix == "JSS" else "ss") + grade
    subject_names = expected_levels.get(level, {}).get("subjects", [])
    subject = canonical_subject(heading.group("subject"), level, subject_names)
    return level, subject, term.group(1).casefold(), clean(heading.group(0))


def is_week_cell(value: str) -> bool:
    return bool(re.fullmatch(r"[\d\s.,–—-]+", value.strip()))


def split_long_label(label: str) -> list[str]:
    label = clean(label)
    pieces = [clean(piece) for piece in re.split(r"(?=[A-D]\.\s)", label) if clean(piece)]
    if len(pieces) == 1 and len(label) > 120:
        pieces = [clean(piece) for piece in re.split(r"\s*;\s*|\s*[•▪]\s*", label) if clean(piece)]
    return pieces or [label]


def make_table_items(table: list[list[Any]], prior_headers: list[str] | None):
    if not table:
        return None, []
    headers: list[str] | None = None
    header_index: int | None = None
    for index, row in enumerate(table[:3]):
        normalized = [normalise(clean(value)) for value in row]
        header_words = set(" ".join(normalized).split())
        has_week = any(re.search(r"\bweek\b", value) for value in normalized)
        has_topic = bool(header_words.intersection({"topic", "topics", "theme", "unit", "unite"}))
        has_content_column = bool(header_words.intersection({"content", "breakdown", "objectives", "outcomes"}))
        has_english_strand = bool(header_words.intersection({"speech", "grammar", "reading", "composition"}))
        if (has_week and (has_topic or has_english_strand)) or (has_topic and has_content_column):
            headers = [clean(value) for value in row]
            header_index = index
            break
    if headers is None:
        headers = prior_headers
    if not headers:
        return None, []

    normalized_headers = [normalise(header) for header in headers]
    week_column = next((i for i, h in enumerate(normalized_headers) if "week" in h), 0)
    topic_columns = [
        i for i, header in enumerate(normalized_headers)
        if re.search(r"\b(topic|topics|theme|unite|unit)\b", header)
    ]
    fallback_columns = not topic_columns
    if fallback_columns:
        topic_columns = [
            i for i, header in enumerate(headers)
            if i != week_column and header and normalise(header) not in {"content", "breakdown", "learning objectives"}
        ]

    first_data_index = (header_index + 1) if header_index is not None else 0
    items: list[tuple[str, str, str]] = []
    for row in table[first_data_index:]:
        if not row:
            continue
        values = [clean(value) for value in row]
        if not any(values):
            continue
        if week_column >= len(values):
            continue
        week_value = values[week_column]
        if week_value and not is_week_cell(week_value):
            continue
        for column in topic_columns:
            if column >= len(values):
                continue
            raw_label = values[column]
            if not raw_label:
                continue
            content = " | ".join(
                values[i]
                for i in range(min(len(values), len(headers)))
                if i != week_column and i != column and values[i]
            )
            if fallback_columns:
                header = headers[column]
                segments = [clean(segment) for segment in re.split(r"\s*;\s*|\s*[•▪]\s*", raw_label) if clean(segment)] or [raw_label]
                for segment in segments:
                    items.append((f"{header}: {segment}", segment, raw_label))
            else:
                for segment in split_long_label(raw_label):
                    items.append((segment, content, raw_label))
    return headers, items


def extract_text_table(page: Any) -> list[tuple[str, str, str]]:
    """Read borderless tables by their aligned Week/Topic/Content text columns."""
    lines = page.extract_text_lines()
    words = page.extract_words()
    header_line = next(
        (
            line
            for line in lines
            if re.search(r"\bweek\b", line["text"], re.IGNORECASE)
            and re.search(r"\b(topic|topics|theme|unit|unite)\b", line["text"], re.IGNORECASE)
        ),
        None,
    )
    if not header_line:
        return []
    header_words = [word for word in words if abs(word["top"] - header_line["top"]) <= 2]
    topic_word = next(
        (word for word in header_words if re.fullmatch(r"topic|topics|theme|unit|unite", word["text"], re.IGNORECASE)),
        None,
    )
    content_word = next(
        (word for word in header_words if re.fullmatch(r"content|breakdown|objectives|outcomes?", word["text"], re.IGNORECASE)),
        None,
    )
    if not topic_word or not content_word:
        return []
    topic_x = topic_word["x0"]
    content_x = content_word["x0"]

    grouped_lines: list[tuple[float, list[dict[str, Any]]]] = []
    for line in lines:
        if line["top"] <= header_line["top"] + 4 or line["top"] > page.height - 35:
            continue
        line_words = [word for word in words if abs(word["top"] - line["top"]) <= 2]
        if line_words:
            grouped_lines.append((line["top"], sorted(line_words, key=lambda word: word["x0"])))

    rows: list[list[dict[str, Any]]] = []
    current_row: list[dict[str, Any]] = []
    for _, line_words in grouped_lines:
        starts_row = any(word["x0"] < topic_x - 4 for word in line_words)
        if starts_row and current_row:
            rows.append(current_row)
            current_row = []
        current_row.extend(line_words)
    if current_row:
        rows.append(current_row)

    items: list[tuple[str, str, str]] = []
    for row in rows:
        week_words = [word for word in row if word["x0"] < topic_x - 4]
        if not week_words or not is_week_cell(" ".join(word["text"] for word in week_words)):
            continue
        topic_text = clean(" ".join(word["text"] for word in row if topic_x - 4 <= word["x0"] < content_x - 4))
        content_text = clean(" ".join(word["text"] for word in row if word["x0"] >= content_x - 4))
        if topic_text:
            for segment in split_long_label(topic_text):
                items.append((segment, content_text, topic_text))
    return items


def finalise_topic_eligibility(topic: dict[str, Any]) -> None:
    label = topic["label"]
    details = [
        clean(evidence.get("content", ""))
        for evidence in topic["evidence"]
        if clean(evidence.get("content", ""))
    ]
    has_substance = any(normalise(detail) not in {"", "-", "--"} for detail in details)
    if ADMIN_TOPIC_RE.search(label):
        reason = "administrative assessment, revision, break, or closing row"
    elif len(label) > 240:
        reason = "source label exceeds the question bank's 240-character topic limit"
    elif not has_substance and re.search(r":\s*[–—-]\s*$", label):
        reason = "source row contains only a placeholder dash, not a topic detail"
    else:
        topic["eligibleForQuestionGeneration"] = True
        topic["questionGenerationMode"] = "source_detail" if has_substance else "topic_reference_only"
        topic.pop("questionGenerationExclusionReason", None)
        return
    topic["eligibleForQuestionGeneration"] = False
    topic["questionGenerationExclusionReason"] = reason
    topic.pop("questionGenerationMode", None)


def add_topic(grouped: dict, current: tuple[str, str, str], label: str, content: str, raw_label: str, page_number: int):
    key_norm = normalise(label)
    if not key_norm:
        return
    topic_record = grouped[current].setdefault(
        key_norm,
        {"label": label, "eligibleForQuestionGeneration": False, "evidence": []},
    )
    evidence = {"pdfPage": page_number, "sourceLabel": raw_label, "content": content}
    if evidence not in topic_record["evidence"]:
        topic_record["evidence"].append(evidence)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pdf", type=Path, default=DEFAULT_PDF)
    parser.add_argument("--subjects", type=Path, default=DEFAULT_SUBJECTS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    subject_document = json.loads(args.subjects.read_text(encoding="utf-8"))
    expected_levels = subject_document["levels"]
    grouped: dict[tuple[str, str, str], dict[str, dict[str, Any]]] = defaultdict(dict)
    section_pages: dict[tuple[str, str, str], set[int]] = defaultdict(set)
    headers_by_key: dict[tuple[str, str, str], list[str]] = {}
    current: tuple[str, str, str] | None = None
    text_fallback_pages = 0

    with pdfplumber.open(args.pdf) as pdf:
        page_count = len(pdf.pages)
        for page_number, page in enumerate(pdf.pages, start=1):
            tables = page.find_tables()
            if tables:
                for table_obj in tables:
                    _, top, _, _ = table_obj.bbox
                    context_top = max(0, top - 220)
                    context = page.crop((0, context_top, page.width, top)).extract_text() or ""
                    parsed_context = parse_context(context, expected_levels)
                    if parsed_context:
                        level, subject, term, _ = parsed_context
                        current = (level, subject, term)
                        section_pages[current].add(page_number)
                    elif len(tables) == 1 and not context.strip():
                        parsed_page = parse_context(page.extract_text() or "", expected_levels)
                        if parsed_page:
                            current = parsed_page[:3]
                            section_pages[current].add(page_number)
                    if current is None:
                        parsed_page = parse_context(page.extract_text() or "", expected_levels)
                        if parsed_page:
                            current = parsed_page[:3]
                            section_pages[current].add(page_number)
                    if current is None:
                        continue

                    table_data = table_obj.extract()
                    headers, items = make_table_items(table_data, headers_by_key.get(current))
                    if headers:
                        headers_by_key[current] = headers
                    for label, content, raw_label in items:
                        add_topic(grouped, current, label, content, raw_label, page_number)
                        section_pages[current].add(page_number)
                continue

            # Several source schedules (notably technical drawing and some
            # trade-subject appendices) are aligned text without table borders.
            page_text = page.extract_text() or ""
            parsed_page = parse_context(page_text, expected_levels)
            if parsed_page:
                current = parsed_page[:3]
            if current is None:
                continue
            text_items = extract_text_table(page)
            if text_items:
                text_fallback_pages += 1
                section_pages[current].add(page_number)
                for label, content, raw_label in text_items:
                    add_topic(grouped, current, label, content, raw_label, page_number)

    for topics in grouped.values():
        for topic in topics.values():
            finalise_topic_eligibility(topic)

    entries = []
    missing_subjects: list[dict[str, str]] = []
    for level, record in expected_levels.items():
        for subject in record["subjects"]:
            for term in subject_document["terms"]:
                key = (level, subject, term)
                topics = list(grouped.get(key, {}).values())
                topics.sort(key=lambda item: normalise(item["label"]))
                status = "mapped" if topics else "source_section_not_found"
                entries.append(
                    {
                        "level": level,
                        "subject": subject,
                        "term": term,
                        "status": status,
                        "sourceReferences": [f"PDF p. {page}" for page in sorted(section_pages.get(key, set()))],
                        "topics": topics,
                    }
                )
                if not topics:
                    missing_subjects.append({"level": level, "subject": subject, "term": term})

    unmatched = [
        {"level": level, "subject": subject, "term": term, "topicCount": len(topics)}
        for (level, subject, term), topics in grouped.items()
        if level not in expected_levels or subject not in expected_levels[level]["subjects"]
    ]
    source_hash = hashlib.sha256(args.pdf.read_bytes()).hexdigest()
    total_topics = sum(len(entry["topics"]) for entry in entries)
    eligible_topics = sum(
        1 for entry in entries for topic in entry["topics"] if topic["eligibleForQuestionGeneration"]
    )
    document = {
        "schemaVersion": 2,
        "source": {
            "title": subject_document["source"]["title"],
            "file": str(args.pdf.relative_to(ROOT) if args.pdf.is_relative_to(ROOT) else args.pdf),
            "sha256": source_hash,
            "pages": page_count,
            "extractor": {"name": "pdfplumber", "version": pdfplumber.__version__},
            "topicExtraction": "bordered-table and aligned-text extraction; source page references retained; week numbers intentionally omitted",
        },
        "sourceHeadingAliases": subject_document.get("sourceHeadingAliases", []),
        "sourcePageDisposition": [
            {"pdfPage": 432, "classification": "trade-subject index", "includedAsTopic": False},
            {"pdfPages": [433, 450], "classification": "SS3 trade-subject scheme tables", "includedAsTopic": True},
            {"pdfPage": 451, "classification": "sample-lesson-note advertisement/notice", "includedAsTopic": False},
        ],
        "status": "source_extracted_machine_mapped_needs_human_review",
        "coverage": {
            "expectedClassSubjectTermEntries": sum(len(r["subjects"]) for r in expected_levels.values()) * len(subject_document["terms"]),
            "entriesWithTopics": sum(bool(entry["topics"]) for entry in entries),
            "entriesWithoutTopics": len(missing_subjects),
            "uniqueTopicLabels": total_topics,
            "questionGenerationEligibleTopicLabels": eligible_topics,
            "borderlessTextTablePagesParsed": text_fallback_pages,
        },
        "missingSourceEntries": missing_subjects,
        "unmatchedSourceSections": unmatched,
        "entries": entries,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"PDF pages: {page_count}; class/subject/term entries: {len(entries)}")
    print(f"Entries with topics: {document['coverage']['entriesWithTopics']}; missing: {len(missing_subjects)}")
    print(f"Unique topic labels: {total_topics}; question-generation eligible: {eligible_topics}")
    print(f"Borderless text-table pages parsed: {text_fallback_pages}; unmatched sections: {len(unmatched)}")
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
