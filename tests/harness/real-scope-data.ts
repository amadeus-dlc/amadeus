// Point the in-process scope resolver at the REAL shipped data files.
//
// Composed scopes (amadeus-feature, amadeus-bugfix, …) exist only in the
// compiled scope-grid plus their per-scope .md metadata — never in stage
// frontmatter — so any test whose subject resolves a composed scope must read
// a face that carries both. The .codex face is that face (the canonical
// packages/framework/core tree ships no compiled data, and dist/claude carries
// the stock scopes only), and it is already the face solo-gate-fixture pins for
// the stage graph. Single definition so the suites that need it cannot drift
// onto different data.

import { join } from "node:path";
import {
  _resetScopeMappingForTests,
  _resetStageGraphForTests,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");

export const REAL_DATA_DIR = join(REPO_ROOT, ".codex", "tools", "data");
export const REAL_STAGE_GRAPH_PATH = join(REAL_DATA_DIR, "stage-graph.json");
export const REAL_SCOPE_GRID_PATH = join(REAL_DATA_DIR, "scope-grid.json");
export const REAL_SCOPES_DIR = join(REPO_ROOT, ".codex", "scopes");

const VARS = [
  "AMADEUS_STAGE_GRAPH",
  "AMADEUS_SCOPE_GRID",
  "AMADEUS_SCOPES_DIR",
  "AMADEUS_SCOPE_MAPPING",
] as const;

// Call from beforeAll; the returned function restores the previous environment
// (call it from afterAll) so a suite cannot leak the seam into its neighbours.
export function useRealScopeData(): () => void {
  const saved = new Map<string, string | undefined>();
  for (const name of VARS) saved.set(name, process.env[name]);
  process.env.AMADEUS_STAGE_GRAPH = REAL_STAGE_GRAPH_PATH;
  process.env.AMADEUS_SCOPE_GRID = REAL_SCOPE_GRID_PATH;
  process.env.AMADEUS_SCOPES_DIR = REAL_SCOPES_DIR;
  delete process.env.AMADEUS_SCOPE_MAPPING;
  _resetScopeMappingForTests();
  _resetStageGraphForTests();
  return () => {
    for (const [name, value] of saved) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    _resetScopeMappingForTests();
    _resetStageGraphForTests();
  };
}
