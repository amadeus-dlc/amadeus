// t277 — S5/S6 marker codec + ownership verify + candidate classification.
// covers: packages/framework/core/tools/amadeus-mirror-provenance.ts
// size: small

import { describe, expect, test } from "bun:test";
import type {
  MirrorCreateIdentity,
  MirrorProvenance,
  RemoteMirrorIssue,
  RepositoryIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
import {
  classifyCandidates,
  parseMirrorMarker,
  renderMirrorMarker,
  verifyOwnership,
} from "../../packages/framework/core/tools/amadeus-mirror-provenance.ts";

const REPO: RepositoryIdentity = { owner: "acme", name: "app", canonical: "acme/app" };
const OTHER: RepositoryIdentity = { owner: "evil", name: "fork", canonical: "evil/fork" };

const IDENTITY: MirrorCreateIdentity = {
  schema: 1,
  intentUuid: "u-1",
  intentDir: "amadeus/spaces/default/intents/x",
  repository: REPO,
  operationId: "op-1",
  preparedAt: "2026-07-24T00:00:00Z",
};

const PROVENANCE: MirrorProvenance = {
  schema: 1,
  createIdentity: IDENTITY,
  issueNumber: 7,
  createdAt: "2026-07-24T00:00:00Z",
};

function issue(overrides: Partial<RemoteMirrorIssue> = {}): RemoteMirrorIssue {
  return {
    repository: REPO,
    number: 7,
    title: "Mirror",
    body: `intro\n${renderMirrorMarker(IDENTITY)}\ntail`,
    state: "OPEN",
    ...overrides,
  };
}

describe("marker codec", () => {
  test("render -> parse round-trips the create identity", () => {
    const parsed = parseMirrorMarker(renderMirrorMarker(IDENTITY));
    expect(parsed.kind).toBe("parsed");
    if (parsed.kind !== "parsed") return;
    expect(parsed.identity).toEqual(IDENTITY);
  });

  test("no marker -> missing", () => {
    expect(parseMirrorMarker("just human text").kind).toBe("missing");
  });

  test("two markers -> invalid", () => {
    const m = renderMirrorMarker(IDENTITY);
    expect(parseMirrorMarker(`${m}\n${m}`).kind).toBe("invalid");
  });

  test("well-formed envelope but non-JSON payload -> invalid", () => {
    // "eHl6" is base64url for "xyz", which is not a JSON object.
    expect(parseMirrorMarker("<!-- amadeus-intent-mirror:v1 eHl6 -->").kind).toBe("invalid");
  });
});

describe("ownership verification", () => {
  test("all matching -> verified", () => {
    expect(verifyOwnership({ remoteIssue: issue(), localProvenance: PROVENANCE }).kind).toBe("verified");
  });

  test("repository mismatch -> wrong-repository", () => {
    expect(
      verifyOwnership({ remoteIssue: issue({ repository: OTHER }), localProvenance: PROVENANCE }).kind,
    ).toBe("wrong-repository");
  });

  test("no marker in body -> missing-marker", () => {
    expect(
      verifyOwnership({ remoteIssue: issue({ body: "no marker here" }), localProvenance: PROVENANCE }).kind,
    ).toBe("missing-marker");
  });

  test("issue number differs from provenance -> mismatch", () => {
    expect(
      verifyOwnership({ remoteIssue: issue({ number: 999 }), localProvenance: PROVENANCE }).kind,
    ).toBe("mismatch");
  });
});

describe("candidate classification (order-independent, fail-closed)", () => {
  const base = { localCreateIdentity: IDENTITY, mismatchCandidateCount: 0, now: "2026-07-24T00:00:00Z" };

  test("fresh prepared + 0 verified -> create-new", () => {
    expect(classifyCandidates({ ...base, localState: "fresh-prepared", verifiedCandidates: [] }).kind).toBe("create-new");
  });

  test("fresh prepared + 1 verified -> adopt with a built provenance", () => {
    const r = classifyCandidates({ ...base, localState: "fresh-prepared", verifiedCandidates: [issue()] });
    expect(r.kind).toBe("adopt");
    if (r.kind === "adopt") expect(r.provenance.issueNumber).toBe(7);
  });

  test("attempted + 0 verified -> zero-after-attempt (never a 2nd issue)", () => {
    const r = classifyCandidates({ ...base, localState: "attempted-or-unknown", verifiedCandidates: [] });
    expect(r).toEqual({ kind: "safety-blocked", reason: "zero-after-attempt" });
  });

  test("2+ verified -> ambiguous regardless of input order", () => {
    const a = issue({ number: 7 });
    const b = issue({ number: 11 });
    const r1 = classifyCandidates({ ...base, localState: "fresh-prepared", verifiedCandidates: [a, b] });
    const r2 = classifyCandidates({ ...base, localState: "fresh-prepared", verifiedCandidates: [b, a] });
    expect(r1).toEqual({ kind: "safety-blocked", reason: "ambiguous" });
    expect(r2).toEqual({ kind: "safety-blocked", reason: "ambiguous" });
  });

  test("a candidate with a mismatching marker -> mismatch", () => {
    const r = classifyCandidates({ ...base, localState: "fresh-prepared", verifiedCandidates: [], mismatchCandidateCount: 1 });
    expect(r).toEqual({ kind: "safety-blocked", reason: "mismatch" });
  });

  test("provenance-present + 1 verified -> adopt convergence with existing provenance", () => {
    const r = classifyCandidates({ ...base, localState: "provenance-present", verifiedCandidates: [issue()], provenance: PROVENANCE });
    expect(r.kind).toBe("adopt");
    if (r.kind === "adopt") expect(r.provenance).toEqual(PROVENANCE);
  });
});
