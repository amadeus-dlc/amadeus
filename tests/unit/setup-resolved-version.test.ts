// covers: domain:setup-resolved-version
//
// ResolvedVersion.fromRelease/fromTag, archiveUrl() (ADR-003), isSameAs() (US-B4).

import { describe, expect, test } from "bun:test";
import { SemVer } from "../../packages/setup/src/domain/semver.ts";
import { ResolvedVersion } from "../../packages/setup/src/domain/resolved-version.ts";

function semver(raw: string) {
  const result = SemVer.parse(raw);
  if (result.type === "err") throw new Error(`invalid fixture version: ${raw}`);
  return result.value;
}

describe("ResolvedVersion", () => {
  test("fromRelease carries the release source and formatted tag", () => {
    const resolved = ResolvedVersion.fromRelease(semver("1.2.3"));
    expect(resolved.source).toBe("release");
    expect(resolved.tag).toBe("v1.2.3");
  });

  test("fromTag carries the tag source", () => {
    const resolved = ResolvedVersion.fromTag(semver("1.2.3"));
    expect(resolved.source).toBe("tag");
  });

  test("ADR-003: archiveUrl() builds the codeload tar.gz URL for the tag", () => {
    const resolved = ResolvedVersion.fromRelease(semver("1.2.3"));
    expect(resolved.archiveUrl().toString()).toBe(
      "https://codeload.github.com/amadeus-dlc/amadeus/tar.gz/refs/tags/v1.2.3",
    );
  });

  test("isSameAs() matches an equal semver", () => {
    const resolved = ResolvedVersion.fromTag(semver("1.2.3"));
    expect(resolved.isSameAs(semver("1.2.3"))).toBe(true);
  });

  test("edge case: isSameAs() does not match a different semver", () => {
    const resolved = ResolvedVersion.fromTag(semver("1.2.3"));
    expect(resolved.isSameAs(semver("1.2.4"))).toBe(false);
  });

  test("edge case: archiveUrl() reflects the prerelease tag exactly", () => {
    const resolved = ResolvedVersion.fromTag(semver("1.2.3-beta.1"));
    expect(resolved.archiveUrl().toString()).toBe(
      "https://codeload.github.com/amadeus-dlc/amadeus/tar.gz/refs/tags/v1.2.3-beta.1",
    );
  });
});
