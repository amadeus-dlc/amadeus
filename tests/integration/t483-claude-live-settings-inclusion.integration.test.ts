// size: medium
//
// t483 — Issue #2297 completion condition 2 (requirements FR-A3/FR-A4, AC-A1/A4).
//
// WHAT THIS PINS. The shipped example (packages/framework/harness/claude/
// settings.json.example) is the ground truth for which hooks Claude Code must
// fire; the live .claude/settings.json is what this repository actually runs.
// #2297 was exactly the gap between them: the example wired the PreToolUse
// subagent-start hook, the live file never grew the entry, and nothing noticed
// — the hook was dead in the very repo that owns it.
//
// The guard is a set-inclusion check over normalized (event, matcher, hook
// script) triples: EVERY hook the example declares must also be present live.
// Live-only extras are allowed (the live file legitimately carries local
// operator wiring); a live MISSING entry is the drift #2297 was made of.
//
// Both settings faces are read as real files — the example is tracked, the live
// file is the running configuration — so this is an fs-reading integration-tier
// test (fs-tests-integration-first). The example uses the direct form (a hook
// path in the command) while live uses the dispatcher form (a slug argument);
// normalizing both to the hook's basename via HOOK_PATHS is what makes the two
// faces comparable at all.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

import { HOOK_PATHS } from "../../packages/framework/harness/claude/hooks/amadeus-dispatch.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const EXAMPLE_SETTINGS = join(
  REPO_ROOT,
  "packages/framework/harness/claude/settings.json.example",
);
const LIVE_SETTINGS = join(REPO_ROOT, ".claude", "settings.json");

/** A hook wiring reduced to the identity that must match across both faces. */
type HookRef = { event: string; matcher: string; script: string };

/**
 * A known, deliberately-tolerated absence from the live settings.
 *
 * FR-A4: each waiver carries an Issue reference AND a reason, and neither may
 * be empty — a waiver nobody can trace back to a tracked decision is a silent
 * drop wearing an allowlist's clothes.
 */
type Waiver = { event: string; script: string; issue: string; reason: string };

const WAIVERS: Waiver[] = [
  {
    event: "SessionStart",
    script: "amadeus-plugin-compose.ts",
    issue: "#2426",
    reason:
      "auto-compose is not wired into this repository's live SessionStart; filed separately per FR-A4 (scope-out of #2297)",
  },
];

function waiverIsGrounded(w: Waiver): boolean {
  return w.issue.trim().length > 0 && w.reason.trim().length > 0;
}

/**
 * Resolve one hook command to the hook script it ultimately runs.
 *
 * Dispatcher form ("… /amadeus-dispatch.ts <slug>") resolves through HOOK_PATHS
 * so the slug table stays the single source of the mapping. Direct form carries
 * the hook path inline. Anything else (a non-amadeus command) is not ours.
 */
function scriptOf(command: string): string | undefined {
  const dispatched = command.match(/amadeus-dispatch\.ts"?\s+([a-z-]+)\s*$/);
  if (dispatched !== null) {
    const slug = dispatched[1] as keyof typeof HOOK_PATHS;
    const target = HOOK_PATHS[slug];
    if (target === undefined) return undefined;
    return basename(target);
  }
  return command.match(/(amadeus-[a-z-]+\.ts)/)?.[1];
}

function hookRefs(settingsPath: string): HookRef[] {
  const parsed = JSON.parse(readFileSync(settingsPath, "utf8")) as {
    hooks?: Record<string, { matcher?: string; hooks?: { command?: string }[] }[]>;
  };
  const refs: HookRef[] = [];
  for (const [event, groups] of Object.entries(parsed.hooks ?? {})) {
    for (const group of groups) {
      for (const entry of group.hooks ?? []) {
        const script = scriptOf(entry.command ?? "");
        if (script === undefined) continue;
        refs.push({ event, matcher: group.matcher ?? "", script });
      }
    }
  }
  return refs;
}

const key = (r: HookRef): string => `${r.event}|${r.matcher}|${r.script}`;

describe("t483 claude live settings include every shipped example hook (#2297)", () => {
  // The guard proper. AC-A1: after the fix, PreToolUse{^Task$} →
  // log-subagent-start is present live and this inclusion holds with no
  // unwaived gap.
  test("every example hook is wired in the live settings (FR-A3)", () => {
    const example = hookRefs(EXAMPLE_SETTINGS);
    const live = new Set(hookRefs(LIVE_SETTINGS).map(key));

    // Guard the guard: an empty enumeration would vacuously pass.
    expect(example.length).toBeGreaterThan(0);

    const waived = new Set(WAIVERS.map((w) => `${w.event}|${w.script}`));
    const missing = example
      .filter((r) => !live.has(key(r)))
      .filter((r) => !waived.has(`${r.event}|${r.script}`));

    expect(
      missing.map(key).sort(),
      "example hooks absent from .claude/settings.json (see #2297)",
    ).toEqual([]);
  });

  // The specific wiring #2297 lost, asserted by name so a future refactor that
  // keeps the set-inclusion happy for the wrong reason still has to face it.
  test("the PreToolUse subagent-start hook is wired live (AC-A1)", () => {
    const live = hookRefs(LIVE_SETTINGS);
    const entry = live.find(
      (r) => r.event === "PreToolUse" && r.script === "amadeus-log-subagent-start.ts",
    );
    expect(entry, "live PreToolUse wires amadeus-log-subagent-start.ts").toBeDefined();
    expect(entry?.matcher).toBe("^Task$");
  });

  // FR-A4 / AC-A4: the waiver list is a tracked decision, not a hiding place.
  test("every waiver carries a non-empty issue reference and reason (AC-A4)", () => {
    expect(WAIVERS.length).toBeGreaterThan(0);
    for (const w of WAIVERS) {
      expect(w.issue.trim(), `waiver ${w.script} has an issue reference`).not.toBe("");
      expect(w.reason.trim(), `waiver ${w.script} has a reason`).not.toBe("");
    }
  });

  // The negative case for AC-A4: the predicate that admits waivers actually
  // rejects an empty field. Without this, the check above could be satisfied by
  // a predicate that never says no.
  test("a waiver with an empty issue or reason is rejected (AC-A4 negative)", () => {
    const base = WAIVERS[0];
    expect(waiverIsGrounded(base)).toBe(true);
    expect(waiverIsGrounded({ ...base, issue: "" })).toBe(false);
    expect(waiverIsGrounded({ ...base, issue: "   " })).toBe(false);
    expect(waiverIsGrounded({ ...base, reason: "" })).toBe(false);
    expect(waiverIsGrounded({ ...base, reason: "   " })).toBe(false);
  });

  // Waivers must stay honest in the other direction too: a waiver for a hook
  // that IS wired live is stale and should be deleted, not carried forever.
  test("no waiver covers a hook that is already wired live", () => {
    const liveScripts = new Set(hookRefs(LIVE_SETTINGS).map((r) => `${r.event}|${r.script}`));
    const stale = WAIVERS.filter((w) => liveScripts.has(`${w.event}|${w.script}`));
    expect(stale.map((w) => w.script), "stale waivers to delete").toEqual([]);
  });
});
