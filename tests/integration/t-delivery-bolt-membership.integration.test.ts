// covers: file:packages/framework/core/tools/amadeus-runtime.ts

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  compile as compileRuntime,
  computeDeliveryBoltProjectionOutcome,
} from "../../packages/framework/core/tools/amadeus-runtime.ts";
import {
  projectDeliveryBoltPlan,
  projectEngineSingletonDeliveryBolt,
} from "../../packages/framework/core/tools/amadeus-delivery-bolts.ts";
import { resolveDeliveryBoltMembership } from "../../plugins/pr-convergence/tools/pr-convergence-presentation.ts";

process.env.AMADEUS_STAGE_GRAPH ??= join(
  import.meta.dir,
  "..",
  "..",
  "dist",
  "claude",
  ".claude",
  "tools",
  "data",
  "stage-graph.json",
);

const PLAN = `# Bolt Plan

## Bolt B2: Shared delivery

- **Units:** U2 \`unit-b\`, U1 \`unit-a\`

## Bolt B3: Independent delivery

- **Units:** U3 \`unit-c\`
`;

const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe("Delivery Bolt runtime membership projection", () => {
  test("projects only a completed Delivery Planning artifact", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-delivery-bolts-"));
    roots.push(project);
    const record = join(project, "amadeus", "spaces", "default", "intents", "delivery-deadbeef");
    const planning = join(record, "inception", "delivery-planning");
    mkdirSync(planning, { recursive: true });
    writeFileSync(join(planning, "bolt-plan.md"), PLAN);
    writeFileSync(join(record, "amadeus-state.md"), "- [x] delivery-planning — EXECUTE\n");

    expect(computeDeliveryBoltProjectionOutcome(project, "- [ ] delivery-planning — EXECUTE\n"))
      .toEqual({ kind: "absent" });
    const outcome = computeDeliveryBoltProjectionOutcome(
      project,
      "- [x] delivery-planning — EXECUTE\n",
    );
    expect(outcome.kind).toBe("projection");
    if (outcome.kind !== "projection") throw new Error("expected Delivery Bolt projection");
    expect(outcome.projection.source).toBe("inception/delivery-planning/bolt-plan.md");
    expect(outcome.projection.authority).toBe("approved-plan");
    expect(outcome.projection.sourceDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(outcome.projection.bolts).toEqual([
      { bolt: "B2", units: ["unit-a", "unit-b"] },
      { bolt: "B3", units: ["unit-c"] },
    ]);
  });

  test("projects one unambiguous incremental Unit when Delivery Planning is SKIP", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-delivery-bolts-singleton-"));
    roots.push(project);
    const intents = join(project, "amadeus", "spaces", "default", "intents");
    const recordName = "260813-bolt-pr-attestation";
    const record = join(intents, recordName);
    mkdirSync(join(record, "construction", "bolt-pr-attestation"), { recursive: true });
    writeFileSync(join(intents, "active-intent"), `${recordName}\n`);
    writeFileSync(
      join(intents, "intents.json"),
      `${JSON.stringify([{
        uuid: "019ffd00-0000-7000-8000-000000000001",
        slug: "bolt-pr-attestation",
        dirName: recordName,
        scope: "self-fix",
        status: "in-flight",
      }], null, 2)}\n`,
    );
    const state = `# AI-DLC State Tracking

## Project Information
- **Scope**: self-fix
- **State Version**: 7

## Stage Progress
- [S] units-generation — SKIP
- [S] delivery-planning — SKIP
- [-] code-generation — EXECUTE
`;
    writeFileSync(join(record, "amadeus-state.md"), state);

    const outcome = computeDeliveryBoltProjectionOutcome(project, state);
    expect(outcome.kind).toBe("projection");
    if (outcome.kind !== "projection") throw new Error("expected engine singleton projection");
    expect(outcome.projection).toMatchObject({
      authority: "engine-singleton",
      source: "amadeus-state.md",
      intent: {
        uuid: "019ffd00-0000-7000-8000-000000000001",
        slug: "bolt-pr-attestation",
        dirName: recordName,
      },
      scope: "self-fix",
      deliveryPlanning: "SKIP",
      unit: "bolt-pr-attestation",
      bolts: [{ bolt: "bolt-pr-attestation", units: ["bolt-pr-attestation"] }],
    });
    expect(outcome.projection.sourceDigest).toMatch(/^sha256:[0-9a-f]{64}$/);

    expect(projectEngineSingletonDeliveryBolt(project, null, new Set())).toEqual({ kind: "absent" });
    writeFileSync(
      join(intents, "intents.json"),
      `${JSON.stringify([{
        uuid: "019ffd00-0000-7000-8000-000000000001",
        slug: "bolt-pr-attestation",
        dirName: recordName,
        scope: "self-refactor",
        status: "in-flight",
      }])}\n`,
    );
    expect(projectEngineSingletonDeliveryBolt(project, state, new Set())).toEqual({ kind: "absent" });
  });

  test("handles missing plans compatibly and rejects unreadable or malformed plans", () => {
    const malformed = "## Bolt invalid/slug\n\n- **Units:** `unit-a`\n";
    const seed = (
      mode: "missing" | "unreadable" | "malformed",
      withAudit: boolean,
    ): { project: string; record: string } => {
      const project = mkdtempSync(join(tmpdir(), "amadeus-delivery-invalid-"));
      roots.push(project);
      const record = join(project, "amadeus", "spaces", "default", "intents", "invalid-deadbeef");
      const planning = join(record, "inception", "delivery-planning");
      mkdirSync(planning, { recursive: true });
      if (mode === "unreadable") {
        mkdirSync(join(planning, "bolt-plan.md"));
      } else if (mode === "malformed") {
        writeFileSync(join(planning, "bolt-plan.md"), malformed);
      }
      writeFileSync(join(record, "amadeus-state.md"), [
        "- **Scope**: feature",
        "- [S] units-generation — SKIP",
        "- [x] delivery-planning — EXECUTE",
        "",
      ].join("\n"));
      if (withAudit) {
        mkdirSync(join(record, "audit"), { recursive: true });
        writeFileSync(
          join(record, "audit", "fixture.jsonl"),
          `${JSON.stringify({
            schemaVersion: 1,
            seq: 1,
            cloneId: "deliveryfixture01",
            intentId: "invalid-deadbeef",
            timestamp: "2026-08-13T00:00:00Z",
            heading: "Workflow Start",
            event: "WORKFLOW_STARTED",
            fields: { Scope: "feature" },
          })}\n`,
        );
      }
      return { project, record };
    };

    const missing = seed("missing", false);
    expect(computeDeliveryBoltProjectionOutcome(
      missing.project,
      readFileSync(join(missing.record, "amadeus-state.md"), "utf-8"),
    )).toEqual({ kind: "absent" });
    const missingGraphPath = join(missing.record, "runtime-graph.json");
    writeFileSync(missingGraphPath, "stale\n");
    expect(compileRuntime({ projectDir: missing.project })).toEqual({ written: missingGraphPath });
    const missingGraph = JSON.parse(readFileSync(missingGraphPath, "utf-8"));
    expect(missingGraph.delivery_bolts).toBeUndefined();

    const invalidCases = [
      ["unreadable", "approved inception/delivery-planning/bolt-plan.md is unreadable"],
      ["malformed", "every Delivery Bolt must have a non-empty slug"],
    ] as const;
    for (const [mode, detail] of invalidCases) {
      const direct = seed(mode, false);
      expect(computeDeliveryBoltProjectionOutcome(
        direct.project,
        readFileSync(join(direct.record, "amadeus-state.md"), "utf-8"),
      )).toEqual({ kind: "invalid", detail });
      const graphPath = join(direct.record, "runtime-graph.json");
      writeFileSync(graphPath, "stale\n");
      expect(() => compileRuntime({ projectDir: direct.project })).toThrow(
        `Delivery Bolt authority is malformed (${detail})`,
      );
      expect(existsSync(graphPath)).toBe(false);
    }

    const audited = seed("malformed", true);
    writeFileSync(join(audited.record, "runtime-graph.json"), "stale\n");
    expect(() => compileRuntime({ projectDir: audited.project })).toThrow("approved delivery-planning/bolt-plan.md is malformed");
    expect(existsSync(join(audited.record, "runtime-graph.json"))).toBe(false);
  });

  test("full runtime compile carries a valid approved Delivery Bolt projection", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-delivery-valid-"));
    roots.push(project);
    const record = join(project, "amadeus", "spaces", "default", "intents", "valid-deadbeef");
    mkdirSync(join(record, "inception", "delivery-planning"), { recursive: true });
    mkdirSync(join(record, "audit"), { recursive: true });
    writeFileSync(join(record, "inception", "delivery-planning", "bolt-plan.md"), PLAN);
    writeFileSync(join(record, "amadeus-state.md"), [
      "- **Scope**: feature",
      "- [S] units-generation — SKIP",
      "- [x] delivery-planning — EXECUTE",
      "",
    ].join("\n"));
    writeFileSync(join(record, "audit", "fixture.jsonl"), `${JSON.stringify({
      schemaVersion: 1,
      seq: 1,
      cloneId: "deliveryfixture01",
      intentId: "valid-deadbeef",
      timestamp: "2026-08-13T00:00:00Z",
      heading: "Workflow Start",
      event: "WORKFLOW_STARTED",
      fields: { Scope: "feature" },
    })}\n`);

    compileRuntime({ projectDir: project });
    const graph = JSON.parse(readFileSync(join(record, "runtime-graph.json"), "utf-8"));
    expect(graph.delivery_bolts.authority).toBe("approved-plan");
  });

  test("authority resolver rejects unreadable, non-object, missing, unknown, and mismatched projections", () => {
    const record = mkdtempSync(join(tmpdir(), "amadeus-delivery-resolver-"));
    roots.push(record);
    const graphPath = join(record, "runtime-graph.json");
    writeFileSync(graphPath, "not-json\n");
    expect(resolveDeliveryBoltMembership(record, "delivery")).toMatchObject({ ok: false, code: "INVALID" });
    writeFileSync(graphPath, "[]\n");
    expect(resolveDeliveryBoltMembership(record, "delivery")).toMatchObject({ ok: false, code: "INVALID" });
    writeFileSync(graphPath, "{}\n");
    expect(resolveDeliveryBoltMembership(record, "delivery")).toMatchObject({ ok: false, code: "MISSING" });
    writeFileSync(graphPath, JSON.stringify({ delivery_bolts: { authority: "unknown" } }));
    expect(resolveDeliveryBoltMembership(record, "delivery")).toMatchObject({ ok: false, code: "INVALID" });

    const plan = "## Bolt delivery\n\n- **Units:** `unit-a`\n";
    const projected = projectDeliveryBoltPlan(plan);
    if (!projected.ok) throw new Error(projected.message);
    mkdirSync(join(record, "inception", "delivery-planning"), { recursive: true });
    writeFileSync(join(record, "inception", "delivery-planning", "bolt-plan.md"), plan);
    writeFileSync(graphPath, JSON.stringify({
      delivery_bolts: { ...projected.projection, bolts: [{ bolt: "other", units: ["unit-a"] }] },
    }));
    expect(resolveDeliveryBoltMembership(record, "other")).toMatchObject({ ok: false, code: "MISMATCH" });
    writeFileSync(graphPath, JSON.stringify({
      delivery_bolts: { ...projected.projection, bolts: [{ bolt: "delivery", units: ["unit-a", "unit-b"] }] },
    }));
    expect(resolveDeliveryBoltMembership(record, "delivery")).toMatchObject({ ok: false, code: "MISMATCH" });
  });
});
