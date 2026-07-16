// t-opencode-emit: in-process coverage for the opencode harness skeleton
// (packages/framework/harness/opencode/{emit,manifest}.ts). Lives in
// integration/ (scope max = medium): emit() writes to a tmp dir, so the static
// size classifier reads it as medium — the honest scope for an fs-touching test.
//
// covers: file:packages/framework/harness/opencode/emit.ts,
//         file:packages/framework/harness/opencode/manifest.ts
//
// WHY in-process: `bun --coverage` does not instrument spawned subprocesses, so
// the packaging integration path (`bun scripts/package.ts opencode [--check]`,
// exercised by t145 + dist:check) runs emit.ts in a child and cannot cover it.
// The packager only ever calls emit() with check:false (checkHarness diffs the
// built tmp tree against committed, never calling emit's own check branch — see
// codex emit.ts:352-357, DA:0 in the shipped tree). Driving emit() DIRECTLY here
// with BOTH check:false (write) and check:true (verify) exercises the whole
// write⇔check symmetric shape in-process. Importing manifest.ts executes its
// frozen distribution row.

import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EmitContext } from "../../scripts/manifest-types.ts";
import emit from "../../packages/framework/harness/opencode/emit.ts";
import manifest from "../../packages/framework/harness/opencode/manifest.ts";

const COMMAND_BODY = "AUTHORED opencode command body — probe\n";
const COMMAND_REL = join(".opencode", "commands", "amadeus.md");

// A minimal EmitContext exercising only the fields opencode emit() reads
// (distRoot, readHarnessSource, check). The rest are stubbed to satisfy the type.
function ctxFor(distRoot: string, check: boolean): EmitContext {
  return {
    repoRoot: "/unused",
    coreRoot: "/unused",
    harnessRoot: "/unused",
    readHarnessSource: (relPath: string): string => {
      expect(relPath).toBe(join("commands", "amadeus.md"));
      return COMMAND_BODY;
    },
    distRoot,
    harnessDir: ".opencode",
    substituteToken: (s: string): string => s,
    check,
  };
}

describe("opencode emit() — write⇔check symmetry, in-process", () => {
  test("write mode writes the single command emission and returns its path", () => {
    const dist = mkdtempSync(join(tmpdir(), "oc-emit-write-"));
    try {
      const { written, problems } = emit(ctxFor(dist, false));
      expect(problems).toEqual([]);
      expect(written).toEqual([join(dist, COMMAND_REL)]);
      expect(readFileSync(join(dist, COMMAND_REL), "utf-8")).toBe(COMMAND_BODY);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });

  test("check mode is clean after a write (no MISSING/DIFFERS)", () => {
    const dist = mkdtempSync(join(tmpdir(), "oc-emit-clean-"));
    try {
      emit(ctxFor(dist, false));
      const { written, problems } = emit(ctxFor(dist, true));
      expect(problems).toEqual([]);
      expect(written).toEqual([join(dist, COMMAND_REL)]);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });

  test("check mode flags MISSING when the emission is absent (red path)", () => {
    const dist = mkdtempSync(join(tmpdir(), "oc-emit-missing-"));
    try {
      const { problems } = emit(ctxFor(dist, true));
      expect(problems).toEqual([`MISSING emission: ${COMMAND_REL}`]);
      expect(existsSync(join(dist, COMMAND_REL))).toBe(false);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });

  test("check mode flags DIFFERS when the emission content drifts (red path)", () => {
    const dist = mkdtempSync(join(tmpdir(), "oc-emit-differs-"));
    try {
      emit(ctxFor(dist, false));
      writeFileSync(join(dist, COMMAND_REL), "tampered\n");
      const { problems } = emit(ctxFor(dist, true));
      expect(problems).toEqual([`DIFFERS emission: ${COMMAND_REL}`]);
    } finally {
      rmSync(dist, { recursive: true, force: true });
    }
  });
});

describe("opencode manifest — the distribution row", () => {
  test("declares the skeleton shape (name/harnessDir/rename/skip/exempt)", () => {
    expect(manifest.name).toBe("opencode");
    expect(manifest.harnessDir).toBe(".opencode");
    expect(manifest.rulesRename).toBe("amadeus-rules");
    expect(manifest.skipRunnerGen).toBe(true);
    expect(manifest.authoredExempt).toEqual([]);
    expect(manifest.emit).toBe(emit);
  });

  test("projects the same core dirs as codex, with rules→amadeus-rules", () => {
    const dsts = manifest.coreDirs.map((d) => `${d.src}->${d.dst}`);
    expect(dsts).toEqual([
      "tools->tools",
      "amadeus-common->amadeus-common",
      "knowledge->knowledge",
      "rules->amadeus-rules",
      "sensors->sensors",
      "scopes->scopes",
      "agents->agents",
      "hooks->hooks",
    ]);
  });

  test("routes dot-gitignore to the project-root .gitignore", () => {
    expect(manifest.harnessFiles).toEqual([{ src: "dot-gitignore", dst: ".gitignore", projectRoot: true }]);
  });
});
