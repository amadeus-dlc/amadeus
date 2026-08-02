// covers: file:plugins/formal-model-check/tools/tla-module-deps.ts
// size: medium
//
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  compareModuleDeclarations,
  extractModuleRefs,
  type ModuleDepsError,
  resolveAuxiliaryModules,
} from "../../plugins/formal-model-check/tools/tla-module-deps.ts";

type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

const ok =
  <T>(value: T) =>
  (): Result<T, ModuleDepsError> => ({ ok: true, value });

const unresolved =
  (name: string) =>
  (): Result<string, ModuleDepsError> => ({
    ok: false,
    error: {
      kind: "MODULE_DEPS",
      code: "MODULE_DEP_UNRESOLVED",
      relativePath: `specs/tla/${name}.tla`,
      detail: `module ${name} is not readable inside specs/tla`,
    },
  });

// An in-memory specs/tla: names present in the map resolve, anything else is
// UNRESOLVED (mirrors the loader/sensor boundary).
const readerFor =
  (modules: Readonly<Record<string, string>>) =>
  (name: string): Result<string, ModuleDepsError> =>
    name in modules ? ok(modules[name])() : unresolved(name)();

const realReader = (name: string): Result<string, ModuleDepsError> => {
  try {
    return ok(readFileSync(`${import.meta.dir}/../../specs/tla/${name}.tla`, "utf-8"))();
  } catch {
    return unresolved(name)();
  }
};

describe("t402 tla-module-deps extraction", () => {
  test("extracts EXTENDS names and both INSTANCE declaration forms", () => {
    const source = [
      "---- MODULE M ----",
      "EXTENDS Naturals, Helper",
      "Other_1 == INSTANCE OtherModule",
      "          WITH Flag <- FALSE",
      "Direct == INSTANCE Deep",
    ].join("\n");
    expect(extractModuleRefs("M", source)).toEqual({
      ok: true,
      value: ["Helper", "OtherModule", "Deep"],
    });
  });

  test("extracts EXTENDS names continued onto the next line", () => {
    const source = ["EXTENDS Naturals,", "  Helper,", "  OtherModule"].join("\n");
    expect(extractModuleRefs("M", source)).toEqual({
      ok: true,
      value: ["Helper", "OtherModule"],
    });
  });

  test("never adopts EXTENDS/INSTANCE-shaped text inside comments or mid-line", () => {
    const source = [
      "(***************************************************************************)",
      "(* EXTENDS FakeBlock                                                       *)",
      "(* spanning comment with INSTANCE FakeBlock2                               *)",
      "(***************************************************************************)",
      "\\* EXTENDS FakeLine",
      "\\* Direct == INSTANCE FakeLine2",
      "VARIABLES state \\* EXTENDS FakeTrailing",
      "Init == state = \"INSTANCE FakeString\"",
      "EXTENDS Helper",
    ].join("\n");
    expect(extractModuleRefs("M", source)).toEqual({ ok: true, value: ["Helper"] });
  });

  test("excludes TLA standard modules without failing", () => {
    const source = "EXTENDS Naturals, Sequences, FiniteSets, TLC, Integers, Reals, Bags";
    expect(extractModuleRefs("M", source)).toEqual({ ok: true, value: [] });
  });

  test("treats an unterminated block comment as running to the module end", () => {
    const source = ["EXTENDS Helper", "(* never closed", "EXTENDS Fake"].join("\n");
    expect(extractModuleRefs("M", source)).toEqual({ ok: true, value: ["Helper"] });
  });

  test("does not open a block comment from inside a line comment", () => {
    const source = ["\\* inert (* opener", "EXTENDS Helper"].join("\n");
    expect(extractModuleRefs("M", source)).toEqual({ ok: true, value: ["Helper"] });
  });

  test("fails on a malformed EXTENDS token instead of skipping it silently", () => {
    const result = extractModuleRefs("M", "EXTENDS Naturals, not-a-module");
    expect(result).toMatchObject({
      ok: false,
      error: { code: "MODULE_DEP_UNRESOLVED" },
    });
  });
});

