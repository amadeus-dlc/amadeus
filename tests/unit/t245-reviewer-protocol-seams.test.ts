// covers: file:packages/framework/core/tools/amadeus-reviewer.ts
// size: small

import { describe, expect, test } from "bun:test";
import * as reviewer from "../../packages/framework/core/tools/amadeus-reviewer.ts";

describe("t245 reviewer protocol public seams", () => {
  test("exports only the two approved public functions", () => {
    expect(Object.keys(reviewer).sort()).toEqual([
      "reviewerReadScope",
      "runtimeReviewIdentity",
    ]);
  });

  test("builds the declared current-unit review scope without a missing optional artifact", () => {
    const scope = reviewer.reviewerReadScope(
      {
        unit: "reviewer-protocol",
        stageFile: ".codex/amadeus-common/stages/construction/code-generation.md",
        produces: [
          {
            path: "amadeus/spaces/default/intents/example/construction/reviewer-protocol/code-generation/code-summary.md",
            present: true,
          },
          {
            path: "amadeus/spaces/default/intents/example/construction/reviewer-protocol/code-generation/optional.md",
            present: false,
            optional: true,
          },
        ],
      },
      [
        {
          path: "amadeus/spaces/default/intents/example/construction/reviewer-protocol/functional-design/business-rules.md",
          present: true,
        },
      ],
    );

    expect(scope).toEqual({
      unit: "reviewer-protocol",
      paths: [
        ".codex/amadeus-common/stages/construction/code-generation.md",
        "amadeus/spaces/default/intents/example/construction/reviewer-protocol/code-generation/code-summary.md",
        "amadeus/spaces/default/intents/example/construction/reviewer-protocol/functional-design/business-rules.md",
      ],
    });
  });

  test("deduplicates paths and omits the unit field when the scope has no unit", () => {
    expect(reviewer.reviewerReadScope(
      {
        stageFile: "stage.md",
        produces: [{ path: "artifact.md", present: true }],
      },
      [
        { path: "artifact.md", present: true },
        { path: "contract.md", present: true },
      ],
    )).toEqual({ paths: ["stage.md", "artifact.md", "contract.md"] });
  });

  test("rejects missing required artifacts and consumes", () => {
    expect(() => reviewer.reviewerReadScope(
      { stageFile: "stage.md", produces: [{ path: "required.md", present: false }] },
      [],
    )).toThrow("required review artifact is missing");
    expect(() => reviewer.reviewerReadScope(
      { stageFile: "stage.md", produces: [] },
      [{ path: "contract.md", present: false }],
    )).toThrow("declared consume is missing");
  });

  test("rejects invalid, forbidden, and cross-unit paths", () => {
    for (const path of ["", "two\nlines", "memory.md", "plan.md", "reasoning-notes.md"]) {
      expect(() => reviewer.reviewerReadScope(
        { stageFile: path, produces: [] },
        [],
      ), path).toThrow();
    }
    expect(() => reviewer.reviewerReadScope(
      {
        unit: "reviewer-protocol",
        stageFile: "stage.md",
        produces: [{
          path: "construction/sibling/code-generation/code-summary.md",
          present: true,
        }],
      },
      [],
    )).toThrow("artifact is outside current unit");
  });

  test("accepts only a concrete checker persona and a single ISO-8601 UTC line", () => {
    expect(
      reviewer.runtimeReviewIdentity(
        "amadeus-architecture-reviewer-agent",
        "2026-07-21T09:30:00Z",
      ),
    ).toEqual({
      reviewer: "amadeus-architecture-reviewer-agent",
      date: "2026-07-21T09:30:00Z",
    });
    expect(
      reviewer.runtimeReviewIdentity(
        "amadeus-product-lead-agent",
        "2026-07-21T09:30:00Z",
      ),
    ).toEqual({
      reviewer: "amadeus-product-lead-agent",
      date: "2026-07-21T09:30:00Z",
    });

    expect(() => reviewer.runtimeReviewIdentity("", "2026-07-21T09:30:00Z")).toThrow();
    expect(() =>
      reviewer.runtimeReviewIdentity(
        "amadeus-architecture-reviewer-agent",
        "2026-07-21T09:30:00Z\nsecond-line",
      ),
    ).toThrow();
    expect(() =>
      reviewer.runtimeReviewIdentity(
        "amadeus-architecture-reviewer-agent",
        "2026-07-21",
      ),
    ).toThrow();
    expect(() =>
      reviewer.runtimeReviewIdentity(
        "amadeus-architecture-reviewer-agent",
        "2026-02-30T09:30:00Z",
      ),
    ).toThrow();
  });

});
