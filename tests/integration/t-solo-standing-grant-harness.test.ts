// covers: contract:solo-standing-grant-harness-projection
//
// U3 (harness-contract-and-regression) of the solo standing grant intent
// (#1466). Mechanism: readFileSync/existsSync over the committed dist trees —
// zero spawn, zero LLM, zero tokens.
//
// WHAT IS UNDER TEST (FR-24/FR-25, HR-01–04c of this Unit):
//   1. Every one of the SIX harness distributions (claude, codex, cursor, kiro,
//      kiro-ide, opencode) carries the solo standing-grant authorization core.
//      "Same semantics" is asserted the strongest way the projection allows:
//      the harness-neutral tool modules are BYTE-IDENTICAL to their canonical
//      source, so no harness can hold a different directive / state / audit
//      contract. Harness-specific RENDERING (the protocol's {{HARNESS_DIR}}
//      substitution, each host's own question mechanism) is deliberately NOT
//      byte-compared — only the semantic markers are.
//   2. The canonical conductor procedure (stage-protocol.md) describes the same
//      route -> grant-backed report -> typed await-approval -> prompt-only human
//      reentry sequence in every dist (FR-25), including the no-re-run rule for
//      body/reviewer/sensors/learnings and the human-only reject path.
//   3. Presence minting goes through the ONE canonical seam (mintHumanPresence)
//      on every harness that has a prompt hook at all. No harness adapter
//      appends a HUMAN_TURN of its own (HR-04c, HR-08a) — an adapter-local mint
//      would silently bypass the presence reservation and strand a solo
//      fallback.
//   4. Kiro IDE is fail-closed by construction: its promptSubmit hook carries no
//      stable session identity, so it declares the capability `unavailable` and
//      never substitutes a shared key, the PID, or the active-intent cursor
//      (HR-04e). OpenCode ships no prompt hook at all, so it has no mint site to
//      degrade.

import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../harness/fixtures.ts";

const CORE_TOOLS = join(REPO_ROOT, "packages", "framework", "core", "tools");

// harness name -> its engine dir inside dist/ (kiro-ide ships under .kiro).
const HARNESS_DIRS: Array<[string, string]> = [
  ["claude", join(REPO_ROOT, "dist", "claude", ".claude")],
  ["codex", join(REPO_ROOT, "dist", "codex", ".codex")],
  ["cursor", join(REPO_ROOT, "dist", "cursor", ".cursor")],
  ["kiro", join(REPO_ROOT, "dist", "kiro", ".kiro")],
  ["kiro-ide", join(REPO_ROOT, "dist", "kiro-ide", ".kiro")],
  ["opencode", join(REPO_ROOT, "dist", "opencode", ".opencode")],
];

// The harness-neutral modules that carry the authorization contract. All six
// projections must hold these byte-for-byte.
const CONTRACT_TOOLS = [
  "amadeus-directive.ts",
  "amadeus-orchestrate.ts",
  "amadeus-state.ts",
  "amadeus-grant-authorization.ts",
  "amadeus-presence-reservation.ts",
];

// Semantic markers of the external contract, per module. Asserted on the DIST
// copy so a projection that silently dropped one is caught even if some future
// transform stops the byte-identity above.
const CONTRACT_MARKERS: Array<[string, readonly string[]]> = [
  ["amadeus-directive.ts", ["standing_grant_id", "standing_grant_route_id", "target_intent_id", "presence_reservation_id"]],
  ["amadeus-orchestrate.ts", ["GATE_AUTHORIZATION_SELECTED", "--standing-grant-id", "--standing-grant-route-id", "--target-intent-id", "--presence-reservation-id"]],
  ["amadeus-state.ts", ["classifyApprovalAuthority", "GRANT_ISSUED", "GRANT_REVOKED"]],
  ["amadeus-presence-reservation.ts", ["HostSessionCapability", "mintHumanPresence", "armPresenceReservation", "mintArmedPresenceReservation"]],
];

