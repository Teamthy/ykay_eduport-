import { describe, expect, it } from "vitest";
import { getAdmissionDocumentScanReadiness } from "@/lib/admissions";

describe("admission document scan readiness", () => {
  it("requires clean verdicts for every uploaded document in production", () => {
    expect(getAdmissionDocumentScanReadiness(["CLEAN", "CLEAN"], true)).toBe("clean");
    expect(getAdmissionDocumentScanReadiness(["CLEAN", "PENDING"], true)).toBe("pending");
    expect(getAdmissionDocumentScanReadiness(["SKIPPED"], true)).toBe("pending");
    expect(getAdmissionDocumentScanReadiness(["CLEAN", "INFECTED"], true)).toBe("infected");
  });

  it("does not block local development flows on production scan verdicts", () => {
    expect(getAdmissionDocumentScanReadiness(["SKIPPED"], false)).toBe("clean");
  });
});
