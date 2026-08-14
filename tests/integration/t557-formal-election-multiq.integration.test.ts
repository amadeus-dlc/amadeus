// size: medium
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { canonicalIdentity } from "../../plugins/formal-model-check/tools/canonical.ts";
import { checkModelCompleteness } from "../../plugins/formal-model-check/tools/amadeus-sensor-model-completeness.ts";
import { loadVerifiedTlaSource } from "../../plugins/formal-model-check/tools/tla-model-loader.ts";
import { findModelMapModel } from "../../plugins/formal-model-check/tools/tla-model-map.ts";

const MODULE_DOMAIN = "amadeus.formal-verif.tla.module.v1";
const CFG_DOMAIN = "amadeus.formal-verif.tla.cfg.v1";

function rawSha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

describe("t557: FormalElection multi-question identity after rebase", () => {
  test("recomputes FormalElection identities from live files and matches the model map", () => {
    const loaded = loadVerifiedTlaSource();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    const model = findModelMapModel(loaded.value.modelMap, "FormalElection");
    expect(model).toBeDefined();
    if (model === undefined) return;

    expect(canonicalIdentity(readFileSync(model.model.path, "utf8"), MODULE_DOMAIN).sha256).toBe(
      model.model.identity,
    );
    expect(canonicalIdentity(readFileSync(model.cfg.path, "utf8"), CFG_DOMAIN).sha256).toBe(
      model.cfg.identity,
    );
    for (const auxiliary of model.auxiliaries ?? []) {
      expect(canonicalIdentity(readFileSync(auxiliary.path, "utf8"), MODULE_DOMAIN).sha256).toBe(
        auxiliary.identity,
      );
    }
    for (const entry of model.entries) {
      expect(rawSha256(entry.implPath)).toBe(entry.sha256);
    }
  });

  test("keeps the live workspace FormalElection model complete", async () => {
    expect(await checkModelCompleteness({ projectRoot: process.cwd() })).toEqual({
      pass: true,
      findings_count: 0,
      findings: [],
    });
  });

  test("models unique questions, held-only rerun, and established preservation", () => {
    const source = readFileSync("amadeus/spaces/default/specs/tla/FormalElection.tla", "utf8");
    const cfg = readFileSync("amadeus/spaces/default/specs/tla/FormalElection.cfg", "utf8");
    expect(source).toContain("QuestionOrder == <<Q1, Q2>>");
    expect(source).toContain("AcceptResponse(v, q, c, g)");
    expect(source).toContain("EstablishedImmutable");
    expect(source).toContain("HeldOnlyTargets");
    expect(source).toContain("targets' = held");
    expect(source).toContain("\\A q \\in preserved: results[q] = ResultEstablished");
    expect(cfg).toContain("INVARIANT EstablishedImmutable");
    expect(cfg).toContain("INVARIANT HeldOnlyTargets");
  });
});
