// size: small
//
// t491 — the pure halves of the birth-time `--autonomy` declaration (#2378
// FR-1, Unit u2-birth-declaration).
//
// The birth handler is spawn-driven, so t490 exercises it end to end through the
// real CLI and bun's coverage cannot see inside those children
// (bun-coverage-spawn-blindspot). The judgments themselves are therefore split
// out as pure functions and driven here in-process, over injected ports — the
// same shape t450's unit half uses for the engine-side ladder.
//
// Nothing here touches the filesystem, so this stays a small test
// (fs-tests-integration-first).

import { describe, expect, test } from "bun:test";
import {
  type BirthAutonomyPorts,
  classifyBirthAutonomyFlag,
  migratedDeclarationAdvisory,
  resolveBirthAutonomyDeclaration,
} from "../../packages/framework/core/tools/amadeus-utility.ts";
import { strandedCarryRefusal } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";

const PD = "/tmp/t491-project";
const TOKEN = "t491-launch-turn-token";
const STATE = "# State\n\n## Current Status\n- **Intent Autonomy Mode**: none\n";

type ApplyResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

// A recorder for the two ports, so "did the canonical write path get called, and
// with what?" is observable without a workspace on disk.
function recorder(applyResult: ApplyResult = { ok: true }) {
  const applied: { mode: string; stateContent: string; launchTurnId: string }[] = [];
  const ports: BirthAutonomyPorts = {
    readState: () => STATE,
    applyMode: (input) => {
      applied.push({
        mode: input.mode,
        stateContent: input.stateContent,
        launchTurnId: input.provenanceScope.launchTurnId,
      });
      return applyResult;
    },
  };
  return { applied, ports };
}

describe("t491 classifyBirthAutonomyFlag", () => {
  test("an absent flag is absent, not a mode", () => {
    expect(classifyBirthAutonomyFlag({ scope: "feature" })).toEqual({ kind: "absent" });
  });

  for (const mode of ["none", "semi", "full"] as const) {
    test(`${mode} is carried through as a mode`, () => {
      expect(classifyBirthAutonomyFlag({ autonomy: mode })).toEqual({ kind: "mode", mode });
    });
  }

  test("surrounding whitespace is tolerated", () => {
    expect(classifyBirthAutonomyFlag({ autonomy: "  semi " })).toEqual({ kind: "mode", mode: "semi" });
  });

  test("a value outside the three modes is invalid and names what it saw", () => {
    const flag = classifyBirthAutonomyFlag({ autonomy: "bogus" });
    expect(flag.kind).toBe("invalid");
    expect(flag.kind === "invalid" && flag.message).toContain('"bogus"');
    expect(flag.kind === "invalid" && flag.message).toContain("none, semi, full");
  });

  test("a value-less flag is invalid — an empty string is not a mode", () => {
    expect(classifyBirthAutonomyFlag({ autonomy: "" }).kind).toBe("invalid");
  });

  test("a differently-cased mode name is NOT accepted", () => {
    expect(classifyBirthAutonomyFlag({ autonomy: "Semi" }).kind).toBe("invalid");
  });
});

describe("t491 resolveBirthAutonomyDeclaration", () => {
  test("semi goes through the canonical write path under the launch-chain scope", () => {
    const rec = recorder();
    const outcome = resolveBirthAutonomyDeclaration(PD, "semi", TOKEN, rec.ports);
    expect(outcome).toEqual({ kind: "reported", message: "Intent autonomy: semi\n" });
    // BR-U2-6: one write path, and the widened reference is what a just-born
    // intent needs (its own shards carry no HUMAN_TURN yet).
    expect(rec.applied).toEqual([
      { mode: "semi", stateContent: STATE, launchTurnId: TOKEN },
    ]);
  });

  test("none is applied the same way", () => {
    const rec = recorder();
    expect(resolveBirthAutonomyDeclaration(PD, "none", TOKEN, rec.ports).kind).toBe("reported");
    expect(rec.applied).toHaveLength(1);
  });

  test("full is never applied — it reports the ceremony and leaves the mode alone (BR-U2-3)", () => {
    const rec = recorder();
    const outcome = resolveBirthAutonomyDeclaration(PD, "full", TOKEN, rec.ports);
    expect(outcome.kind).toBe("reported");
    expect(outcome.message).toContain("preview-autonomy");
    expect(outcome.message).toContain("set-autonomy --mode full");
    expect(rec.applied).toHaveLength(0);
  });

  // Ruling conditions 2 and 3. A launch that observed no turn has nothing to
  // cite, and the declaration must stop there rather than let the write path go
  // looking for some other unconsumed turn in the space.
  test("no observed launch turn is refused before the write path is even reached", () => {
    const rec = recorder();
    const outcome = resolveBirthAutonomyDeclaration(PD, "semi", null, rec.ports);
    expect(outcome.kind).toBe("refused");
    expect(outcome.message).toContain("carried no human turn");
    expect(outcome.message).toContain("/amadeus --autonomy semi");
    expect(rec.applied).toHaveLength(0);
  });

  test("full is still reported, not refused, when no turn was observed", () => {
    // full never reaches the write path at all, so the missing turn is moot.
    const rec = recorder();
    expect(resolveBirthAutonomyDeclaration(PD, "full", null, rec.ports).kind).toBe("reported");
    expect(rec.applied).toHaveLength(0);
  });

  test("a refused write is relayed loudly and names how to re-declare (BR-U2-4)", () => {
    const rec = recorder({ ok: false, error: "PROVENANCE_REQUIRED" });
    const outcome = resolveBirthAutonomyDeclaration(PD, "semi", TOKEN, rec.ports);
    expect(outcome.kind).toBe("refused");
    expect(outcome.message).toContain("PROVENANCE_REQUIRED");
    // The intent stands; the declaration is still available against it.
    expect(outcome.message).toContain("/amadeus --autonomy semi");
  });
});

describe("t491 migratedDeclarationAdvisory", () => {
  test("a declaration alongside a migration is reported, not dropped", () => {
    const outcome = migratedDeclarationAdvisory("semi");
    // Reported, not refused: the migration itself succeeded, so birth does not
    // fail — it says what happened and how to finish.
    expect(outcome.kind).toBe("reported");
    expect(outcome.message).toContain("NOT applied");
    expect(outcome.message).toContain("migrated");
    expect(outcome.message).toContain("remedy:");
    expect(outcome.message).toContain("/amadeus --autonomy semi");
  });

  test("it names the mode the user actually asked for", () => {
    expect(migratedDeclarationAdvisory("none").message).toContain("/amadeus --autonomy none");
  });
});

describe("t491 strandedCarryRefusal", () => {
  test("nothing latched means nothing to refuse", () => {
    expect(strandedCarryRefusal(null)).toBeNull();
  });

  test("a latched carry names the mode that would have been dropped", () => {
    const message = strandedCarryRefusal("semi");
    expect(message).toContain("--autonomy semi");
    expect(message).toContain("did not reach intent birth");
  });
});
