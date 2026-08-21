// covers: domain:setup-onboarding-ladder
// size: small
//
// #3388's destination ladder for the onboarding doc, as a pure decision seam:
// no filesystem, no process. The four facts that decide a destination
// (which path, --force, does the real name exist, does the alternate exist)
// are passed in directly, so every rung — including the ones that are awkward
// to stage on disk — is exercised exhaustively here. The filesystem-driven
// behaviour of Plan.forInstall/forUpgrade stays in tests/unit/setup-plan.test.ts.

import { describe, expect, test } from "bun:test";
import {
  decideOnboardingDestination,
  noticeFor,
  ONBOARDING_DOC_BASENAMES,
  onboardingAlternateFor,
} from "../../packages/setup/src/domain/onboarding-ladder.ts";

describe("onboardingAlternateFor — which payload paths enter the ladder", () => {
  test("both project-root onboarding filenames map to <STEM>-AMADEUS.md", () => {
    expect(onboardingAlternateFor("CLAUDE.md")).toBe("CLAUDE-AMADEUS.md");
    expect(onboardingAlternateFor("AGENTS.md")).toBe("AGENTS-AMADEUS.md");
    // The two names above ARE the closed set the ladder recognises.
    expect([...ONBOARDING_DOC_BASENAMES].sort()).toEqual(["AGENTS.md", "CLAUDE.md"]);
  });

  test("a nested file with the same basename is NOT a ladder file (depth 1 only)", () => {
    // .claude/CLAUDE.md and .agents/AGENTS.md are ordinary shared payload files
    // inside a harness dir — only the project-root doc collides with the
    // conventions this ladder exists to protect.
    expect(onboardingAlternateFor(".claude/CLAUDE.md")).toBeNull();
    expect(onboardingAlternateFor("docs/AGENTS.md")).toBeNull();
  });

  test("edge case: a lookalike name is not a ladder file", () => {
    expect(onboardingAlternateFor("CLAUDE.md.example")).toBeNull();
    expect(onboardingAlternateFor("claude.md")).toBeNull();
    expect(onboardingAlternateFor("CLAUDE-AMADEUS.md")).toBeNull();
    expect(onboardingAlternateFor("settings.json")).toBeNull();
  });
});

describe("decideOnboardingDestination — the three rungs (#3388 spec 1-3)", () => {
  test("rung 1: a free real name is used directly", () => {
    const decision = decideOnboardingDestination({
      relPath: "CLAUDE.md",
      force: false,
      primaryExists: false,
      alternateExists: false,
    });
    expect(decision).toEqual({ type: "primary", dest: "CLAUDE.md" });
  });

  test("rung 2: an occupied real name diverts to the alternate", () => {
    const decision = decideOnboardingDestination({
      relPath: "AGENTS.md",
      force: false,
      primaryExists: true,
      alternateExists: false,
    });
    expect(decision).toEqual({ type: "alternate", dest: "AGENTS-AMADEUS.md" });
  });

  test("rung 3: both names occupied blocks the write entirely", () => {
    const decision = decideOnboardingDestination({
      relPath: "CLAUDE.md",
      force: false,
      primaryExists: true,
      alternateExists: true,
    });
    expect(decision).toEqual({ type: "blocked", dest: "CLAUDE-AMADEUS.md" });
  });

  test("edge case: an existing alternate alone does not divert a free real name", () => {
    // The alternate is only consulted once the real name is taken, so a project
    // that already has CLAUDE-AMADEUS.md but no CLAUDE.md still gets the real one.
    const decision = decideOnboardingDestination({
      relPath: "CLAUDE.md",
      force: false,
      primaryExists: false,
      alternateExists: true,
    });
    expect(decision).toEqual({ type: "primary", dest: "CLAUDE.md" });
  });
});

describe("decideOnboardingDestination — --force keeps the pre-#3388 path (spec 4)", () => {
  test("every exists/alternate combination resolves to the real name under --force", () => {
    for (const primaryExists of [true, false]) {
      for (const alternateExists of [true, false]) {
        const decision = decideOnboardingDestination({ relPath: "CLAUDE.md", force: true, primaryExists, alternateExists });
        expect(decision).toEqual({ type: "primary", dest: "CLAUDE.md" });
      }
    }
  });
});

describe("decideOnboardingDestination — non-ladder files are untouched", () => {
  test("a non-onboarding path always resolves to itself, whatever the target holds", () => {
    for (const force of [true, false]) {
      for (const primaryExists of [true, false]) {
        const decision = decideOnboardingDestination({
          relPath: "settings.json",
          force,
          primaryExists,
          alternateExists: true,
        });
        expect(decision).toEqual({ type: "primary", dest: "settings.json" });
      }
    }
  });
});

describe("noticeFor — guidance is owed exactly when the real name was not used", () => {
  test("a primary destination owes no notice", () => {
    expect(noticeFor("CLAUDE.md", { type: "primary", dest: "CLAUDE.md" })).toBeNull();
  });

  test("alternate and blocked destinations each carry both names", () => {
    expect(noticeFor("CLAUDE.md", { type: "alternate", dest: "CLAUDE-AMADEUS.md" })).toEqual({
      kind: "alternate",
      primary: "CLAUDE.md",
      alternate: "CLAUDE-AMADEUS.md",
    });
    expect(noticeFor("AGENTS.md", { type: "blocked", dest: "AGENTS-AMADEUS.md" })).toEqual({
      kind: "blocked",
      primary: "AGENTS.md",
      alternate: "AGENTS-AMADEUS.md",
    });
  });
});
