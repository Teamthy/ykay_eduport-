# CBT curriculum source mapping

## Source of truth

- `source-scheme.pdf` is the supplied 476-page Nigerian JSS/SSS scheme.
- Its SHA-256 is recorded in `prisma/cbt-curriculum-subjects.json` and the extracted topic manifest.
- `prisma/cbt-curriculum-topic-manifest.json` holds 414 class/subject/term slots, extracted topic rows, source PDF page references, eligibility flags, and explicit source gaps. It intentionally has no week field.
- `sourceHeadingAliases` in `prisma/cbt-curriculum-subjects.json` records source section headings reconciled to official subject-list names. This reconciliation is for PDF extraction only; the legacy-bank audit still requires exact class/subject labels and does not infer aliases.
- `ss3-trade-section-audit.md` is the readable transcription of the six SS3 trade schemes on PDF pages 433–450. Page 432 is an index, and page 451 is a sample-lesson-note advertisement/notice.

## Recreate the extraction

Install the pinned extraction-only dependency, then run:

```bash
python3 -m pip install -r scripts/requirements-cbt-curriculum-extraction.txt
python3 scripts/extract-cbt-curriculum.py
```

The script retains source page citations and does not fill class/subject/term entries absent from the PDF. Review the PDF and extracted rows before treating content as a verified curriculum mapping.

## Recreate the draft bank

```bash
python3 scripts/generate-cbt-curriculum-bank.py
CBT_BANK_FILE=cbt-bank-19k-draft.csv npm run cbt:preflight
python3 scripts/audit-cbt-curriculum-topic-coverage.py
python3 scripts/audit-cbt-draft-answer-keys.py
```

The original 10,000-row CSV is left untouched. In the merged CSV, a legacy row receives a term only when its class, subject, and exact topic label match one unique source term; all other legacy terms stay blank. New questions use explicit source-derived terms/topics and the `curriculum-map-draft` source label. They test alignment to scheme labels/content, not independent subject-matter truth; all generated rows require human review and remain drafts on import.

## Coverage limitations

The source manifest includes 414 expected class/subject/term combinations. The supplied PDF currently has no extracted topic section for 27 combinations; those are listed in `missingSourceEntries` and are not inferred. The existing 10,000-row bank has exact class/subject identity in 24/138 required pairs. No legacy subject aliases are inferred. In the merged CSV, 172 legacy rows receive a term only where exact class/subject/topic identity has one unique source term; the other 9,828 legacy rows remain unassigned. The merged draft bank has source-mapped rows in all 138 exact pairs. Administrative schedule rows and placeholder-only topic cells remain in the manifest but are not converted into questions. Meaningful topic rows without descriptive content receive lower-confidence source-navigation drafts; the CBT topic field accepts up to 240 characters so long source labels remain intact. The audit reports these separately and must not be read as full textbook-content verification, database import, staging validation, or production evidence.
