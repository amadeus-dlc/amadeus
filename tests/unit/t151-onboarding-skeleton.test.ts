// t151-onboarding-skeleton: the shared onboarding-doc skeleton renders a
// COMPLETE doc for every harness — including a brand-new one — from one source.
//
// covers: file:scripts/onboarding.ts
//
// WHAT. core/templates/onboarding.md + scripts/onboarding.ts render each
// harness's CLAUDE.md / AGENTS.md. This pins the "a 4th harness gets a complete
// onboarding doc for free, provably" guarantee:
//   (1) renderOnboarding() over a SYNTHETIC 4th harness's fills produces a doc
//       with every shared section present, the invoke command substituted, and
//       NO leftover {{SLOT:...}} / {{INVOKE}} marker — i.e. nothing was forgotten.
//   (2) An incomplete fill set (a declared slot left unprovided that the renderer
//       fails to blank) cannot pass — the renderer THROWS. We assert the
//       completeness guard fires on a deliberately-broken skeleton.
//   (3) Each shipped harness (claude, kiro, codex) renders with zero leftover
//       markers via its real fills — the same guarantee, on the live harnesses.
//
// Mechanism: none. Pure in-process render over the skeleton + fills modules.
// Zero spawn, zero LLM, zero tokens.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../harness/fixtures.ts";
import {
  declaredSlots,
  renderOnboarding,
  type OnboardingFills,
} from "../../scripts/onboarding.ts";

const SKELETON = readFileSync(
  join(REPO_ROOT, "packages", "framework", "core", "templates", "onboarding.md"),
  "utf-8",
);

// The shared sections every rendered onboarding doc must carry, regardless of
// harness (they live in the skeleton body, not a per-harness slot).
const REQUIRED_SECTIONS = [
  "## Prerequisites",
  "## AI-DLC Structure",
  "## Conventions",
  "## Documentation",
  "## Session Resumption",
  "## Git Integration",
];

function noLeftoverMarkers(rendered: string): RegExpMatchArray | null {
  return rendered.match(/\{\{SLOT:[a-z_]+\}\}|\{\{INVOKE\}\}|\{\{HARNESS_DIR\}\}/);
}

