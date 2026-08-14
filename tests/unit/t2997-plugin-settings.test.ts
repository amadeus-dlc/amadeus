// t2997 — plugin.settings declaration parse (#2997 C2).
// covers: packages/framework/core/tools/amadeus-plugin-compose.ts
// covers: packages/framework/core/tools/amadeus-plugin-settings.ts
// size: small

import { describe, expect, test } from "bun:test";
import { parsePluginManifest } from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import {
  type PluginSettingsDeclaration,
  resolvePluginSettings,
} from "../../packages/framework/core/tools/amadeus-plugin-settings.ts";

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

const DECLARATION: PluginSettingsDeclaration = {
  "fetch-throttle-seconds": { type: "number", default: 600, description: "throttle" },
  label: { type: "string", default: "origin", description: "label" },
  enabled: { type: "boolean", default: true, description: "toggle" },
  mode: { type: "enum", values: ["fast", "thorough"], default: "fast", description: "mode" },
};

describe("t2997 settings resolution", () => {
  test("no overrides resolves to the declared defaults", () => {
    expect(resolvePluginSettings("git-drift", DECLARATION, {})).toEqual({
      ok: true,
      settings: {
        "fetch-throttle-seconds": 600,
        label: "origin",
        enabled: true,
        mode: "fast",
      },
    });
  });

  test("an override replaces only the key it names", () => {
    const resolved = resolvePluginSettings("git-drift", DECLARATION, {
      "fetch-throttle-seconds": 120,
      mode: "thorough",
    });
    expect(resolved).toEqual({
      ok: true,
      settings: {
        "fetch-throttle-seconds": 120,
        label: "origin",
        enabled: true,
        mode: "thorough",
      },
    });
  });

  test("an undeclared key aborts rather than being passed through", () => {
    expect(resolvePluginSettings("git-drift", DECLARATION, { unknown: 1 })).toEqual({
      ok: false,
      error: {
        code: "unknown-key",
        plugin: "git-drift",
        key: "unknown",
        detail: 'no such setting is declared by plugin "git-drift"',
      },
    });
  });

  test("a type mismatch aborts rather than falling back to the default", () => {
    const resolved = resolvePluginSettings("git-drift", DECLARATION, {
      "fetch-throttle-seconds": "600",
    });
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.error.code).toBe("type-mismatch");
    expect(resolved.error.detail).toContain("number");
  });

  test("an enum value outside the declared vocabulary aborts", () => {
    const resolved = resolvePluginSettings("git-drift", DECLARATION, { mode: "exhaustive" });
    expect(resolved.ok).toBe(false);
    if (resolved.ok) return;
    expect(resolved.error.code).toBe("enum-out-of-range");
    expect(resolved.error.detail).toContain("fast | thorough");
  });

  test("resolution is deterministic for the same inputs", () => {
    const overrides = { label: "upstream" };
    expect(resolvePluginSettings("git-drift", DECLARATION, overrides)).toEqual(
      resolvePluginSettings("git-drift", DECLARATION, overrides),
    );
  });
});

describe("t2997 declaration shape rejections", () => {
  test("a declaration that is not an object is rejected", () => {
    const parsed = parse({ settings: { k: "number" } });
    expect(parsed.manifest).toBeNull();
    expect(parsed.errors.some((e) => e.includes("must be an object declaration"))).toBe(true);
  });

  test.each([["an array", ["number"]], ["null", null], ["a number", 1]])(
    "a declaration that is %s is rejected",
    (_label, declaration) => {
      const parsed = parse({ settings: { k: declaration } });
      expect(parsed.manifest).toBeNull();
      expect(parsed.errors.some((e) => e.includes("must be an object declaration"))).toBe(true);
    },
  );

  test("values on a non-enum type is rejected rather than ignored", () => {
    const parsed = parse({
      settings: { k: { type: "string", default: "a", description: "d", values: ["a", "b"] } },
    });
    expect(parsed.manifest).toBeNull();
    expect(parsed.errors.some((e) => e.includes("only meaningful for type enum"))).toBe(true);
  });
});
