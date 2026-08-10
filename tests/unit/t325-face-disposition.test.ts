// covers: file:scripts/plugin-projection.ts
// size: small
//
// U4 hook-wiring-remaining — the pure 2-axis disposition classifier
// (reliability-design.md REL-U4-1). classifyDisposition folds (host class,
// compose trigger) into wired|degraded so that "wired AND degraded" and
// "neither" are both unrepresentable — a silent gap (a face that is neither
// wired nor degraded) cannot exist by construction. resolveFaceDisposition
// applies it across the real 7-face matrix enumeration (BR-U1-7). The XOR全数
// assert against real wiring lives in t327 (integration); this unit exercises
// the classifier's four axis combinations and the enumeration mapping.

import { describe, expect, test } from "bun:test";
import {
  classifyDisposition,
  PACKAGE_HARNESSES,
  PLUGIN_COMPOSE_TRIGGER,
  PLUGIN_HOST_CLASS,
  resolveFaceDisposition,
} from "../../scripts/plugin-projection.ts";

describe("t325 face disposition classifier (U4)", () => {
  // Both axes drive degrade; only measured × non-manual-only is wired. All four
  // combinations, not just the two the current matrix realises.
  test("classifyDisposition — 2-axis truth table (BR-U4-4)", () => {
    expect(classifyDisposition("folder-drop-auto", "measured")).toBe("wired");
    expect(classifyDisposition("native-manifest", "measured")).toBe("wired");
    // deferred trigger degrades even when the class would otherwise wire.
    expect(classifyDisposition("folder-drop-auto", "deferred")).toBe("degraded");
    // manual-only degrades regardless of trigger.
    expect(classifyDisposition("manual-only", "measured")).toBe("degraded");
    expect(classifyDisposition("manual-only", "deferred")).toBe("degraded");
  });

  // Every face lands in exactly one arm — the type makes a third state
  // impossible, and this asserts the enumeration realises both arms.
  test("resolveFaceDisposition — every face is wired XOR degraded (REL-U4-1)", () => {
    for (const h of PACKAGE_HARNESSES) {
      const d = resolveFaceDisposition(h);
      expect(d.harness).toBe(h);
      expect(d.kind === "wired" || d.kind === "degraded").toBe(true);
      // The classifier and the resolver agree (resolver is the enumeration lift).
      const expected = classifyDisposition(PLUGIN_HOST_CLASS[h], PLUGIN_COMPOSE_TRIGGER[h]);
      expect(d.kind).toBe(expected);
    }
  });

  // The concrete matrix conclusion (BR-U1-7): opencode degrades (manual-only +
  // deferred); the other six wire. claude was wired in U2, the other five in U4.
  test("resolveFaceDisposition — matrix conclusion (BR-U1-7)", () => {
    const wired = PACKAGE_HARNESSES.filter((h) => resolveFaceDisposition(h).kind === "wired");
    const degraded = PACKAGE_HARNESSES.filter((h) => resolveFaceDisposition(h).kind === "degraded");
    expect([...wired].sort()).toEqual(["claude", "codex", "cursor", "kimi", "kiro", "kiro-ide"]);
    expect([...degraded].sort()).toEqual(["opencode"]);
    // opencode degrades on the manual-only axis (fail-closed, BR-U1-6).
    const oc = resolveFaceDisposition("opencode");
    expect(oc.kind === "degraded" && oc.reason).toBe("manual-only");
    // The two sets partition all 7 faces (no overlap, no omission).
    expect(wired.length + degraded.length).toBe(PACKAGE_HARNESSES.length);
  });
});
