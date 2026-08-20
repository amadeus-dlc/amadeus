// covers: file:plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts
// size: medium
//
// 260807-tla-specs-relocation — the single spec-root resolver (E-1). Pins:
//   (a) BR-4/BR-13a fail-closed: a legacy `<root>/specs/tla/` holding specs
//       stops resolution with LegacySpecError carrying the migration
//       instructions — legacy-only AND both-present alike (no dual-read,
//       BR-5) — and the loader path surfaces the same stop.
//   (d) BR-2 space resolution: no cursor / unsafe cursor -> "default"; a
//       valid non-default cursor selects that space; an empty legacy
//       directory residue is NOT a legacy layout.
// fs fixtures place this in the integration tier (fs-tests-integration-first).

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  LegacySpecError,
  resolveSpecRoots,
} from "../../plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts";
import {
  LegacySpecError as PluginLegacySpecError,
  resolveSpecRoots as pluginResolveSpecRoots,
} from "../../plugins/formal-model-check/tools/tla-model-map.ts";
import { loadVerifiedTlaSourcesInternal } from "../../plugins/formal-model-check/tools/tla-model-loader-internal.ts";
import {
  activationAdvisoriesForHost,
  activationAdvisoryForHost,
} from "../../plugins/formal-model-check/tools/plugin-activation.ts";
import { defaultModelMapPath } from "../../plugins/formal-model-check/tools/tla-applicability.ts";
import { defaultStoreRoot } from "../../plugins/formal-model-check/tools/tla-evidence.ts";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), "t481-spec-root-"));
  roots.push(root);
  return root;
}

function writeCursor(root: string, value: string): void {
  mkdirSync(join(root, "amadeus"), { recursive: true });
  writeFileSync(join(root, "amadeus", "active-space"), value);
}

function plantLegacySpec(root: string, file = "FormalElection.tla"): void {
  mkdirSync(join(root, "specs", "tla"), { recursive: true });
  writeFileSync(join(root, "specs", "tla", file), "---- MODULE FormalElection ----\n====\n");
}

function plantCanonicalSpec(root: string, space = "default"): void {
  const dir = join(root, "amadeus", "spaces", space, "specs", "tla");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "FormalElection.tla"), "---- MODULE FormalElection ----\n====\n");
}

describe("t481 spec root resolver — space resolution (BR-2)", () => {
  test("no active-space cursor resolves the default space paths", () => {
    const root = workspace();
    expect(resolveSpecRoots(root)).toEqual({
      space: "default",
      specsRoot: join(root, "amadeus", "spaces", "default", "specs"),
      tlaDir: join(root, "amadeus", "spaces", "default", "specs", "tla"),
      modelMapPath: join(root, "amadeus", "spaces", "default", "specs", "tla", "model-map.json"),
      evidenceRoot: join(root, "amadeus", "spaces", "default", "specs", "tla-evidence"),
    });
  });

  test("an unsafe cursor value falls back to the default space", () => {
    for (const unsafe of ["../escape", "bad name", ".hidden", ""]) {
      const root = workspace();
      writeCursor(root, unsafe);
      expect(resolveSpecRoots(root).space).toBe("default");
    }
  });

  test("a valid non-default cursor selects that space's paths", () => {
    const root = workspace();
    writeCursor(root, "feature-x\n");
    const resolved = resolveSpecRoots(root);
    expect(resolved.space).toBe("feature-x");
    expect(resolved.tlaDir).toBe(join(root, "amadeus", "spaces", "feature-x", "specs", "tla"));
    expect(resolved.evidenceRoot).toBe(join(root, "amadeus", "spaces", "feature-x", "specs", "tla-evidence"));
  });

  test("an empty legacy directory residue is not a legacy layout", () => {
    const root = workspace();
    mkdirSync(join(root, "specs", "tla"), { recursive: true });
    expect(resolveSpecRoots(root).space).toBe("default");
    // A specs/ tree without the tla subdirectory is equally inert.
    const bare = workspace();
    mkdirSync(join(bare, "specs"), { recursive: true });
    expect(resolveSpecRoots(bare).tlaDir).toBe(
      join(bare, "amadeus", "spaces", "default", "specs", "tla"),
    );
  });
});

