// covers: file:packages/framework/core/tools/amadeus-delivery-bolts.ts
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  parseDeliveryBoltPlan,
  projectDeliveryBoltPlan,
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

  test("sorts Bolt slugs by deterministic UTF-16 code-unit order", () => {
    expect(parseDeliveryBoltPlan([
      "## Bolt a",
      "",
      "- **Units:** `unit-a`",
      "",
      "## Bolt B",
      "",
      "- **Units:** `unit-b`",
      "",
    ].join("\n"))).toEqual({
      ok: true,
      bolts: [
        { bolt: "B", units: ["unit-b"] },
        { bolt: "a", units: ["unit-a"] },
      ],
    });
  });

  test("rejects duplicate Bolt identities, duplicate members, and empty membership", () => {
    expect(parseDeliveryBoltPlan(`${PLAN}\n## Bolt B2\n\n- **Units:** \`unit-d\`\n`).ok).toBe(false);
    expect(parseDeliveryBoltPlan("## Bolt B1\n\n- **Units:** `unit-a`, `unit-a`\n").ok).toBe(false);
    expect(parseDeliveryBoltPlan("## Bolt B1\n\n- **Units:** `unit-a`\n\n## Bolt B2\n\n- **Units:** `unit-a`\n").ok).toBe(false);
    expect(parseDeliveryBoltPlan("## Bolt B1\n\n- **Units:** none\n").ok).toBe(false);
    expect(parseDeliveryBoltPlan("## Bolt invalid/slug\n\n- **Units:** `unit-a`\n")).toEqual({
      ok: false,
      message: "every Delivery Bolt must have a non-empty slug",
    });
    expect(parseDeliveryBoltPlan("# Delivery Plan\n")).toEqual({
      ok: false,
      message: "the Delivery Plan contains no Delivery Bolt headings",
    });
    expect(projectDeliveryBoltPlan("# Delivery Plan\n").ok).toBe(false);
  });

  test("binds the projection source digest to the exact approved plan bytes", () => {
    const projected = projectDeliveryBoltPlan(PLAN);
    expect(projected.ok).toBe(true);
    if (!projected.ok) throw new Error(projected.message);
    expect(projected.projection.sourceDigest).toBe(
      `sha256:${createHash("sha256").update(PLAN).digest("hex")}`,
    );
    expect(projected.projection.bolts[0]?.units).toEqual(["unit-a", "unit-b"]);
  });
});
