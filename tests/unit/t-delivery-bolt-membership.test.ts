import { describe, expect, test } from "bun:test";
import {
  parseDeliveryBoltPlan,
  type DeliveryBoltProjection,
} from "../../packages/framework/core/tools/amadeus-delivery-bolts.ts";

const PLAN = `# Bolt Plan

## Bolt B2: Shared delivery

- **Units:** U2 \`unit-b\`, U1 \`unit-a\`

## Bolt B3: Independent delivery

- **Units:** U3 \`unit-c\`
`;

describe("Delivery Bolt membership projection", () => {
  test("keeps Delivery Bolt identity separate from DAG batches and sorts member Units", () => {
    const parsed = parseDeliveryBoltPlan(PLAN);
    expect(parsed).toEqual({
      ok: true,
      bolts: [
        { bolt: "B2", units: ["unit-a", "unit-b"] },
        { bolt: "B3", units: ["unit-c"] },
      ],
    });
  });

  test("rejects duplicate Bolt identities, duplicate members, and empty membership", () => {
    expect(parseDeliveryBoltPlan(`${PLAN}\n## Bolt B2\n\n- **Units:** \`unit-d\`\n`).ok).toBe(false);
    expect(parseDeliveryBoltPlan("## Bolt B1\n\n- **Units:** `unit-a`, `unit-a`\n").ok).toBe(false);
    expect(parseDeliveryBoltPlan("## Bolt B1\n\n- **Units:** `unit-a`\n\n## Bolt B2\n\n- **Units:** `unit-a`\n").ok).toBe(false);
    expect(parseDeliveryBoltPlan("## Bolt B1\n\n- **Units:** none\n").ok).toBe(false);
  });

  test("projection type carries the approved source digest used by resume", () => {
    const projection: DeliveryBoltProjection = {
      authority: "approved-plan",
      source: "inception/delivery-planning/bolt-plan.md",
      sourceDigest: `sha256:${"a".repeat(64)}`,
      bolts: [{ bolt: "B2", units: ["unit-a", "unit-b"] }],
    };
    expect(projection.bolts[0]?.units).toEqual(["unit-a", "unit-b"]);
  });

});
