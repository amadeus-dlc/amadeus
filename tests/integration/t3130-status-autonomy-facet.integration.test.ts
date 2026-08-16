// t3130 — RFC-0001 C8 / FR-8: statusAutonomyFacet is a pure composition of
// existing effective-value functions (business-rules.md R-6) and never
// fabricates a value when its inputs are unavailable (R-7).
// covers: packages/framework/core/tools/amadeus-autonomy-status-facet.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  applyProductionAutonomyMode,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import { resolveSessionInteractivity } from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import { mintHumanPresence } from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";
import { statusAutonomyFacet } from "../../packages/framework/core/tools/amadeus-autonomy-status-facet.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

const CONSTRUCTION = join(FIXTURES_DIR, "state-construction.md");

let project: string | undefined;
afterEach(() => {
  cleanupTestProject(project);
  project = undefined;
});

function writeConsentConfig(
  projectDir: string,
  mirrorConsent: string,
  findingConsent: string,
): void {
  const dir = join(projectDir, "amadeus");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "config.json"),
    JSON.stringify({
      "intent-mirror": { github: { issue: { consent: mirrorConsent } } },
      finding: { github: { issue: { creation: { consent: findingConsent } } } },
    }),
    "utf-8",
  );
}

// The `semi` declaration flow appends a HUMAN_TURN row as provenance (R-24),
// which is exactly the observable state statusAutonomyFacet's `interactive`
// field is reading — no separate interactive-session fixture is needed.
function semiProjectWithConsent(mirrorConsent: string, findingConsent: string): string {
  const p = createTestProject();
  seedStateFile(p, CONSTRUCTION);
  resetOtelPerProject();
  mintHumanPresence({
    projectDir: p,
    capability: { kind: "unavailable", reason: "in-process test driver" },
  });
  const applied = applyProductionAutonomyMode({
    projectDir: p,
    stateContent: readFileSync(seededStateFile(p), "utf-8"),
    mode: "semi",
  });
  if (!applied.ok) throw new Error(`semi declaration failed: ${applied.error}`);
  writeConsentConfig(p, mirrorConsent, findingConsent);
  return p;
}

describe("t3130 statusAutonomyFacet", () => {
  test("composes mode, projection, interactivity, and consent from the underlying effective functions", () => {
    project = semiProjectWithConsent("auto", "off");
    const facet = statusAutonomyFacet(project);
    expect(facet).not.toBeNull();
    if (facet === null) return;
    expect(facet.mode).toBe("semi");
    expect(facet.projection).toBe("autonomous");
    expect(facet.mirrorConsent).toBe("auto");
    expect(facet.findingConsent).toBe("off");
  });

  // R-6 falling proof: statusAutonomyFacet holds no interactivity judgment of
  // its own — on the SAME fixture, its `interactive` field must always agree
  // with resolveSessionInteractivity's own answer.
  test("interactive always agrees with resolveSessionInteractivity on the same fixture", () => {
    project = semiProjectWithConsent("prompt", "prompt");
    const facet = statusAutonomyFacet(project);
    expect(facet).not.toBeNull();
    if (facet === null) return;
    expect(facet.interactive).toBe(resolveSessionInteractivity(project).interactive);
  });

  // R-7: no active Intent projection -> unavailable (null), never a guessed
  // default. Mirrors the existing `autonomy === null` convention `--status`
  // already uses for an unresolvable audit projection.
  test("returns null (unavailable) when there is no active Intent projection", () => {
    project = createTestProject();
    writeConsentConfig(project, "auto", "auto");
    expect(statusAutonomyFacet(project)).toBeNull();
  });

  // R-7: a valid active Intent but an INVALID config (unresolvable consent
  // value) also falls closed to null rather than reporting a real mode next
  // to a fabricated consent value.
  test("returns null (unavailable) when config is invalid, even with a valid active Intent", () => {
    project = semiProjectWithConsent("auto", "off");
    writeConsentConfig(project, "sometimes-invalid", "off");
    expect(statusAutonomyFacet(project)).toBeNull();
  });
});
