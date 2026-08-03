// covers: function:buildSelfInstallProjection
// covers: contract:self-install-plugin-projection-matrix
// size: medium

import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildSelfInstallProjection,
  SELF_INSTALL_HARNESSES,
} from "../../scripts/plugin-projection.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const scratch: string[] = [];

afterAll(() => {
  for (const root of scratch) rmSync(root, { recursive: true, force: true });
});

function digestible(projection: ReturnType<typeof buildSelfInstallProjection>): string {
  return JSON.stringify(
    [...(projection.artifacts ?? [])].map(([path, bytes]) => [path, bytes.toString("base64")]),
  );
}

describe("t416 deterministic self-install plugin projections", () => {
  test("all five faces produce deterministic managed surfaces from the selected plugin", () => {
    for (const harness of SELF_INSTALL_HARNESSES) {
      const first = buildSelfInstallProjection(harness, REPO_ROOT);
      const second = buildSelfInstallProjection(harness, REPO_ROOT);
      expect(first.expectedPaths.size, harness).toBeGreaterThan(0);
      expect(digestible(second), harness).toBe(digestible(first));
      expect([...first.expectedPaths].some((path) => path.endsWith("tools/data/stage-graph.json")), harness).toBe(true);
      expect([...first.expectedPaths].some((path) => path.includes("plugins/formal-model-check/")), harness).toBe(true);
      expect([...first.expectedPaths].some((path) => path.includes(".amadeus-plugin-src/formal-model-check/")), harness).toBe(true);
      expect([...first.expectedPaths].some((path) => path.endsWith(".amadeus-plugin-composition.json")), harness).toBe(true);
      expect([...first.expectedPaths].some((path) => path.endsWith(".amadeus-plugin-audit.json")), harness).toBe(false);
      expect([...first.expectedPaths].some((path) => path.endsWith(".amadeus-plugin-drops.json")), harness).toBe(false);
    }
  }, 120_000);

  test("Codex emits only the project-root .agents runner", () => {
    const projection = buildSelfInstallProjection("codex", REPO_ROOT);
    expect(projection.expectedPaths.has(".agents/skills/amadeus-formal-model-check/SKILL.md")).toBe(true);
    expect([...projection.expectedPaths].some((path) => path.startsWith(".codex/skills/"))).toBe(false);
  }, 120_000);

  test("Cursor and OpenCode use their existing command entry instead of plugin runner skills", () => {
    for (const harness of ["cursor", "opencode"] as const) {
      const projection = buildSelfInstallProjection(harness, REPO_ROOT);
      expect([...projection.expectedPaths].some((path) => path.includes("amadeus-formal-model-check/SKILL.md"))).toBe(false);
      expect([...projection.expectedPaths].some((path) => path.endsWith("tools/data/stage-graph.json"))).toBe(true);
    }
  }, 120_000);

  test("missing or empty selection has zero self-projection impact", () => {
    const missing = mkdtempSync(join(tmpdir(), "amadeus-t416-missing-"));
    const empty = mkdtempSync(join(tmpdir(), "amadeus-t416-empty-"));
    scratch.push(missing, empty);
    mkdirSync(join(empty, "amadeus"), { recursive: true });
    writeFileSync(join(empty, "amadeus", "config.json"), '{"plugins":[]}\n');
    expect(buildSelfInstallProjection("claude", missing).expectedPaths.size).toBe(0);
    expect(buildSelfInstallProjection("codex", empty).expectedPaths.size).toBe(0);
  });

  test("compile fixture environment cannot change committed projection bytes", () => {
    const previous = process.env.AMADEUS_RULES_DIR;
    try {
      delete process.env.AMADEUS_RULES_DIR;
      const canonical = digestible(buildSelfInstallProjection("codex", REPO_ROOT));
      process.env.AMADEUS_RULES_DIR = join(tmpdir(), "amadeus-t416-missing-rules");
      expect(digestible(buildSelfInstallProjection("codex", REPO_ROOT))).toBe(canonical);
    } finally {
      if (previous === undefined) delete process.env.AMADEUS_RULES_DIR;
      else process.env.AMADEUS_RULES_DIR = previous;
    }
  }, 120_000);
});
