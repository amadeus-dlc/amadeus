// t391 — FR-1 (#1838): every operation the coordinator can select at a boundary
// must be structurally applicable at that boundary, for both link states.
// A coordinator rule the policy suppresses is a silent loss of synchronization.
// covers: packages/framework/core/tools/amadeus-mirror-coordinator.ts
// covers: packages/framework/core/tools/amadeus-mirror-policy.ts
// size: small

import { describe, expect, test } from "bun:test";
import { operationForBoundary } from "../../packages/framework/core/tools/amadeus-mirror-coordinator.ts";
import {
  applicableMirrorOperations,
  decideMirrorAction,
  mirrorBoundaryKinds,
  mirrorEventIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import { EMPTY_MIRROR_STATE } from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import type {
  MirrorBoundary,
  MirrorOperation,
  MirrorStateSnapshot,
  RepositoryIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const NOW = "2026-08-01T00:00:00Z";
const UUID = "intent-1";
const INTENT_DIR = "amadeus/spaces/default/intents/demo";
const REPO: RepositoryIdentity = { owner: "acme", name: "app", canonical: "acme/app" };

// Every boundary kind, one representative instance each.
function boundaryOf(kind: MirrorBoundary["kind"]): MirrorBoundary {
  switch (kind) {
    case "phase-verified":
      return { kind, phase: "ideation", instance: "b-1" };
    case "parked":
      return { kind, stage: "intent-capture", instance: "b-1" };
    default:
      return { kind, instance: "b-1" } as MirrorBoundary;
  }
}

const UNLINKED: MirrorStateSnapshot = EMPTY_MIRROR_STATE;
const LINKED: MirrorStateSnapshot = {
  ...EMPTY_MIRROR_STATE,
  issueNumber: 7,
  provenance: {
    schema: 1,
    createIdentity: {
      schema: 1,
      intentUuid: UUID,
      intentDir: INTENT_DIR,
      repository: REPO,
      operationId: "op-first",
      preparedAt: NOW,
    },
    issueNumber: 7,
    createdAt: NOW,
  },
};

function selected(
  kind: MirrorBoundary["kind"],
  state: MirrorStateSnapshot,
): MirrorOperation | null {
  return operationForBoundary(
    {
      projectDir: "/project",
      statePath: "/state",
      intentUuid: UUID,
      intentDir: INTENT_DIR,
      repository: REPO,
      boundary: boundaryOf(kind),
      snapshot: {
        intentUuid: UUID,
        intentDir: INTENT_DIR,
        projectSummary: "Mirror lifecycle",
        lifecyclePhase: "IDEATION",
        currentStage: "intent-capture",
        status: "Running",
        registryStatus: "in-flight",
        updatedAt: NOW,
      },
    },
    state,
  );
}

describe("t391 boundary operation symmetry", () => {
  test("the applicability table covers every boundary kind exactly once", () => {
    const kinds = mirrorBoundaryKinds();
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(kinds.length).toBe(6);
    expect([...kinds].sort()).toEqual([
      "intent-capture-approved",
      "intent-initialized",
      "manual",
      "parked",
      "phase-verified",
      "workflow-completed",
    ]);
  });

  test.each([...mirrorBoundaryKinds()])(
    "%s: every selectable operation is applicable and not suppressed",
    (kind) => {
      for (const state of [UNLINKED, LINKED]) {
        const operation = selected(kind, state);
        if (operation === null) continue;
        expect(applicableMirrorOperations(kind)).toContain(operation);
        expect(
          decideMirrorAction({
            kind: "lifecycle",
            mode: "auto",
            event: mirrorEventIdentity(UUID, boundaryOf(kind), operation),
            state,
          }),
        ).toMatchObject({ kind: "execute", operation });
      }
    },
  );

  test.each([...mirrorBoundaryKinds()])(
    "%s: a linked mirror is never re-created",
    (kind) => {
      expect(selected(kind, LINKED)).not.toBe("create");
    },
  );
});
