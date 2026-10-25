#!/usr/bin/env python3
"""Structural audit for the imported CBT candidate bank (not a fact checker)."""

import argparse
import csv
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BANK = ROOT / "prisma" / "cbt-bank.csv"
TARGET_LEVELS = {"jss1", "jss2", "jss3", "ss1", "ss2", "ss3"}
GENERIC_RATIONALES = (
    "common distractor",
    "mixes a related but different idea",
    "not the required relationship",
    "does not satisfy the stem",
)


def normalise(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().casefold())


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a structural (not factual) CBT-bank audit.")
    parser.add_argument("bank", nargs="?", type=Path, default=BANK, help="CSV path (default: prisma/cbt-bank.csv)")
    args = parser.parse_args()
    bank = args.bank.resolve()
    with bank.open(newline="", encoding="utf-8-sig") as stream:
        rows = list(csv.DictReader(stream))

    target = [row for row in rows if row.get("classLevel", "").strip().lower() in TARGET_LEVELS]
    per_level = Counter(row["classLevel"].strip().lower() for row in target)
    subjects_per_level = {
        level: len({row["subjectSlug"] for row in target if row["classLevel"].strip().lower() == level})
        for level in sorted(TARGET_LEVELS)
    }
    duplicate_options = 0
    invalid_answer_indices = 0
    duplicate_stems = 0
    answer_lead_mismatches = 0
    boilerplate_explanations = 0
    generic_rationale_rows = 0
    labeled_explanations = 0
    missing_labeled_rationales = 0
    empty_option_rows = 0
    missing_topic_rows = 0
    draft_source_rows = 0
    source_values: Counter[str] = Counter()
    seen_stems: set[tuple[str, str]] = set()

    for row in target:
        options = [row.get(f"option{letter}", "") for letter in "ABCD"]
        if any(not option.strip() for option in options):
            empty_option_rows += 1
        if len({normalise(option) for option in options}) != 4:
            duplicate_options += 1
        if not row.get("topic", "").strip():
            missing_topic_rows += 1
        source_value = row.get("source", "").strip()
        source_values[source_value] += 1
        if source_value == "original-draft":
            draft_source_rows += 1
        try:
            index = int(row.get("correctIndex", ""))
            if not 0 <= index <= 3:
                raise ValueError
        except ValueError:
            invalid_answer_indices += 1
            index = -1

        key = (row.get("subjectSlug", ""), normalise(row.get("stem", "")))
        if key in seen_stems:
            duplicate_stems += 1
        seen_stems.add(key)

        explanation = row.get("explanation", "")
        if "This sits in the NERDC scheme" in explanation:
            boilerplate_explanations += 1
        if any(phrase in explanation for phrase in GENERIC_RATIONALES):
            generic_rationale_rows += 1
        explanation_parts = re.split(r"; (?=[ABCD]: )", explanation)
        if any(re.match(r"^[ABCD]: ", part) for part in explanation_parts):
            labeled_explanations += 1
            parts = explanation_parts
            labels = [part[0] for part in parts if re.match(r"^[ABCD]: ", part)]
            correctly_labeled = [part for part in parts if " — Correct: " in part]
            has_all_rationales = (
                len(parts) == 4
                and labels == list("ABCD")
                and all(" — Incorrect: " in part or " — Correct: " in part for part in parts)
                and all(part.rsplit(" — ", 1)[-1].split(": ", 1)[-1].strip() for part in parts)
            )
            if not has_all_rationales:
                missing_labeled_rationales += 1
            if index >= 0 and (
                len(correctly_labeled) != 1
                or not correctly_labeled[0].startswith(f"{chr(65 + index)}: {options[index]} — Correct: ")
            ):
                answer_lead_mismatches += 1
        elif index >= 0:
            lead = f"The correct answer is {options[index]}"
            if not normalise(explanation).startswith(normalise(lead)):
                answer_lead_mismatches += 1

    try:
        source_path = str(bank.relative_to(ROOT))
    except ValueError:
        source_path = str(bank)
    result = {
        "source": source_path,
        "totalRows": len(rows),

        "targetLevelRows": len(target),
        "rowsByClass": {level: per_level[level] for level in sorted(TARGET_LEVELS)},
        "subjectsByClass": subjects_per_level,
        "targetDuplicateOptionRows": duplicate_options,
        "targetInvalidAnswerIndices": invalid_answer_indices,
        "targetDuplicateSubjectStemRows": duplicate_stems,
        "targetAnswerExplanationLeadMismatches": answer_lead_mismatches,
        "targetLabeledExplanationRows": labeled_explanations,
        "targetMissingLabeledRationaleRows": missing_labeled_rationales,
        "targetEmptyOptionRows": empty_option_rows,
        "targetMissingTopicRows": missing_topic_rows,
        "targetRowsWithOriginalDraftSource": draft_source_rows,
        "targetSourceValues": dict(source_values),
        "targetCurriculumBoilerplateExplanations": boilerplate_explanations,
        "targetGenericDistractorRationaleRows": generic_rationale_rows,
        "factualAccuracy": "NOT VERIFIED: requires subject-expert review against cited NERDC/WAEC sources",
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
