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
});
