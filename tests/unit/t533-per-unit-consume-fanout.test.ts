// covers: file:packages/framework/core/tools/amadeus-per-unit-consume-fanout.ts
// size: small

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractPerUnitConsumerEdges,
  PerUnitConsumeFanoutError,
  resolvePerUnitConsumeFanout,
  type PerUnitConsumeGraphStage,
} from "../../packages/framework/core/tools/amadeus-per-unit-consume-fanout.ts";

const realGraph = JSON.parse(readFileSync(
  join(import.meta.dir, "../../.codex/tools/data/stage-graph.json"),
  "utf8",
)) as PerUnitConsumeGraphStage[];

const graph: PerUnitConsumeGraphStage[] = [
  {
    slug: "code-generation",
    for_each: "unit-of-work",
    produces: ["code-generation-plan", "code-summary"],
    consumes: [],
  },
  {
    slug: "build-and-test",
    produces: [],
    consumes: [
      { artifact: "code-generation-plan", required: true },
      { artifact: "code-summary", required: true },
    ],
  },
];

describe("t533 per-unit consume fan-out", () => {
  test("expands succeeded Units in declaration then artifact order", () => {
    expect(resolvePerUnitConsumeFanout({
      consumer: "build-and-test",
      graph,
      declaredUnits: ["unit-z", "unit-a"],
      outcomes: [
        { unit: "unit-a", outcome: "succeeded" },
        { unit: "unit-z", outcome: "succeeded" },
      ],
      templates: [
        {
          artifact: "code-generation-plan",
          path: "amadeus-docs/construction/{unit-name}/code-generation/code-generation-plan.md",
        },
        {
          artifact: "code-summary",
          path: "amadeus-docs/construction/{unit-name}/code-generation/code-summary.md",
        },
      ],
      validateInventory: false,
    })).toEqual([
      {
        unit: "unit-z",
        artifact: "code-generation-plan",
        path: "amadeus-docs/construction/unit-z/code-generation/code-generation-plan.md",
      },
      {
        unit: "unit-z",
        artifact: "code-summary",
        path: "amadeus-docs/construction/unit-z/code-generation/code-summary.md",
      },
      {
        unit: "unit-a",
        artifact: "code-generation-plan",
        path: "amadeus-docs/construction/unit-a/code-generation/code-generation-plan.md",
      },
      {
        unit: "unit-a",
        artifact: "code-summary",
        path: "amadeus-docs/construction/unit-a/code-generation/code-summary.md",
      },
    ]);
  });

  test("deduplicates normalized concrete paths by first occurrence", () => {
    expect(resolvePerUnitConsumeFanout({
      consumer: "build-and-test",
      graph,
      declaredUnits: ["unit-a"],
      outcomes: [{ unit: "unit-a", outcome: "succeeded" }],
      templates: [
        {
          artifact: "code-summary",
          path: "amadeus-docs/construction/{unit-name}/code-generation/code-summary.md",
        },
        {
          artifact: "duplicate-summary",
          path: "amadeus-docs/construction/{unit-name}/code-generation/ignored/../code-summary.md",
        },
      ],
      validateInventory: false,
    })).toEqual([{
      unit: "unit-a",
      artifact: "code-summary",
      path: "amadeus-docs/construction/unit-a/code-generation/code-summary.md",
    }]);
  });

  test("fails closed when a declared producer Unit failed", () => {
    expect(() => resolvePerUnitConsumeFanout({
      consumer: "build-and-test",
      graph,
      declaredUnits: ["unit-a", "unit-b"],
      outcomes: [
        { unit: "unit-a", outcome: "succeeded" },
        { unit: "unit-b", outcome: "failed" },
      ],
      templates: [{
        artifact: "code-summary",
        path: "amadeus-docs/construction/{unit-name}/code-generation/code-summary.md",
      }],
      validateInventory: false,
    })).toThrow(new PerUnitConsumeFanoutError("producer-outcome-failed", ["unit-b"]));
  });

  test("fails closed for pending, unknown, or ambiguous producer outcomes", () => {
    const codeFor = (outcomes: Array<{ unit: string; outcome: string }>) => {
      try {
        resolvePerUnitConsumeFanout({
          consumer: "build-and-test",
          graph,
          declaredUnits: ["unit-a"],
          outcomes,
          templates: [{
            artifact: "code-summary",
            path: "amadeus-docs/construction/{unit-name}/code-generation/code-summary.md",
          }],
          validateInventory: false,
        });
        return "not-thrown";
      } catch (error) {
        return error instanceof PerUnitConsumeFanoutError ? error.code : "wrong-error";
      }
    };

    expect([
      codeFor([]),
      codeFor([{ unit: "unit-a", outcome: "pending" }]),
      codeFor([{ unit: "unit-a", outcome: "unknown" }]),
      codeFor([{ unit: "unit-a", outcome: "ambiguous" }]),
      codeFor([{ unit: "unit-a", outcome: "not-a-public-outcome" }]),
      codeFor([
        { unit: "unit-a", outcome: "succeeded" },
        { unit: "unit-a", outcome: "cancelled" },
      ]),
    ]).toEqual([
      "producer-outcome-pending",
      "producer-outcome-pending",
      "producer-outcome-unknown",
      "producer-outcome-ambiguous",
      "producer-outcome-unknown",
      "producer-outcome-ambiguous",
    ]);
  });

  test("requires declared and succeeded producer populations while excluding cancelled Units", () => {
    const input = {
      consumer: "build-and-test",
      graph,
      templates: [{
        artifact: "code-summary",
        path: "amadeus-docs/construction/{unit-name}/code-generation/code-summary.md",
      }],
      validateInventory: false,
    } as const;
    const codeFor = (
      declaredUnits: readonly string[],
      outcomes: readonly { unit: string; outcome: string }[],
    ) => {
      try {
        return resolvePerUnitConsumeFanout({ ...input, declaredUnits, outcomes });
      } catch (error) {
        return error instanceof PerUnitConsumeFanoutError ? error.code : "wrong-error";
      }
    };

    expect(codeFor([], [])).toBe("declared-unit-population-empty");
    expect(codeFor(["unit-c"], [{ unit: "unit-c", outcome: "cancelled" }]))
      .toBe("succeeded-producer-population-empty");
    expect(codeFor(
      ["unit-c", "unit-a"],
      [
        { unit: "unit-c", outcome: "cancelled" },
        { unit: "unit-a", outcome: "succeeded" },
      ],
    )).toEqual([{
      unit: "unit-a",
      artifact: "code-summary",
      path: "amadeus-docs/construction/unit-a/code-generation/code-summary.md",
    }]);
  });

  test("rejects a concrete path that retains the Unit placeholder", () => {
    expect(() => resolvePerUnitConsumeFanout({
      consumer: "build-and-test",
      graph,
      declaredUnits: ["broken-{unit-name}"],
      outcomes: [{ unit: "broken-{unit-name}", outcome: "succeeded" }],
      templates: [{
        artifact: "code-summary",
        path: "amadeus-docs/construction/{unit-name}/code-generation/code-summary.md",
      }],
      validateInventory: false,
    })).toThrow(new PerUnitConsumeFanoutError(
      "unresolved-unit-placeholder",
      ["broken-{unit-name}"],
    ));
  });

  test("extracts the pinned 7-consumer 19-edge inventory from graph metadata", () => {
    expect(extractPerUnitConsumerEdges(realGraph).map((edge) => edge.join(":")).sort()).toEqual([
      ["build-and-test", "code-generation-plan", "code-generation"],
      ["build-and-test", "code-summary", "code-generation"],
      ["ci-pipeline", "code-summary", "code-generation"],
      ["performance-validation", "performance-requirements", "nfr-requirements"],
      ["performance-validation", "scalability-requirements", "nfr-requirements"],
      ["performance-validation", "performance-design", "nfr-design"],
      ["performance-validation", "scalability-design", "nfr-design"],
      ["observability-setup", "performance-design", "nfr-design"],
      ["observability-setup", "security-design", "nfr-design"],
      ["observability-setup", "reliability-design", "nfr-design"],
      ["observability-setup", "monitoring-design", "infrastructure-design"],
      ["observability-setup", "infrastructure-services", "infrastructure-design"],
      ["incident-response", "reliability-design", "nfr-design"],
      ["incident-response", "security-design", "nfr-design"],
      ["incident-response", "deployment-architecture", "infrastructure-design"],
      ["deployment-pipeline", "deployment-architecture", "infrastructure-design"],
      ["deployment-pipeline", "cicd-pipeline", "infrastructure-design"],
      ["environment-provisioning", "deployment-architecture", "infrastructure-design"],
      ["environment-provisioning", "infrastructure-services", "infrastructure-design"],
    ].map((edge) => edge.join(":")).sort());
  });

  test("fails closed with expected and actual inventories when graph edges drift", () => {
    const drifted = realGraph.map((stage) =>
      stage.slug === "build-and-test" ? { ...stage, consumes: [] } : stage
    );
    let thrown: unknown;
    try {
      resolvePerUnitConsumeFanout({
        consumer: "ci-pipeline",
        graph: drifted,
        declaredUnits: ["unit-a"],
        outcomes: [{ unit: "unit-a", outcome: "succeeded" }],
        templates: [{
          artifact: "code-summary",
          path: "amadeus-docs/construction/{unit-name}/code-generation/code-summary.md",
        }],
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(PerUnitConsumeFanoutError);
    const error = thrown as PerUnitConsumeFanoutError;
    expect({
      code: error.code,
      expectedConsumers: error.expectedConsumers,
      actualConsumers: error.actualConsumers,
      expectedEdgeCount: error.expectedEdges?.length,
      actualEdgeCount: error.actualEdges?.length,
    }).toEqual({
      code: "consumer-edge-inventory-mismatch",
      expectedConsumers: [
        "build-and-test",
        "ci-pipeline",
        "deployment-pipeline",
        "environment-provisioning",
        "incident-response",
        "observability-setup",
        "performance-validation",
      ],
      actualConsumers: [
        "ci-pipeline",
        "deployment-pipeline",
        "environment-provisioning",
        "incident-response",
        "observability-setup",
        "performance-validation",
      ],
      expectedEdgeCount: 19,
      actualEdgeCount: 17,
    });
  });
});
