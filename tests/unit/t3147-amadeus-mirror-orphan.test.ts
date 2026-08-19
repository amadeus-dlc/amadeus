// t3147 — orphan Intent Mirror classification (#3147).
// covers: packages/framework/core/tools/amadeus-mirror-orphan.ts
// size: small

import { describe, expect, test } from "bun:test";
import { renderMirrorMarker } from "../../packages/framework/core/tools/amadeus-mirror-provenance.ts";
import type {
  MirrorCreateIdentity,
  RepositoryIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
import {
  classifyOrphanCandidate,
  renderOrphanObsoleteComment,
  type OrphanMirrorMarkerIssue,
} from "../../packages/framework/core/tools/amadeus-mirror-orphan.ts";

const REPO: RepositoryIdentity = { owner: "acme", name: "app", canonical: "acme/app" };
const OTHER_REPO: RepositoryIdentity = { owner: "evil", name: "fork", canonical: "evil/fork" };

const IDENTITY: MirrorCreateIdentity = {
  schema: 1,
  intentUuid: "01a003a0-ec70-7656-95a0-767387f6b65c",
  intentDir: "260815-rfc-autonomy-modes",
  repository: REPO,
  operationId: "op-1",
  preparedAt: "2026-08-15T04:14:42.787Z",
};

function issue(overrides: Partial<OrphanMirrorMarkerIssue> = {}): OrphanMirrorMarkerIssue {
  return {
    repository: REPO,
    number: 3095,
    state: "OPEN",
    body: `intro\n${renderMirrorMarker(IDENTITY)}\ntail`,
    ...overrides,
  };
}

describe("classifyOrphanCandidate", () => {
  test("flags an open, correct-repository issue whose marker UUID is absent from the registry", () => {
    const verdict = classifyOrphanCandidate({
      issue: issue(),
      repository: REPO,
      registryUuids: new Set(["some-other-uuid"]),
    });
    expect(verdict).toEqual({
      kind: "orphan-candidate",
      issueNumber: 3095,
      intentUuid: IDENTITY.intentUuid,
      intentDir: IDENTITY.intentDir,
      preparedAt: IDENTITY.preparedAt,
    });
  });

  test("does NOT flag an issue whose marker UUID is present in the registry (false-positive guard)", () => {
    const verdict = classifyOrphanCandidate({
      issue: issue(),
      repository: REPO,
      registryUuids: new Set([IDENTITY.intentUuid]),
    });
    expect(verdict).toEqual({
      kind: "not-orphan",
      issueNumber: 3095,
      reason: "uuid-present-in-registry",
    });
  });

  test("does NOT flag a CLOSED issue", () => {
    const verdict = classifyOrphanCandidate({
      issue: issue({ state: "CLOSED" }),
      repository: REPO,
      registryUuids: new Set(),
    });
    expect(verdict).toEqual({
      kind: "not-orphan",
      issueNumber: 3095,
      reason: "not-open",
    });
  });

  test("does NOT flag an issue from a different repository (fail-closed anchor)", () => {
    const verdict = classifyOrphanCandidate({
      issue: issue(),
      repository: OTHER_REPO,
      registryUuids: new Set(),
    });
    expect(verdict).toEqual({
      kind: "not-orphan",
      issueNumber: 3095,
      reason: "wrong-repository",
    });
  });

  test("does NOT flag an issue with no mirror marker", () => {
    const verdict = classifyOrphanCandidate({
      issue: issue({ body: "just a regular issue, no marker here" }),
      repository: REPO,
      registryUuids: new Set(),
    });
    expect(verdict).toEqual({
      kind: "not-orphan",
      issueNumber: 3095,
      reason: "no-marker",
    });
  });

  test("does NOT flag an issue with a corrupted marker (fail-closed, not fail-open)", () => {
    const verdict = classifyOrphanCandidate({
      // Valid base64url charset (so the marker regex matches at all) but the
      // decoded payload is not JSON, which is what makes it "invalid" rather
      // than merely "missing".
      issue: issue({ body: "<!-- amadeus-intent-mirror:v1 QUJD -->" }),
      repository: REPO,
      registryUuids: new Set(),
    });
    expect(verdict).toEqual({
      kind: "not-orphan",
      issueNumber: 3095,
      reason: "invalid-marker",
    });
  });
});

describe("renderOrphanObsoleteComment", () => {
  test("names the intent UUID, record dir, and the registry-check timestamp", () => {
    const comment = renderOrphanObsoleteComment({
      intentUuid: IDENTITY.intentUuid,
      intentDir: IDENTITY.intentDir,
      preparedAt: IDENTITY.preparedAt,
      checkedAt: "2026-08-19T00:00:00Z",
    });
    expect(comment).toContain(IDENTITY.intentUuid);
    expect(comment).toContain(IDENTITY.intentDir);
    expect(comment).toContain("2026-08-19T00:00:00Z");
    expect(comment.toLowerCase()).toContain("obsolete");
  });
});
