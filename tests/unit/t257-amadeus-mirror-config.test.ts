// t257 — pure mirror configuration parsing and layer merging.
// size: small

import { describe, expect, test } from "bun:test";
import {
  DEFAULT_MIRROR_CONFIG,
  type ConfigLayer,
  type ConfigParseResult,
  mergeLayers,
  MIRROR_CONFIG_KNOWN_KEYS,
  mirrorConfigPaths,
  parse,
  readLayer,
  resolve,
} from "../../packages/framework/core/tools/amadeus-mirror-config.ts";

describe("t257 mirror config schema and paths", () => {
  test("keeps one canonical key and a normal off default", () => {
    expect(MIRROR_CONFIG_KNOWN_KEYS).toEqual(["auto-mirror"]);
    expect(DEFAULT_MIRROR_CONFIG).toEqual({ autoMirror: false });
  });

  test("maps global, space, and intent to the three git-shared files", () => {
    expect(mirrorConfigPaths("/repo", "team", "260719-example")).toEqual({
      global: "/repo/amadeus/config.json",
      space: "/repo/amadeus/spaces/team/config.json",
      intent: "/repo/amadeus/spaces/team/intents/260719-example/config.json",
    });
  });
});

describe("t257 mirror config parse", () => {
  test("accepts an empty object and explicit true or false", () => {
    expect(parse("{}", "global")).toEqual({
      kind: "parsed",
      source: "global",
      partial: {},
    });
    expect(parse('{"auto-mirror":true}', "space")).toEqual({
      kind: "parsed",
      source: "space",
      partial: { autoMirror: true },
    });
    expect(parse('{"auto-mirror":false}', "intent")).toEqual({
      kind: "parsed",
      source: "intent",
      partial: { autoMirror: false },
    });
  });

  test("rejects malformed JSON without throwing", () => {
    const result = parse("{broken", "global");
    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") expect(result.errors[0]).toContain("invalid JSON");
  });

  test.each([
    ["empty array", "[]", "array"],
    ["non-empty array", "[1]", "array"],
    ["null", "null", "null"],
    ["string", '"value"', "string"],
    ["number", "1", "number"],
    ["boolean", "true", "boolean"],
  ])("rejects a %s root", (_name, text, kind) => {
    const result = parse(text, "global");
    expect(result).toEqual({
      kind: "invalid",
      source: "global",
      errors: [`mirror config root must be an object, got ${kind}`],
    });
  });

  test.each([
    ["string", '"yes"', "string"],
    ["number", "1", "number"],
    ["null", "null", "null"],
  ])("rejects a %s auto-mirror value", (_name, value, kind) => {
    const result = parse(`{"auto-mirror":${value}}`, "space");
    expect(result).toEqual({
      kind: "invalid",
      source: "space",
      errors: [`type mismatch: auto-mirror expects boolean, got ${kind}`],
    });
  });

  test("collects every unknown key and the type mismatch", () => {
    const result = parse(
      '{"unknown-a":1,"auto-mirror":"yes","unknown-b":2}',
      "intent",
    );
    expect(result).toEqual({
      kind: "invalid",
      source: "intent",
      errors: [
        "unknown key: unknown-a (valid keys: auto-mirror)",
        "unknown key: unknown-b (valid keys: auto-mirror)",
        "type mismatch: auto-mirror expects boolean, got string",
      ],
    });
  });
});

function layer(
  source: ConfigLayer,
  present: boolean,
  value: boolean,
): ConfigParseResult {
  return present
    ? { kind: "parsed", source, partial: { autoMirror: value } }
    : { kind: "absent", source };
}

describe("t257 mirror config merge", () => {
  const combinations = [
    [false, false, false],
    [true, false, false],
    [false, true, false],
    [false, false, true],
    [true, true, false],
    [true, false, true],
    [false, true, true],
    [true, true, true],
  ] as const;

  test.each(combinations)(
    "resolves presence combination global=%s space=%s intent=%s",
    (hasGlobal, hasSpace, hasIntent) => {
      // The highest-priority present layer is true; every competing layer is
      // false, preventing the default or a lower layer from masking bad order.
      const highest = hasIntent ? "intent" : hasSpace ? "space" : hasGlobal ? "global" : null;
      const result = mergeLayers([
        layer("global", hasGlobal, highest === "global"),
        layer("space", hasSpace, highest === "space"),
        layer("intent", hasIntent, highest === "intent"),
      ]);
      expect(result).toEqual({
        kind: "resolved",
        config: { autoMirror: highest !== null },
      });
    },
  );

  test("collects every invalid layer and never returns a partial config", () => {
    expect(
      mergeLayers([
        { kind: "invalid", source: "global", errors: ["g1", "g2"] },
        { kind: "parsed", source: "space", partial: { autoMirror: true } },
        { kind: "invalid", source: "intent", errors: ["i1"] },
      ]),
    ).toEqual({
      kind: "invalid",
      errors: [
        { layer: "global", errors: ["g1", "g2"] },
        { layer: "intent", errors: ["i1"] },
      ],
    });
  });
});

describe("t257 mirror config reader seam", () => {
  test("classifies ENOENT as absent and other I/O errors as invalid", () => {
    const enoent = Object.assign(new Error("missing"), { code: "ENOENT" });
    expect(readLayer("/missing", "global", () => { throw enoent; })).toEqual({
      kind: "absent",
      source: "global",
    });
    const eacces = Object.assign(new Error("denied"), { code: "EACCES" });
    const denied = readLayer("/denied", "space", () => { throw eacces; });
    expect(denied.kind).toBe("invalid");
    if (denied.kind === "invalid") {
      expect(denied.errors[0]).toContain("failed to read space mirror config");
      expect(denied.errors[0]).toContain("/denied");
    }
  });

  test("resolve reads each layer exactly once on every call and does not cache", () => {
    const calls: string[] = [];
    const reader = (path: string): string => {
      calls.push(path);
      return "{}";
    };
    expect(resolve("/repo", "team", "intent-a", reader)).toEqual({
      kind: "resolved",
      config: { autoMirror: false },
    });
    expect(resolve("/repo", "team", "intent-a", reader).kind).toBe("resolved");
    expect(calls).toEqual([
      "/repo/amadeus/config.json",
      "/repo/amadeus/spaces/team/config.json",
      "/repo/amadeus/spaces/team/intents/intent-a/config.json",
      "/repo/amadeus/config.json",
      "/repo/amadeus/spaces/team/config.json",
      "/repo/amadeus/spaces/team/intents/intent-a/config.json",
    ]);
  });
});