describe("t151 onboarding skeleton — a new harness gets a complete doc for free", () => {
  test("1: a synthetic 4th harness renders a complete doc (all sections, no leftover markers)", () => {
    // A minimal fills set for an imaginary harness "Foo CLI". Every declared
    // slot gets a value (some empty — intentional omission). This is exactly what
    // a porter writes: one fills file, no skeleton edit.
    const fooFills: OnboardingFills = {
      invoke: "@amadeus",
      slots: Object.fromEntries(
        declaredSlots(SKELETON).map((name) => [
          name,
          name === "title_block"
            ? "# Project Name\n\nThis project uses AI-DLC on the Foo CLI harness. Run `@amadeus` to begin."
            : name === "prereq_bullets"
              ? "- **Foo CLI**: install per its docs.\n- **bun**: required for the tools."
              : "", // every other slot intentionally omitted for this minimal harness
        ]),
      ),
    };

    // Render, then substitute the harness-dir token the packager would apply.
    let rendered = renderOnboarding(SKELETON, fooFills);
    rendered = rendered.split("{{HARNESS_DIR}}").join(".foo");

    // Every shared section is present — the doc is structurally complete.
    for (const section of REQUIRED_SECTIONS) {
      expect(rendered).toContain(section);
    }
    // The invoke command was substituted everywhere.
    expect(rendered).toContain("@amadeus");
    // Nothing was forgotten: no slot/invoke/harness-dir marker survives.
    expect(noLeftoverMarkers(rendered)).toBeNull();
  });

  test("2: omitted slots render blank (no marker leaks) and the guard catches an unsubstituted invoke", () => {
    // A) Completeness by construction: a declared slot with NO fill renders to
    //    empty — the doc never ships a visible {{SLOT:...}} marker, whether the
    //    slot sits on its own line or mid-line.
    const sk = "# T {{SLOT:inline}} x\n\n{{SLOT:lone}}\nbody {{INVOKE}}\n";
    const out = renderOnboarding(sk, { invoke: "/amadeus", slots: {} });
    expect(out).not.toContain("{{SLOT:");
    expect(out).toContain("body /amadeus"); // invoke substituted
    expect(out).toContain("# T  x"); // inline slot blanked in place

    // B) The defensive completeness guard: if the invoke value itself smuggles a
    //    surviving marker (a malformed/typo'd token the slot loop never matched),
    //    renderOnboarding THROWS rather than shipping it.
    expect(() =>
      renderOnboarding("body {{INVOKE}}\n", { invoke: "{{INVOKE}}", slots: {} }),
    ).toThrow(/render incomplete/);
  });

  test("3: every shipped harness renders with zero leftover markers via its real fills", () => {
    const harnesses: Array<[string, string]> = [
      ["claude", ".claude"],
      ["kiro", ".kiro"],
      ["codex", ".codex"],
    ];
    for (const [name, dir] of harnesses) {
      const fills = (
        require(join(REPO_ROOT, "packages", "framework", "harness", name, "onboarding.fills.ts")) as {
          default: OnboardingFills;
        }
      ).default;
      let rendered = renderOnboarding(SKELETON, fills);
      rendered = rendered.split("{{HARNESS_DIR}}").join(dir);
      expect({ harness: name, leftover: noLeftoverMarkers(rendered) }).toEqual({
        harness: name,
        leftover: null,
      });
      // Shared sections present for the real harness too.
      for (const section of REQUIRED_SECTIONS) {
        expect(rendered).toContain(section);
      }
    }
  });

  test("4: Codex's rendered doc carries the fresh-worktree bootstrap checklist (#2714)", () => {
    const fills = (
      require(join(REPO_ROOT, "packages", "framework", "harness", "codex", "onboarding.fills.ts")) as {
        default: OnboardingFills;
      }
    ).default;
    let rendered = renderOnboarding(SKELETON, fills);
    rendered = rendered.split("{{HARNESS_DIR}}").join(".codex");

    expect(rendered).toContain("## Fresh worktree / clone checklist");
    // Branch 1: `.codex/tools/` missing → bootstrap this repo's own self-development worktree.
    expect(rendered).toContain("mise trust && bun install --frozen-lockfile && bun run build");
    // Branch 2: `.codex/tools/` present but `.codex/hooks.json` missing → activate.
    expect(rendered).toContain("bun .codex/tools/amadeus-codex-hooks.ts activate");
    expect(rendered).toContain("Issue #2703");
    expect(rendered).toContain("PR #2709");
    // Step 3 — CodeRabbit review (PR #2718): the restart requirement applies to
    // BOTH creation paths. A hooks.json created mid-task by `bun run build` is
    // just as dark as one created by `activate`; branch 1 must not read as
    // "handled for you, keep going".
    expect(rendered).toContain("the restart requirement below applies to this branch too");
    expect(rendered).toContain("If either step above created");
    expect(rendered).toContain("task restart (same worktree) is required");
    expect(rendered).toContain("by `bun run build` or by `activate`, it makes no difference");
    // Issue #2862: restart protects a live AI-DLC workflow that needs the
    // UserPromptSubmit/HUMAN_TURN hook. A delegated no-intent builder does not
    // mutate the engine, so ignored build output must not end its assignment.
    expect(rendered).toContain("start, run, or resume an AI-DLC workflow");
    expect(rendered).toContain("mutate the engine");
    expect(rendered).toContain("requires hooks or `HUMAN_TURN` in this task");
    expect(rendered).toContain("will not invoke or mutate the AI-DLC engine");
    expect(rendered).toContain("does not require hooks or `HUMAN_TURN` during this task");
    expect(rendered).toContain("delegated no-intent builder implementing code directly");
    expect(rendered).toContain("continue only when the assignment");
    expect(rendered).toContain("ignored disposable generated output");
    expect(rendered).toContain("do not stage or commit it");
    expect(rendered).toContain("Tracked or user-owned changes are not disposable");
    // Team-lead ruling (incident: 3 worktrees churned, 25 minutes lost):
    // restart must fork the SAME directory, never open a new worktree.
    expect(rendered).toContain("fork_thread");
    expect(rendered).toContain("create_thread");
    expect(rendered).toContain("throws away everything this checklist just did");
    // Handoff discipline: fork/restart messages must carry the original
    // scope/intent/Issue references verbatim, not a paraphrase.
    expect(rendered).toContain("must include the ORIGINAL instructions in full");
    expect(rendered).toContain("scope, intent name, and Issue references verbatim");
  });
});
