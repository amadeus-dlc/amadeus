// t270 — G1 repository validator: canonicalization, issue number, remote URL.
// covers: packages/framework/core/tools/amadeus-mirror-gateway.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  parseIssueNumber,
  parseRepositoryIdentity,
  parseRepositoryUrlIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-gateway.ts";

describe("parseRepositoryIdentity", () => {
  test("accepts ASCII alphanumerics and - _ . and lowercases canonical", () => {
    const id = parseRepositoryIdentity("Amadeus-DLC", "My_Repo.v2");
    expect(id).not.toBeNull();
    expect(id?.owner).toBe("amadeus-dlc");
    expect(id?.name).toBe("my_repo.v2");
    expect(id?.canonical).toBe("amadeus-dlc/my_repo.v2");
  });

  test("keeps a single lowercase representation (no display-case field)", () => {
    const id = parseRepositoryIdentity("OWNER", "NAME");
    expect(Object.values(id ?? {})).not.toContain("OWNER");
    expect(id?.canonical).toBe("owner/name");
  });

  test.each([
    ["leading space owner", " owner", "name"],
    ["trailing space name", "owner", "name "],
    ["slash in owner", "own/er", "name"],
    ["slash in name", "owner", "na/me"],
    ["non-ascii owner", "ówner", "name"],
    ["empty owner", "", "name"],
    ["empty name", "owner", ""],
    ["space inside", "ow ner", "name"],
  ])("rejects %s", (_label, owner, name) => {
    expect(parseRepositoryIdentity(owner, name)).toBeNull();
  });
});

describe("parseIssueNumber", () => {
  test.each([
    [1, 1],
    [42, 42],
    [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  ])("accepts positive safe integer %p", (input, expected) => {
    expect(parseIssueNumber(input)).toBe(expected);
  });

  test.each([
    ["zero", 0],
    ["negative", -3],
    ["float", 1.5],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["unsafe integer", Number.MAX_SAFE_INTEGER + 1],
    ["string", "5"],
    ["null", null],
    ["undefined", undefined],
  ])("rejects %s", (_label, input) => {
    expect(parseIssueNumber(input)).toBeNull();
  });
});

describe("parseRepositoryUrlIdentity", () => {
  test("parses api.github.com repos URL into matching lowercase canonical", () => {
    const id = parseRepositoryUrlIdentity(
      "https://api.github.com/repos/Amadeus-DLC/Amadeus",
    );
    expect(id?.canonical).toBe("amadeus-dlc/amadeus");
  });

  test.each([
    ["extra path segment", "https://api.github.com/repos/o/n/issues"],
    ["missing name segment", "https://api.github.com/repos/o"],
    ["wrong prefix", "https://api.github.com/orgs/o/n"],
    ["non-api host", "https://github.com/repos/o/n"],
    ["http not https", "http://api.github.com/repos/o/n"],
    ["not a url", "not-a-url"],
    ["slash-bearing segment", "https://api.github.com/repos/o/n%2Fx/extra"],
  ])("rejects %s", (_label, url) => {
    expect(parseRepositoryUrlIdentity(url)).toBeNull();
  });
});
