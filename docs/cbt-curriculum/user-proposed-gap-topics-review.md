# User-proposed topics for missing curriculum slots

`prisma/cbt-curriculum-user-proposals.json` transcribes the candidate topics submitted by the user for the 27 class/subject/term slots that have no extracted topics in the supplied PDF. The accompanying `prisma/cbt-curriculum-user-proposals-review.csv` is a row-per-topic review worksheet.

## Evidence and status

- The user has stated that these topics have already been factually reviewed. The register records that attestation; it does not independently repeat or validate the review.
- The submitter described the topics as based on NERDC curricula but did not provide an official document edition or page citations. NERDC provenance is therefore not independently verified.
- `officialCitation` and `pdfPageReferences` remain blank. Add them if source traceability is required.
- The proposals remain separate from the source-extracted manifest and generated CBT bank; they do not change the supplied PDF's 27 documented gaps. Generated questions still require their own review before publication.
- `Catering Craft Practice` was submitted for a missing `Catering Craft` slot. The proposed register preserves that submitted label and flags the subject identity for confirmation.
- Week numbers and week-based organization are omitted. Revision-only and exam/past-question-only activities are omitted; specific content areas named inside revision lists are retained as candidate topics.

To recreate the review worksheet:

```bash
python3 scripts/export-cbt-curriculum-proposals-review.py
```

Human review should confirm each topic against an authoritative curriculum source, add the citation, and resolve any subject-name mismatch before the proposals are considered for bank generation. This register is a review queue, not evidence that the 27 source gaps have been filled.
