// covers: file:packages/framework/core/tools/amadeus-runtime.ts

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeDeliveryBoltProjectionOutcome } from "../../packages/framework/core/tools/amadeus-runtime.ts";

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

describe("Delivery Bolt runtime membership projection", () => {
  test("projects only a completed Delivery Planning artifact", () => {
    const project = mkdtempSync(join(tmpdir(), "amadeus-delivery-bolts-"));
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
  });
});
