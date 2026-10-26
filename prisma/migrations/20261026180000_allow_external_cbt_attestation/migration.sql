-- A workflow actor is an external reviewer, not an application User.
-- Permit exactly one reviewer identity while retaining the evidence required
-- for every question promoted to reviewed.
ALTER TABLE "CbtQuestion"
  DROP CONSTRAINT "CbtQuestion_review_attestation_check";

ALTER TABLE "CbtQuestion"
  ADD CONSTRAINT "CbtQuestion_review_attestation_check"
    CHECK (
      "status" <> 'reviewed' OR (
        (
          ("reviewedByUserId" IS NOT NULL AND "reviewedByExternalActor" IS NULL)
          OR
          (
            "reviewedByUserId" IS NULL AND
            "reviewedByExternalActor" IS NOT NULL AND
            length(trim("reviewedByExternalActor")) > 0
          )
        ) AND
        "reviewedAt" IS NOT NULL AND
        "reviewReference" IS NOT NULL AND
        length(trim("reviewReference")) >= 10 AND
        "reviewNotes" IS NOT NULL AND
        length(trim("reviewNotes")) >= 20
      )
    );
