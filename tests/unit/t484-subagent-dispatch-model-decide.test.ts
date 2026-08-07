// covers: function:decideDispatchModel
//
// t484 — Issue #2438 (subagent model enforcement, pure decision layer).
// decideDispatchModel turns already-resolved dispatch facts (type verdict,
// persona pin, explicitly requested model) into an allow/deny decision. It is
// deliberately FS-free so it lives in the unit layer
// (cid:code-generation:fs-tests-integration-first); the resolution of those
// facts against a real agents dir is t485's integration concern.
//
// Policy under test (#2438): a dispatch is allowed only when
//   (i) the explicit `model` request is inside the enforced set, or
//   (ii) the dispatch resolves to a declared persona whose frontmatter pin is
//        inside the enforced set.
// Everything else — ad-hoc names, builtins, unknown types, non-compliant pins,
// non-compliant explicit models — is denied with a remedy in the reason.

import { describe, expect, test } from "bun:test";
import {
  decideDispatchModel,
  ENFORCED_SUBAGENT_MODELS,
} from "../../packages/framework/core/tools/amadeus-subagent-observability.ts";

describe("t484 decideDispatchModel (#2438)", () => {
  test("enforced set is exactly opus and sonnet", () => {
    expect([...ENFORCED_SUBAGENT_MODELS]).toEqual(["opus", "sonnet"]);
  });

  // ---- (i) explicit model requests -----------------------------------------

  test.each(["opus", "sonnet", "claude-opus-5", "claude-sonnet-5-20250929"])(
    "explicit compliant model %s is allowed regardless of verdict",
    (model) => {
      const decision = decideDispatchModel({
        typeVerdict: "outside-allowed-set",
        personaPin: undefined,
        requestedModel: model,
      });
      expect(decision.kind).toBe("allow");
    },
  );

  test.each(["fable", "haiku", "claude-fable-5", "gpt-5", ""])(
    "explicit non-compliant model %j is denied even for a persona with a compliant pin",
    (model) => {
      const decision = decideDispatchModel({
        typeVerdict: "persona",
        personaPin: "opus",
        requestedModel: model,
      });
      expect(decision.kind).toBe("deny");
      if (decision.kind === "deny") expect(decision.reason).toContain("opus");
    },
  );

  test("explicit model is trimmed before comparison", () => {
    const decision = decideDispatchModel({
      typeVerdict: "builtin",
      personaPin: undefined,
      requestedModel: "  sonnet  ",
    });
    expect(decision.kind).toBe("allow");
  });

  // ---- (ii) persona pins ----------------------------------------------------

  test.each(["opus", "sonnet"])("persona with a %s pin is allowed", (pin) => {
    const decision = decideDispatchModel({
      typeVerdict: "persona",
      personaPin: pin,
      requestedModel: undefined,
    });
    expect(decision.kind).toBe("allow");
  });

  test("persona without a pin is denied with a remedy", () => {
    const decision = decideDispatchModel({
      typeVerdict: "persona",
      personaPin: undefined,
      requestedModel: undefined,
    });
    expect(decision.kind).toBe("deny");
    if (decision.kind === "deny") expect(decision.reason).toContain("model");
  });

  test("persona with a non-compliant pin is denied", () => {
    const decision = decideDispatchModel({
      typeVerdict: "persona",
      personaPin: "fable",
      requestedModel: undefined,
    });
    expect(decision.kind).toBe("deny");
  });

  // ---- everything else ------------------------------------------------------

  test.each(["builtin", "unknown-type", "outside-allowed-set"] as const)(
    "%s dispatch without an explicit model is denied and the reason names both remedies",
    (verdict) => {
      const decision = decideDispatchModel({
        typeVerdict: verdict,
        personaPin: undefined,
        requestedModel: undefined,
      });
      expect(decision.kind).toBe("deny");
      if (decision.kind === "deny") {
        expect(decision.reason).toContain("persona");
        expect(decision.reason).toContain("model");
      }
    },
  );

  test("a builtin's stray persona pin does not grant an allow", () => {
    // A pin is only attributable to a persona verdict; passing one alongside a
    // builtin verdict must not open the gate.
    const decision = decideDispatchModel({
      typeVerdict: "builtin",
      personaPin: "opus",
      requestedModel: undefined,
    });
    expect(decision.kind).toBe("deny");
  });
});
