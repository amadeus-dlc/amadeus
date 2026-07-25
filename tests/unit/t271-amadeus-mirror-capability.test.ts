// t271 — G2 mutation capability: WeakSet membership, binding, forgery refusal.
// covers: packages/framework/core/tools/amadeus-mirror-capability.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  createMirrorMutationPermit,
  type MirrorPermitBinding,
  validateMirrorMutationPermit,
} from "../../packages/framework/core/tools/amadeus-mirror-capability.ts";
import type {
  MirrorEventIdentity,
  MirrorMutationPermit,
  MirrorOperation,
  RepositoryIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const REPO: RepositoryIdentity = {
  owner: "amadeus-dlc",
  name: "amadeus",
  canonical: "amadeus-dlc/amadeus",
};

const OTHER_REPO: RepositoryIdentity = {
  owner: "amadeus-dlc",
  name: "other",
  canonical: "amadeus-dlc/other",
};

function event(operation: MirrorOperation): MirrorEventIdentity {
  return {
    intentUuid: "u-1",
    boundary: { kind: "manual", instance: "m-1" },
    operation,
  };
}

function binding(
  operation: MirrorOperation,
  issueNumber: number | null,
  repository: RepositoryIdentity = REPO,
): MirrorPermitBinding {
  return { event: event(operation), repository, operation, issueNumber };
}

describe("createMirrorMutationPermit / validateMirrorMutationPermit", () => {
  test("a minted create permit validates for its create expectation", () => {
    const permit = createMirrorMutationPermit(binding("create", null));
    expect(
      validateMirrorMutationPermit(permit, {
        operation: "create",
        repository: REPO,
        issueNumber: null,
      }),
    ).toBe(true);
  });

  test("a minted sync permit validates for the exact issue number", () => {
    const permit = createMirrorMutationPermit(binding("sync", 7));
    expect(
      validateMirrorMutationPermit(permit, {
        operation: "sync",
        repository: REPO,
        issueNumber: 7,
      }),
    ).toBe(true);
  });

  test("rejects an operation mismatch", () => {
    const permit = createMirrorMutationPermit(binding("close", 7));
    expect(
      validateMirrorMutationPermit(permit, {
        operation: "sync",
        repository: REPO,
        issueNumber: 7,
      }),
    ).toBe(false);
  });

  test("rejects a repository canonical mismatch", () => {
    const permit = createMirrorMutationPermit(binding("close", 7));
    expect(
      validateMirrorMutationPermit(permit, {
        operation: "close",
        repository: OTHER_REPO,
        issueNumber: 7,
      }),
    ).toBe(false);
  });

  test("rejects an issue-number mismatch on close", () => {
    const permit = createMirrorMutationPermit(binding("close", 7));
    expect(
      validateMirrorMutationPermit(permit, {
        operation: "close",
        repository: REPO,
        issueNumber: 8,
      }),
    ).toBe(false);
  });

  test("rejects a create permit that carries an issue number", () => {
    const permit = createMirrorMutationPermit(binding("create", 5));
    expect(
      validateMirrorMutationPermit(permit, {
        operation: "create",
        repository: REPO,
        issueNumber: null,
      }),
    ).toBe(false);
  });

  test("rejects a forged object-literal permit (not a WeakSet member)", () => {
    const forged = {
      event: event("create"),
      repository: REPO,
      operation: "create",
      issueNumber: null,
    } as unknown as MirrorMutationPermit;
    expect(
      validateMirrorMutationPermit(forged, {
        operation: "create",
        repository: REPO,
        issueNumber: null,
      }),
    ).toBe(false);
  });

  test("rejects a frozen forged clone of a real permit's fields", () => {
    const real = createMirrorMutationPermit(binding("create", null));
    const clone = Object.freeze({
      ...(real as unknown as Record<string, unknown>),
    }) as unknown as MirrorMutationPermit;
    expect(
      validateMirrorMutationPermit(clone, {
        operation: "create",
        repository: REPO,
        issueNumber: null,
      }),
    ).toBe(false);
  });

  test("a minted permit is frozen", () => {
    const permit = createMirrorMutationPermit(binding("create", null));
    expect(Object.isFrozen(permit)).toBe(true);
  });
});
