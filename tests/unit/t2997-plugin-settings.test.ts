// t2997 — plugin.settings declaration parse (#2997 C2).
// covers: packages/framework/core/tools/amadeus-plugin-compose.ts
// covers: packages/framework/core/tools/amadeus-plugin-settings.ts
// size: small

import { describe, expect, test } from "bun:test";
import { parsePluginManifest } from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";

function manifest(extra: Record<string, unknown>): Buffer {
  return Buffer.from(
    JSON.stringify({ name: "x", stages: [], seams: [], fragments: [], ...extra }),
  );
}

function parse(extra: Record<string, unknown>) {
  return parsePluginManifest("x", manifest(extra), () => null);
}

describe("t2997 plugin.settings declaration parse", () => {
  test("an absent settings field leaves the manifest declaration-free", () => {
    const parsed = parse({});
    expect(parsed.errors).toEqual([]);
    expect(parsed.manifest?.settings).toBeUndefined();
  });

  test("a well-formed declaration parses every supported type", () => {
    const parsed = parse({
      settings: {
        "fetch-throttle-seconds": { type: "number", default: 600, description: "fetch throttle" },
        label: { type: "string", default: "origin", description: "remote label" },
        enabled: { type: "boolean", default: true, description: "toggle" },
        mode: {
          type: "enum",
          values: ["fast", "thorough"],
          default: "fast",
          description: "scan mode",
        },
      },
    });
    expect(parsed.errors).toEqual([]);
    expect(parsed.manifest?.settings).toEqual({
      "fetch-throttle-seconds": { type: "number", default: 600, description: "fetch throttle" },
      label: { type: "string", default: "origin", description: "remote label" },
      enabled: { type: "boolean", default: true, description: "toggle" },
      mode: {
        type: "enum",
        values: ["fast", "thorough"],
        default: "fast",
        description: "scan mode",
      },
    });
  });

  test("a non-object settings field is rejected whole", () => {
    const parsed = parse({ settings: ["fetch-throttle-seconds"] });
    expect(parsed.manifest).toBeNull();
    expect(parsed.errors.some((e) => e.includes("must be an object mapping keys"))).toBe(true);
  });

  test.each([
    ["Fetch", { type: "number", default: 1, description: "d" }, "key name"],
    ["-lead", { type: "number", default: 1, description: "d" }, "key name"],
    ["a".repeat(65), { type: "number", default: 1, description: "d" }, "key name"],
  ])("an out-of-class key name (%s) is rejected", (key, declaration, needle) => {
    const parsed = parse({ settings: { [key]: declaration } });
    expect(parsed.manifest).toBeNull();
    expect(parsed.errors.some((e) => e.includes(needle))).toBe(true);
  });

  test.each(["api-token", "password", "client-secret", "gh-credential", "apikey", "my-api-key"])(
    "a secret-shaped key name (%s) is rejected",
    (key) => {
      const parsed = parse({
        settings: { [key]: { type: "string", default: "", description: "d" } },
      });
      expect(parsed.manifest).toBeNull();
      expect(parsed.errors.some((e) => e.includes("must not name a credential"))).toBe(true);
    },
  );

  test("an unknown type is rejected against the closed vocabulary", () => {
    const parsed = parse({ settings: { k: { type: "object", default: 1, description: "d" } } });
    expect(parsed.manifest).toBeNull();
    expect(parsed.errors.some((e) => e.includes("string | number | boolean | enum"))).toBe(true);
  });

  test("a default whose JS type contradicts the declared type is rejected", () => {
    const parsed = parse({ settings: { k: { type: "number", default: "600", description: "d" } } });
    expect(parsed.manifest).toBeNull();
    expect(parsed.errors.some((e) => e.includes("default must be a number"))).toBe(true);
  });

  test("an enum without a non-empty string values array is rejected", () => {
    const parsed = parse({ settings: { k: { type: "enum", default: "a", description: "d" } } });
    expect(parsed.manifest).toBeNull();
    expect(parsed.errors.some((e) => e.includes("values must be a non-empty array"))).toBe(true);
  });

  test("an enum default outside its declared values is rejected", () => {
    const parsed = parse({
      settings: { k: { type: "enum", values: ["a", "b"], default: "c", description: "d" } },
    });
    expect(parsed.manifest).toBeNull();
    expect(parsed.errors.some((e) => e.includes("default must be one of"))).toBe(true);
  });

  test("a missing or blank description is rejected", () => {
    expect(parse({ settings: { k: { type: "string", default: "" } } }).manifest).toBeNull();
    const blank = parse({ settings: { k: { type: "string", default: "", description: " " } } });
    expect(blank.manifest).toBeNull();
    expect(blank.errors.some((e) => e.includes("description must be a non-empty string"))).toBe(
      true,
    );
  });
});

describe("t2997 settings misspelling detection", () => {
  test.each(["setings", "setting", "Settings", "settngs"])(
    "a near-miss top-level key (%s) is loud, not silently ignored",
    (key) => {
      const parsed = parse({ [key]: { k: { type: "string", default: "", description: "d" } } });
      expect(parsed.manifest).toBeNull();
      expect(parsed.errors.some((e) => e.includes('did you mean "settings"?'))).toBe(true);
    },
  );

  test("a top-level key that is not a near miss stays tolerated", () => {
    const parsed = parse({ description: "a plugin", version: "1.0.0" });
    expect(parsed.errors).toEqual([]);
    expect(parsed.manifest).not.toBeNull();
  });

  test("advisories — owned by a separate parser — is a known key, not a near miss", () => {
    const parsed = parse({ advisories: [{ code: "spec-change" }] });
    expect(parsed.errors).toEqual([]);
    expect(parsed.manifest).not.toBeNull();
  });
});
