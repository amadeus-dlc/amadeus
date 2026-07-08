// covers: domain:setup-version-spec
//
// VersionSpec.latest/exact admits() rules (BR-F02, BR-F04).

import { describe, expect, test } from "bun:test";
import { VersionSpec } from "../../packages/setup/src/domain/version-spec.ts";
import { semver } from "../lib/setup-domain-fixtures.ts";

describe("VersionSpec.latest", () => {
  const spec = VersionSpec.latest();

  test("admits a stable candidate", () => {
    expect(spec.admits(semver("1.2.3"))).toBe(true);
  });

  test("BR-F02: never admits a prerelease candidate", () => {
    expect(spec.admits(semver("1.2.3-beta.1"))).toBe(false);
  });

  test("describe() is human-readable", () => {
    expect(spec.describe()).toBe("latest stable version");
  });
});

describe("VersionSpec.exact", () => {
  test("admits only the exact requested version", () => {
    const specResult = VersionSpec.exact("1.2.3");
    if (specResult.type === "err") throw new Error("unexpected err");
    expect(specResult.value.admits(semver("1.2.3"))).toBe(true);
    expect(specResult.value.admits(semver("1.2.4"))).toBe(false);
  });

  test("BR-F04: admits a prerelease when explicitly requested", () => {
    const specResult = VersionSpec.exact("1.2.3-beta.1");
    if (specResult.type === "err") throw new Error("unexpected err");
    expect(specResult.value.admits(semver("1.2.3-beta.1"))).toBe(true);
  });

  test("edge case: rejects an invalid version string at construction time", () => {
    const specResult = VersionSpec.exact("not-a-version");
    expect(specResult.type).toBe("err");
  });

  test("edge case: normalizes the 'v' prefix like SemVer.parse (BR-F05)", () => {
    const specResult = VersionSpec.exact("v1.2.3");
    if (specResult.type === "err") throw new Error("unexpected err");
    expect(specResult.value.admits(semver("1.2.3"))).toBe(true);
  });
});
