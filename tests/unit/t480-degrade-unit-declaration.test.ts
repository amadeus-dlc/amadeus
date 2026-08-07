// covers: function:parseDegradeUnitDeclaration, function:decideDegradeUnitCompletion, function:writeDegradeUnitDeclaration
// size: small
//
// t480 — the degrade-path "unit list is complete" declaration (#2358, ruling
// #2385 Q4-B). A per-unit stage with no compiled unit DAG resolves its unit
// from the directory listing under <record>/construction/. When SEVERAL of
// those directories exist and EVERY one already holds the stage's required
// artifacts, the engine has nothing left to produce but also cannot tell
// whether the conductor is done adding units — so it refuses (issue #1769).
//
// This is the seam that ends the refusal: the conductor records an explicit
// declaration in `amadeus-state.md`, and the engine turns it into the stage
// gate. Three pure pieces, all pinned here:
//   * writeDegradeUnitDeclaration — the writer's text layer (create + update)
//   * parseDegradeUnitDeclaration — the reader, fail-closed on a half-written
//     declaration (units without a timestamp is not a declaration)
//   * decideDegradeUnitCompletion — the SINGLE boundary between accepting a
//     declaration and emitting a directive. It takes the covered-unit set as an
//     argument (FR-3.3 ii) so a later unreviewed-unit check (#2359) has one
//     place to sit, and so a stale declaration cannot pass for a current one.