// The conductor procedure markers (FR-25). Rendering differs per harness only
// through {{HARNESS_DIR}} substitution, so these are literal prose/flag tokens.
const PROTOCOL_MARKERS = [
  "standing_grant_id",
  "standing_grant_route_id",
  "GATE_AUTHORIZATION_SELECTED",
  "await-approval",
  "target_intent_id",
  "presence_reservation_id",
  "--standing-grant-route-id",
  "--presence-reservation-id",
];

// The file that owns the prompt-submit mint on each harness. OpenCode has no
// prompt hook (no stdin hook shell at all) and is therefore absent here.
const MINT_OWNERS: Array<[string, string]> = [
  ["claude", join("hooks", "amadeus-mint-presence.ts")],
  ["codex", join("hooks", "amadeus-codex-adapter.ts")],
  ["cursor", join("hooks", "amadeus-mint-presence.ts")],
  ["kiro", join("hooks", "amadeus-kiro-adapter.ts")],
  ["kiro-ide", join("hooks", "amadeus-kiro-adapter.ts")],
];

function harnessDir(name: string): string {
  const row = HARNESS_DIRS.find(([n]) => n === name);
  if (row === undefined) throw new Error(`unknown harness ${name}`);
  return row[1];
}

describe("solo standing grant — six-harness contract projection", () => {
  test.each(HARNESS_DIRS)(
    "%s ships every authorization module byte-identical to canonical core",
    (_harness, dir) => {
      for (const file of CONTRACT_TOOLS) {
        const projected = join(dir, "tools", file);
        expect(existsSync(projected)).toBe(true);
        expect(readFileSync(projected)).toEqual(readFileSync(join(CORE_TOOLS, file)));
      }
    },
  );

  test.each(HARNESS_DIRS)(
    "%s carries every directive, state and audit contract marker",
    (_harness, dir) => {
      for (const [file, markers] of CONTRACT_MARKERS) {
        const text = readFileSync(join(dir, "tools", file), "utf8");
        for (const marker of markers) expect(text).toContain(marker);
      }
    },
  );

  test.each(HARNESS_DIRS)(
    "%s describes the same conductor route/report/fallback procedure",
    (_harness, dir) => {
      const text = readFileSync(
        join(dir, "amadeus-common", "protocols", "stage-protocol.md"),
        "utf8",
      );
      for (const marker of PROTOCOL_MARKERS) expect(text).toContain(marker);
      // The fallback must not re-run the stage's quality ritual (FR-23) and must
      // not automate a rejection (FR-11).
      expect(text).toContain("Do NOT re-run the stage body, reviewer, sensors, or §13 learnings");
      expect(text).toContain("Request Changes, reject, and halt-and-ask stay human decisions");
    },
  );

  test.each(MINT_OWNERS)(
    "%s mints presence only through the canonical seam",
    (_harness, rel) => {
      const text = readFileSync(join(harnessDir(_harness), rel), "utf8");
      expect(text).toContain("mintHumanPresence");
      expect(text).toContain("hostSessionCapability");
      // No adapter-local HUMAN_TURN append may survive beside the seam.
      expect(text).not.toContain('appendAuditEntry("HUMAN_TURN"');
    },
  );

  test("kiro-ide declares its session capability unavailable rather than degrading", () => {
    const text = readFileSync(
      join(harnessDir("kiro-ide"), "hooks", "amadeus-kiro-adapter.ts"),
      "utf8",
    );
    expect(text).toContain("hostSessionCapability(undefined,");
    // The forbidden degradations (HR-04e).
    expect(text).not.toContain("process.pid");
  });

  test("opencode ships no prompt-hook mint site to degrade", () => {
    const dir = harnessDir("opencode");
    expect(existsSync(join(dir, "hooks", "amadeus-codex-adapter.ts"))).toBe(false);
    expect(existsSync(join(dir, "hooks", "amadeus-kiro-adapter.ts"))).toBe(false);
    // The neutral core hook still projects, so a future OpenCode prompt adapter
    // has the canonical seam waiting rather than a harness-local mint.
    const core = readFileSync(join(dir, "hooks", "amadeus-mint-presence.ts"), "utf8");
    expect(core).toContain("mintHumanPresence");
  });
});
