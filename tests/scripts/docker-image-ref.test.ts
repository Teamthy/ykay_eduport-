import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  imageReference,
  normaliseComponent,
  normaliseTag,
} from "../../scripts/docker-image-ref.mjs";

/**
 * Every publish from main failed with "invalid reference format" because the
 * repository slug (`Teamthy/ykay_eduport-`) is not a valid image path. These
 * cases pin the normalisation down, including the exact slug that broke it.
 */
describe("docker image reference", () => {
  it("turns this repository's slug into the reference it should have used", () => {
    expect(imageReference("ghcr.io", "Teamthy/ykay_eduport-", "main")).toBe(
      "ghcr.io/teamthy/ykay_eduport:main",
    );
  });

  it("keeps release tags readable", () => {
    expect(imageReference("ghcr.io", "Teamthy/ykay_eduport-", "1.2.3")).toBe(
      "ghcr.io/teamthy/ykay_eduport:1.2.3",
    );
  });

  it("normalises owner, name and tag together", () => {
    expect(imageReference("GHCR.IO", "Some Owner/My Repo!", "feature/x")).toBe(
      "ghcr.io/some-owner/my-repo:feature-x",
    );
  });

  it("keeps nested repository paths as separate components", () => {
    expect(imageReference("ghcr.io", "owner/group/app", "main")).toBe(
      "ghcr.io/owner/group/app:main",
    );
  });

  it("refuses input that cannot become a reference", () => {
    expect(() => imageReference("", "owner/app", "main")).toThrow(/registry/);
    expect(() => imageReference("ghcr.io/x", "owner/app", "main")).toThrow(/registry/);
    expect(() => imageReference("ghcr.io", "app", "main")).toThrow(/owner and a name/);
    expect(() => imageReference("ghcr.io", "owner/app", "///")).toThrow(/tag/);
  });
});

describe("normalisation", () => {
  it("strips separators Docker will not accept at component edges", () => {
    expect(normaliseComponent("ykay_eduport-")).toBe("ykay_eduport");
    expect(normaliseComponent("-leading")).toBe("leading");
    expect(normaliseComponent("a__b")).toBe("a-b");
    expect(normaliseComponent("A.B")).toBe("a.b");
  });

  it("keeps tags valid without lowercasing them", () => {
    expect(normaliseTag("v1.2.3-RC1")).toBe("v1.2.3-RC1");
    expect(normaliseTag("feature/login")).toBe("feature-login");
    expect(normaliseTag(".hidden")).toBe("hidden");
    expect(normaliseTag("x".repeat(200))).toHaveLength(128);
  });
});

describe("command line", () => {
  const script = join(process.cwd(), "scripts/docker-image-ref.mjs");

  it("prints the reference the workflow publishes", () => {
    const output = execFileSync(
      process.execPath,
      [script, "ghcr.io", "Teamthy/ykay_eduport-", "main"],
      { encoding: "utf8" },
    );
    expect(output.trim()).toBe("ghcr.io/teamthy/ykay_eduport:main");
  });

  it("fails loudly instead of emitting an invalid reference", () => {
    try {
      execFileSync(process.execPath, [script, "ghcr.io", "Teamthy", "main"], {
        encoding: "utf8",
        stdio: "pipe",
      });
      throw new Error("expected a non-zero exit");
    } catch (error) {
      const failure = error as { status?: number; stderr?: string };
      expect(failure.status).toBe(1);
      expect(failure.stderr).toContain("::error::");
    }
  });
});
