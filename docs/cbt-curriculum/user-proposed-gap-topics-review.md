# User-proposed topics for missing curriculum slots

`prisma/cbt-curriculum-user-proposals.json` transcribes the candidate topics submitted by the user for the 27 class/subject/term slots that have no extracted topics in the supplied PDF. The accompanying `prisma/cbt-curriculum-user-proposals-review.csv` is a row-per-topic review worksheet.

## Evidence and status

- These are **user-provided proposals**, not independently verified NERDC topics. The submitter described them as based on NERDC curricula, but did not provide an official document edition, page citation, or other verifiable reference.
- `officialCitation` and `pdfPageReferences` are intentionally blank in the review worksheet. Fill these from an authoritative source during review.
- All proposals remain `pending`; they are not added to the source-extracted manifest, source-coverage counts, generated CBT bank, or published content.
- `Catering Craft Practice` was submitted for a missing `Catering Craft` slot. The proposed register preserves that submitted label and flags the subject identity for confirmation.
- Week numbers and week-based organization are omitted. Revision-only and exam/past-question-only activities are omitted; specific content areas named inside revision lists are retained as candidate topics.

To recreate the review worksheet:

```bash
python3 scripts/export-cbt-curriculum-proposals-review.py
```

Human review should confirm each topic against an authoritative curriculum source, add the citation, and resolve any subject-name mismatch before the proposals are considered for bank generation. This register is a review queue, not evidence that the 27 source gaps have been filled.