describe("t481 spec root resolver — legacy layout fails closed (BR-4/BR-13a)", () => {
  test("a legacy-only layout throws LegacySpecError with the migration instructions", () => {
    const root = workspace();
    plantLegacySpec(root);
    let caught: unknown;
    try {
      resolveSpecRoots(root);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(LegacySpecError);
    // The resolved space rides on the error so fail-soft consumers (advisory
    // label, sensor fallback, loader label) name the active space's paths.
    expect((caught as LegacySpecError).space).toBe("default");
    const message = (caught as Error).message;
    expect(message).toContain("legacy TLA spec layout detected at specs/tla/");
    expect(message).toContain("git mv specs/tla amadeus/spaces/default/specs/tla");
    expect(message).toContain("fail-closed");
  });

  test("a legacy model-map.json alone also trips the detection", () => {
    const root = workspace();
    plantLegacySpec(root, "model-map.json");
    expect(() => resolveSpecRoots(root)).toThrow(LegacySpecError);
  });

  test("specs in both layouts stop resolution too (no dual-read, BR-5)", () => {
    const root = workspace();
    plantLegacySpec(root);
    plantCanonicalSpec(root);
    expect(() => resolveSpecRoots(root)).toThrow(LegacySpecError);
  });

  test("the byte-mirrored plugin copy stops on the same layout (BR-11)", () => {
    const root = workspace();
    plantLegacySpec(root);
    expect(() => pluginResolveSpecRoots(root)).toThrow(PluginLegacySpecError);
  });

  test("the loader path surfaces the legacy stop as a fail-closed load error", () => {
    const root = workspace();
    // A repository-shaped workspace (.git + package.json) whose only specs are
    // the pre-relocation layout: the loader must refuse, not read them.
    writeFileSync(join(root, ".git"), "gitdir: fixture\n");
    writeFileSync(join(root, "package.json"), "{}\n");
    plantLegacySpec(root);
    const loaded = loadVerifiedTlaSourcesInternal(pathToFileURL(join(root, "probe.ts")).href);
    expect(loaded).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_MAP_INVALID" },
    });
    if (loaded.ok) return;
    expect(loaded.error.detail).toContain("legacy TLA spec layout detected at specs/tla/");
    expect(loaded.error.detail).toContain("git mv specs/tla amadeus/spaces/default/specs/tla");
  });

  test("the loader's legacy error label names the active space's map path", () => {
    const root = workspace();
    writeFileSync(join(root, ".git"), "gitdir: fixture\n");
    writeFileSync(join(root, "package.json"), "{}\n");
    writeCursor(root, "feature-x");
    plantLegacySpec(root);
    const loaded = loadVerifiedTlaSourcesInternal(pathToFileURL(join(root, "probe.ts")).href);
    expect(loaded).toMatchObject({
      ok: false,
      error: {
        kind: "MODEL_LOAD",
        code: "MODEL_MAP_INVALID",
        relativePath: "amadeus/spaces/feature-x/specs/tla/model-map.json",
      },
    });
    if (loaded.ok) return;
    expect(loaded.error.detail).toContain("git mv specs/tla amadeus/spaces/feature-x/specs/tla");
  });
});

describe("t481 activation + wrapper consumers on a legacy layout (BR-4/BR-13a)", () => {
  test("activation advisory surfaces the legacy stop instead of reading old specs", () => {
    const root = workspace();
    const host = join(root, ".claude");
    mkdirSync(host, { recursive: true });
    // A minimal composition record naming formal-model-check (t320 fixture shape).
    writeFileSync(
      join(host, ".amadeus-plugin-composition.json"),
      JSON.stringify({ ledger: [], plugins: [["formal-model-check", { stageIndex: [{ slug: "formal-model-check" }] }]] }),
    );
    plantLegacySpec(root);
    const advisory = activationAdvisoryForHost(host);
    expect(advisory).toContain("legacy TLA spec layout detected at specs/tla/");
    expect(advisory).toContain("git mv specs/tla amadeus/spaces/default/specs/tla");
  });

  test("a non-default cursor names that space's spec dir in the legacy advisory", () => {
    const root = workspace();
    const host = join(root, ".claude");
    mkdirSync(host, { recursive: true });
    writeFileSync(
      join(host, ".amadeus-plugin-composition.json"),
      JSON.stringify({ ledger: [], plugins: [["formal-model-check", { stageIndex: [{ slug: "formal-model-check" }] }]] }),
    );
    writeCursor(root, "feature-x");
    plantLegacySpec(root);
    const advisories = activationAdvisoriesForHost(host, "construction");
    expect(advisories).toHaveLength(1);
    expect(advisories[0]).toMatchObject({
      code: "not-ready",
      target: "amadeus/spaces/feature-x/specs/tla",
    });
    expect(advisories[0]?.message).toContain(
      "add a valid amadeus/spaces/feature-x/specs/tla/model-map.json",
    );
    expect(advisories[0]?.message).toContain("git mv specs/tla amadeus/spaces/feature-x/specs/tla");
  });

  test("default* wrappers resolve through the shared resolver (BR-1)", () => {
    const root = workspace();
    writeCursor(root, "feature-x");
    expect(defaultModelMapPath(root)).toBe(
      join(root, "amadeus", "spaces", "feature-x", "specs", "tla", "model-map.json"),
    );
    expect(defaultStoreRoot(root)).toBe(
      join(root, "amadeus", "spaces", "feature-x", "specs", "tla-evidence"),
    );
  });
});
