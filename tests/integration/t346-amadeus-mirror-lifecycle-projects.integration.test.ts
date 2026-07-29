// t346 — the Project sync wired into ordinary lifecycle boundaries, over a
// real record on disk: the per-boundary behaviour table and the two parked
// paths that issue no field mutation at all.
// covers: packages/framework/core/tools/amadeus-mirror-{coordinator,lifecycle}.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import {
  BOARD_A,
  ProjectGateway,
  canonical,
  createProjectFixture,
  drive,
  type FixtureOptions,
  fieldMutations,
  linkedState,
  markerBody,
  memberItem,
  rowFor,
} from "./t346-amadeus-mirror-lifecycle-projects.fixture.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function fixture(options: FixtureOptions = {}) {
  const result = createProjectFixture(options);
  roots.push(result.root);
  return result;
}

describe("t346 boundary behaviour table", () => {
  test("intent-capture-approved creates the Issue and joins the board at the current phase", async () => {
    const fx = fixture();
    const gateway = new ProjectGateway(markerBody());

    await drive(fx, gateway, {
      kind: "intent-capture-approved",
      instance: "capture-1",
    });

    expect(gateway.history).toContain("create");
    expect(gateway.history).toContain(`add:${canonical(BOARD_A)}`);
    expect(rowFor(fx.state(), BOARD_A)).toMatchObject({
      state: "synced",
      lastAppliedStatus: "Ideation",
    });
  });

  test("phase-verified reads the record's Lifecycle Phase, not the boundary's argument", async () => {
    const fx = fixture({
      lifecyclePhase: "CONSTRUCTION",
      state: linkedState(),
    });
    const gateway = new ProjectGateway(markerBody());

    // The boundary carries the phase that just *ended*; the column must follow
    // the phase the record is in now.
    await drive(fx, gateway, {
      kind: "phase-verified",
      phase: "inception",
      instance: "phase-1",
    });

    expect(rowFor(fx.state(), BOARD_A)?.lastAppliedStatus).toBe(
      "Construction",
    );
  });

  test("a phase sync never writes the done column", async () => {
    const fx = fixture({
      lifecyclePhase: "OPERATION",
      state: linkedState(),
    });
    const gateway = new ProjectGateway(markerBody());

    await drive(fx, gateway, {
      kind: "phase-verified",
      phase: "construction",
      instance: "phase-2",
    });

    expect(rowFor(fx.state(), BOARD_A)?.lastAppliedStatus).toBe("Operation");
    expect(rowFor(fx.state(), BOARD_A)?.lastAppliedStatus).not.toBe("Done");
  });

  test("workflow-completed drives the board to done and then closes the Issue", async () => {
    const fx = fixture({
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: linkedState(),
    });
    const gateway = new ProjectGateway(markerBody());

    await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-1",
    });

    expect(rowFor(fx.state(), BOARD_A)?.lastAppliedStatus).toBe("Done");
    expect(gateway.history).toContain("close");
    expect(gateway.issue.state).toBe("CLOSED");
  });
});

describe("t346 parked boundaries issue no field mutation", () => {
  test("the parked boundary syncs the Issue body and leaves the column alone", async () => {
    const fx = fixture({
      lifecyclePhase: "INCEPTION",
      state: linkedState(),
    });
    const gateway = new ProjectGateway(markerBody());
    gateway.items = [memberItem(BOARD_A, "Ideation")];

    await drive(fx, gateway, {
      kind: "parked",
      stage: "scope-definition",
      instance: "park-1",
    });

    expect(fieldMutations(gateway)).toEqual([]);
    expect(gateway.history).toContain("edit");
    // The row is still recorded as synced, carrying the column the human left.
    expect(rowFor(fx.state(), BOARD_A)).toMatchObject({
      state: "synced",
      lastAppliedStatus: "Ideation",
    });
  });

  test("a manual sync while the Intent is parked also leaves the column alone", async () => {
    const fx = fixture({
      lifecyclePhase: "INCEPTION",
      registryStatus: "parked",
      state: linkedState(),
    });
    const gateway = new ProjectGateway(markerBody());
    gateway.items = [memberItem(BOARD_A, "Ideation")];

    await drive(
      fx,
      gateway,
      { kind: "manual", instance: "manual-1" },
      {
        operation: "sync",
        invocationId: "manual-1",
      },
    );

    expect(fieldMutations(gateway)).toEqual([]);
    expect(rowFor(fx.state(), BOARD_A)?.lastAppliedStatus).toBe("Ideation");
  });
});