import { describe, expect, test } from "bun:test";
import {
  decideDegradeUnitCompletion,
  DEGRADE_UNIT_DECLARATION_HEADING,
  DEGRADE_UNITS_DECLARED_AT_FIELD,
  DEGRADE_UNITS_DECLARED_FIELD,
  getField,
  parseDeclaredUnitsArg,
  parseDegradeUnitDeclaration,
  writeDegradeUnitDeclaration,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

const BASE = `# AI-DLC State Tracking

## Current Status
- **Current Stage**: code-generation
`;

const AT = "2026-08-07T00:00:00Z";

describe("t480 degrade unit declaration — writer", () => {
  test("creates the section additively, leaving prior bytes untouched", () => {
    const written = writeDegradeUnitDeclaration(BASE, ["unit-beta", "unit-alpha"], AT);

    expect(written.startsWith(BASE)).toBe(true);
    expect(written).toContain(DEGRADE_UNIT_DECLARATION_HEADING);
    expect(getField(written, DEGRADE_UNITS_DECLARED_FIELD)).toBe("unit-beta, unit-alpha");
    expect(getField(written, DEGRADE_UNITS_DECLARED_AT_FIELD)).toBe(AT);
  });

  test("re-declaring updates the bullets in place rather than stacking sections", () => {
    const once = writeDegradeUnitDeclaration(BASE, ["unit-alpha"], AT);
    const twice = writeDegradeUnitDeclaration(once, ["unit-alpha", "unit-beta"], "2026-08-08T00:00:00Z");

    expect(twice.split(DEGRADE_UNIT_DECLARATION_HEADING).length - 1).toBe(1);
    expect(getField(twice, DEGRADE_UNITS_DECLARED_FIELD)).toBe("unit-alpha, unit-beta");
    expect(getField(twice, DEGRADE_UNITS_DECLARED_AT_FIELD)).toBe("2026-08-08T00:00:00Z");
  });

  test("the rendered section carries no checkbox-shaped row", () => {
    const written = writeDegradeUnitDeclaration(BASE, ["unit-alpha"], AT);
    const section = written.slice(written.indexOf(DEGRADE_UNIT_DECLARATION_HEADING));

    expect(/^- \[([ xSR?-])\] (\S+)\s*—/m.test(section)).toBe(false);
  });
});

describe("t480 degrade unit declaration — reader", () => {
  test("round-trips the written units, deduped and sorted", () => {
    const written = writeDegradeUnitDeclaration(BASE, ["unit-beta", "unit-alpha", "unit-beta"], AT);
    const parsed = parseDegradeUnitDeclaration(written);

    expect(parsed?.units).toEqual(["unit-alpha", "unit-beta"]);
    expect(parsed?.declaredAt).toBe(AT);
  });

  test("absent state, absent section, and an empty unit list are all 'no declaration'", () => {
    expect(parseDegradeUnitDeclaration(null)).toBeNull();
    expect(parseDegradeUnitDeclaration(BASE)).toBeNull();
    expect(
      parseDegradeUnitDeclaration(
        `${BASE}\n${DEGRADE_UNIT_DECLARATION_HEADING}\n- **${DEGRADE_UNITS_DECLARED_FIELD}**:\n- **${DEGRADE_UNITS_DECLARED_AT_FIELD}**: ${AT}\n`,
      ),
    ).toBeNull();
  });

  test("units without a timestamp are refused rather than read as a declaration", () => {
    const halfWritten = `${BASE}\n${DEGRADE_UNIT_DECLARATION_HEADING}\n- **${DEGRADE_UNITS_DECLARED_FIELD}**: unit-alpha, unit-beta\n`;

    expect(parseDegradeUnitDeclaration(halfWritten)).toBeNull();
  });
});

describe("t480 degrade unit declaration — --units validation", () => {
  test("accepts a comma list, trims it, and drops duplicates", () => {
    const parsed = parseDeclaredUnitsArg(" unit-alpha , unit_beta,unit-alpha ,");

    expect(parsed.ok).toBe(true);
    expect(parsed.ok ? parsed.units : []).toEqual(["unit-alpha", "unit_beta"]);
  });

  test("refuses an empty list", () => {
    expect(parseDeclaredUnitsArg("  , ,").ok).toBe(false);
  });

  test("refuses tokens that are not plain directory names", () => {
    for (const raw of ["../escape", "unit alpha", "unit/alpha", "unit.alpha", "-leading"]) {
      const parsed = parseDeclaredUnitsArg(raw);
      expect(parsed.ok).toBe(false);
      expect(parsed.ok ? "" : parsed.error).toContain("not a unit directory name");
    }
  });

  test("refuses a token carrying a newline, which would forge a second state line", () => {
    expect(parseDeclaredUnitsArg("unit-alpha\n- **Current Stage**: forged").ok).toBe(false);
  });
});

describe("t480 degrade unit declaration — decision boundary", () => {
  const declaration = { units: ["unit-alpha", "unit-beta"], declaredAt: AT } as const;

  test("a declaration matching the covered set gates on the last covered unit", () => {
    const decision = decideDegradeUnitCompletion(declaration, ["unit-beta", "unit-alpha"]);

    expect(decision.kind).toBe("gate");
    expect(decision.kind === "gate" ? decision.unit : null).toBe("unit-beta");
  });

  test("no declaration refuses and names the declaration verb", () => {
    const decision = decideDegradeUnitCompletion(null, ["unit-alpha", "unit-beta"]);

    expect(decision.kind).toBe("refuse");
    expect(decision.kind === "refuse" ? decision.reason : "").toContain("declare-units-done");
  });

  test("a declaration missing a unit that is on disk is stale and refuses", () => {
    const decision = decideDegradeUnitCompletion(declaration, ["unit-alpha", "unit-beta", "unit-gamma"]);

    expect(decision.kind).toBe("refuse");
    expect(decision.kind === "refuse" ? decision.reason : "").toContain("unit-gamma");
  });

  test("a declaration naming a unit that is not on disk refuses", () => {
    const decision = decideDegradeUnitCompletion(declaration, ["unit-alpha"]);

    expect(decision.kind).toBe("refuse");
    expect(decision.kind === "refuse" ? decision.reason : "").toContain("unit-beta");
  });

  test("an empty covered set can never be gated by a declaration", () => {
    expect(decideDegradeUnitCompletion(declaration, []).kind).toBe("refuse");
  });
});