describe("t402 tla-module-deps transitive resolution", () => {
  test("resolves the real MirrorLifecycle module to MirrorLifecycleCore", () => {
    expect(resolveAuxiliaryModules("MirrorLifecycle", realReader)).toEqual({
      ok: true,
      value: ["MirrorLifecycleCore"],
    });
  });

  test("computes the transitive closure, sorted, deduplicated, without the start module", () => {
    const modules = {
      A: "EXTENDS B, C",
      B: "EXTENDS Naturals\nX == INSTANCE C",
      C: "EXTENDS FiniteSets",
    };
    const reads = new Map<string, number>();
    const reader = readerFor(modules);
    expect(resolveAuxiliaryModules("A", (name) => {
      reads.set(name, (reads.get(name) ?? 0) + 1);
      return reader(name);
    })).toEqual({
      ok: true,
      value: ["B", "C"],
    });
    expect(Object.fromEntries(reads)).toEqual({ A: 1, B: 1, C: 1 });
  });

  test("is deterministic for identical input", () => {
    const modules = { A: "EXTENDS B\nY == INSTANCE C", B: "EXTENDS C", C: "EXTENDS TLC" };
    const first = resolveAuxiliaryModules("A", readerFor(modules));
    const second = resolveAuxiliaryModules("A", readerFor(modules));
    expect(first).toEqual(second);
    expect(first).toEqual({ ok: true, value: ["B", "C"] });
  });

  test("fails closed with MODULE_DEP_UNRESOLVED for a missing non-standard module", () => {
    const result = resolveAuxiliaryModules("A", readerFor({ A: "EXTENDS Missing" }));
    expect(result).toMatchObject({
      ok: false,
      error: { kind: "MODULE_DEPS", code: "MODULE_DEP_UNRESOLVED" },
    });
  });

  test("propagates the injected readModule failure", () => {
    const boom: ModuleDepsError = {
      kind: "MODULE_DEPS",
      code: "MODULE_DEP_UNRESOLVED",
      relativePath: "specs/tla/A.tla",
      detail: "injected failure",
    };
    const result = resolveAuxiliaryModules("A", () => ({ ok: false, error: boom }));
    expect(result).toEqual({ ok: false, error: boom });
  });

  test("detects a mutual cycle and a self reference as MODULE_DEP_CYCLE", () => {
    const mutual = resolveAuxiliaryModules(
      "A",
      readerFor({ A: "EXTENDS B", B: "EXTENDS A" }),
    );
    expect(mutual).toMatchObject({ ok: false, error: { code: "MODULE_DEP_CYCLE" } });
    const self = resolveAuxiliaryModules("A", readerFor({ A: "EXTENDS A" }));
    expect(self).toMatchObject({ ok: false, error: { code: "MODULE_DEP_CYCLE" } });
  });

  test("rejects grammar-breaking module names as MODULE_DEP_OUT_OF_BOUNDS", () => {
    for (const name of ["../escape", "a/b", "1Bad", ""]) {
      expect(resolveAuxiliaryModules(name, readerFor({}))).toMatchObject({
        ok: false,
        error: { code: "MODULE_DEP_OUT_OF_BOUNDS" },
      });
      expect(extractModuleRefs(name, "EXTENDS B")).toMatchObject({
        ok: false,
        error: { code: "MODULE_DEP_OUT_OF_BOUNDS" },
      });
    }
  });
});

describe("t402 tla-module-deps declaration comparison", () => {
  test("reports declaration gaps and over-declarations in both directions", () => {
    const drift = compareModuleDeclarations("MirrorLifecycle", ["DeclaredOnly"], [
      "ResolvedOnly",
    ]);
    expect(drift).toEqual({
      modelName: "MirrorLifecycle",
      declared: ["DeclaredOnly"],
      resolved: ["ResolvedOnly"],
      missing: ["ResolvedOnly"],
      extra: ["DeclaredOnly"],
    });
  });

  test("reports agreement only when both directions are empty", () => {
    const agree = compareModuleDeclarations("MirrorLifecycle", ["MirrorLifecycleCore"], [
      "MirrorLifecycleCore",
    ]);
    expect(agree.missing).toEqual([]);
    expect(agree.extra).toEqual([]);
    const gapOnly = compareModuleDeclarations("MirrorLifecycle", [], ["MirrorLifecycleCore"]);
    expect(gapOnly.missing).toEqual(["MirrorLifecycleCore"]);
    expect(gapOnly.extra).toEqual([]);
    const extraOnly = compareModuleDeclarations("MirrorLifecycle", ["MirrorLifecycleCore"], []);
    expect(extraOnly.missing).toEqual([]);
    expect(extraOnly.extra).toEqual(["MirrorLifecycleCore"]);
  });
});
