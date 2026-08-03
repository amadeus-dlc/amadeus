// covers: domain:setup-resolved-version
// size: small
//
// ResolvedVersion.fromRelease/fromTag, archive source selection (ADR-003),
// and isSameAs() (US-B4).

import { describe, expect, test } from "bun:test";
import { ResolvedVersion } from "../../packages/setup/src/domain/resolved-version.ts";
import { semver } from "../lib/setup-domain-fixtures.ts";

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

  test("ADR-003: versions before the asset boundary use the unchanged codeload URL", () => {
    const resolved = ResolvedVersion.fromRelease(semver("0.1.7"));
    expect(resolved.archiveSource()).toEqual({
      kind: "codeload",
      archiveUrl: new URL("https://codeload.github.com/amadeus-dlc/amadeus/tar.gz/refs/tags/v0.1.7"),
    });
    expect(resolved.archiveUrl().toString()).toBe(
      "https://codeload.github.com/amadeus-dlc/amadeus/tar.gz/refs/tags/v0.1.7",
    );
  });

  test("ADR-003: the asset boundary and later versions require release assets", () => {
    const resolved = ResolvedVersion.fromRelease(semver("0.1.8"));
    expect(resolved.archiveSource()).toEqual({
      kind: "asset",
      archiveName: "amadeus-dist-v0.1.8.tar.gz",
      archiveUrl: new URL(
        "https://github.com/amadeus-dlc/amadeus/releases/download/v0.1.8/amadeus-dist-v0.1.8.tar.gz",
      ),
      checksumUrl: new URL("https://github.com/amadeus-dlc/amadeus/releases/download/v0.1.8/SHA256SUMS"),
    });
  });

  test("edge case: a prerelease below the stable asset boundary still uses codeload", () => {
    const resolved = ResolvedVersion.fromTag(semver("0.1.8-beta.1"));
    expect(resolved.archiveSource().kind).toBe("codeload");
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
      "https://github.com/amadeus-dlc/amadeus/releases/download/v1.2.3-beta.1/amadeus-dist-v1.2.3-beta.1.tar.gz",
    );
  });
});
