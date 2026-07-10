// covers: domain:setup-semver
// size: small
//
// SemVer.parse / isLaterThan / isStable / latestStableOf (BR-F01~F03, BR-F05).

import { describe, expect, test } from "bun:test";
import { SemVer } from "../../packages/setup/src/domain/semver.ts";

function parseOk(raw: string) {
  const result = SemVer.parse(raw);
  if (result.type === "err") throw new Error(`expected ok, got err: ${result.error.reason}`);
  return result.value;
}

describe("SemVer.parse", () => {
  test("parses a plain MAJOR.MINOR.PATCH", () => {
    const v = parseOk("1.2.3");
    expect(v.major).toBe(1);
    expect(v.minor).toBe(2);
    expect(v.patch).toBe(3);
    expect(v.prerelease).toBeNull();
  });

  test("normalizes an optional 'v' prefix (BR-F05)", () => {
    const withV = parseOk("v1.2.3");
    const withoutV = parseOk("1.2.3");
    expect(withV.equals(withoutV)).toBe(true);
  });

  test("parses a prerelease segment", () => {
    const v = parseOk("1.2.3-beta.1");
    expect(v.prerelease).toBe("beta.1");
    expect(v.isStable()).toBe(false);
  });

  test("edge case: rejects a malformed version string", () => {
    const result = SemVer.parse("not-a-version");
    expect(result.type).toBe("err");
    if (result.type === "err") {
      expect(result.error.type).toBe("invalid-format");
      expect(result.error.raw).toBe("not-a-version");
    }
  });

  test("edge case: rejects a version missing the patch segment", () => {
    const result = SemVer.parse("1.2");
    expect(result.type).toBe("err");
  });
});

describe("SemVer#isStable", () => {
  test("a version with no prerelease is stable", () => {
    expect(parseOk("2.0.0").isStable()).toBe(true);
  });

  test("a version with a prerelease is not stable", () => {
    expect(parseOk("2.0.0-rc.1").isStable()).toBe(false);
  });
});

describe("SemVer#isLaterThan", () => {
  test("BR-F03: numeric ordering, not lexicographic (v1.10.0 > v1.9.0)", () => {
    expect(parseOk("1.10.0").isLaterThan(parseOk("1.9.0"))).toBe(true);
    expect(parseOk("1.9.0").isLaterThan(parseOk("1.10.0"))).toBe(false);
  });

  test("compares major before minor before patch", () => {
    expect(parseOk("2.0.0").isLaterThan(parseOk("1.99.99"))).toBe(true);
    expect(parseOk("1.2.0").isLaterThan(parseOk("1.1.99"))).toBe(true);
    expect(parseOk("1.1.2").isLaterThan(parseOk("1.1.1"))).toBe(true);
  });

  test("edge case: equal versions are not later than each other", () => {
    expect(parseOk("1.2.3").isLaterThan(parseOk("1.2.3"))).toBe(false);
  });

  // FR-747 (issue #747): at the same major.minor.patch, prerelease ordering
  // (SemVer §11) decides — the release outranks its prerelease and prereleases
  // order by their identifiers. Before the fix isLaterThan returned false for
  // any same-triple pair, so a prerelease -> release upgrade looked like a
  // no-op; these cases fail against that.
  test("FR-747: a release is later than its prerelease at the same major.minor.patch", () => {
    expect(parseOk("1.0.0").isLaterThan(parseOk("1.0.0-rc.1"))).toBe(true);
    expect(parseOk("1.0.0-rc.1").isLaterThan(parseOk("1.0.0"))).toBe(false);
  });

  test("FR-747: prereleases order by their identifiers", () => {
    expect(parseOk("1.0.0-rc.2").isLaterThan(parseOk("1.0.0-rc.1"))).toBe(true);
    expect(parseOk("1.0.0-rc.1").isLaterThan(parseOk("1.0.0-rc.2"))).toBe(false);
    // alphanumeric identifiers compare lexically (SemVer §11)
    expect(parseOk("1.0.0-beta").isLaterThan(parseOk("1.0.0-alpha"))).toBe(true);
    expect(parseOk("1.0.0-alpha").isLaterThan(parseOk("1.0.0-beta"))).toBe(false);
    // numeric identifiers rank below alphanumeric ones (SemVer §11)
    expect(parseOk("1.0.0-beta").isLaterThan(parseOk("1.0.0-2"))).toBe(true);
    // a longer identifier set outranks a shorter prefix of it
    expect(parseOk("1.0.0-rc.1.1").isLaterThan(parseOk("1.0.0-rc.1"))).toBe(true);
    // identical prereleases are not later than each other
    expect(parseOk("1.0.0-rc.1").isLaterThan(parseOk("1.0.0-rc.1"))).toBe(false);
  });
});

describe("SemVer#format", () => {
  test("formats a stable version with the 'v' prefix", () => {
    expect(parseOk("1.2.3").format()).toBe("v1.2.3");
  });

  test("formats a prerelease version including the segment", () => {
    expect(parseOk("1.2.3-beta.1").format()).toBe("v1.2.3-beta.1");
  });
});

describe("SemVer.latestStableOf", () => {
  test("picks the numerically latest stable version, excluding prereleases (BR-F02)", () => {
    const list = [parseOk("1.9.0"), parseOk("1.10.0-rc.1"), parseOk("1.10.0"), parseOk("1.2.0")];
    const best = SemVer.latestStableOf(list);
    expect(best?.format()).toBe("v1.10.0");
  });

  test("edge case: returns undefined when the list is empty", () => {
    expect(SemVer.latestStableOf([])).toBeUndefined();
  });

  test("edge case: returns undefined when only prereleases are present", () => {
    expect(SemVer.latestStableOf([parseOk("2.0.0-rc.1")])).toBeUndefined();
  });
});
