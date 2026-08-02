// t413 — self-* scope face parity (#2033). The five self-install faces
// (.claude/.codex/.cursor/.kimi-code/.opencode) must agree on every canonical
// self-* scope: identical EXECUTE/SKIP cells in tools/data/scope-grid.json
// over the stage keys ALL faces share, and byte-identical
// scopes/amadeus-self-*.md prose. The 2026-07-28 self-feature lightening
// landed on .claude alone, so kimi-born intents executed four SKIPped stages
// while every existing guard stayed green: promote:self:check treats self-*
// rows as extras with no dist counterpart, compile --check preserves folded
// cells verbatim and runs on .claude only, and the self-scope-consistency
// sensor compares name sets, never cell values. Stage keys NOT present on
// every face are exempt on purpose: plugin composition is per-face
// (self-feature.formal-model-check exists on .claude alone by design, see
// 242e4175a), so the parity contract covers only the shared cells.
// covers: file:scripts/promote-self.ts
// size: medium

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const FACES = [".claude", ".codex", ".cursor", ".kimi-code", ".opencode"] as const;
const SELF_SCOPES = ["self-document", "self-feature", "self-fix", "self-refactor"] as const;

type ScopeGrid = Record<string, { stages: Record<string, string> }>;

function gridOf(face: string): ScopeGrid {
  const path = join(repoRoot, face, "tools", "data", "scope-grid.json");
  return JSON.parse(readFileSync(path, "utf-8")) as ScopeGrid;
}

function proseOf(face: string, scope: string): string {
  return readFileSync(join(repoRoot, face, "scopes", `amadeus-${scope}.md`), "utf-8");
}

describe("t413 self-* scope face parity", () => {
  const grids = new Map(FACES.map((face) => [face, gridOf(face)] as const));

  test("every canonical self-* scope has a grid row on every face", () => {
    const missing: string[] = [];
    for (const scope of SELF_SCOPES) {
      for (const face of FACES) {
        if (grids.get(face)?.[scope]?.stages === undefined) missing.push(`${face}:${scope}`);
      }
    }
    expect(missing).toEqual([]);
  });

  test("shared stage cells agree across all faces for every self-* scope", () => {
    // Intersect stage keys over the faces that CARRY the scope row: a face
    // missing the row is caught by the presence test above, and must not
    // blank the intersection for the faces that do carry it.
    const divergent: string[] = [];
    for (const scope of SELF_SCOPES) {
      const present = FACES.filter((face) => grids.get(face)?.[scope]?.stages !== undefined);
      const stagesPerFace = present.map((face) => grids.get(face)?.[scope]?.stages ?? {});
      if (stagesPerFace.length < 2) continue;
      const shared = Object.keys(stagesPerFace[0]).filter((stage) =>
        stagesPerFace.every((stages) => Object.hasOwn(stages, stage)),
      );
      for (const stage of shared) {
        const values = present.map((face, i) => `${face}=${stagesPerFace[i][stage]}`);
        if (new Set(stagesPerFace.map((stages) => stages[stage])).size > 1) {
          divergent.push(`${scope}/${stage}: ${values.join(" ")}`);
        }
      }
    }
    expect(divergent).toEqual([]);
  });

  test("self-* scope prose is byte-identical across faces", () => {
    const divergent: string[] = [];
    for (const scope of SELF_SCOPES) {
      const canonical = proseOf(".claude", scope);
      for (const face of FACES.slice(1)) {
        if (proseOf(face, scope) !== canonical) divergent.push(`${face}:amadeus-${scope}.md`);
      }
    }
    expect(divergent).toEqual([]);
  });
});
