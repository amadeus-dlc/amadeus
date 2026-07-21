import { describe, expect, test } from "bun:test";
import { canonicalIdentity } from "../../scripts/formal-verif/canonical.ts";
import * as directRegistry from "../../scripts/formal-verif/fixture-registry.ts";
import { authorizeDisclosure, ledgerStateIdentity, validateManifestPromotionPermissionBinding, type ManifestPromotionPermission, type ManifestPromotionPermissionBody } from "../../scripts/formal-verif/fixture-registry.ts";
import { foldLedger } from "../../scripts/formal-verif/provenance.ts";
import { completeFixtureLedger, sealedFixtureSet, sevenFixtureUniverse } from "../formal-verif/support/sealed-fixture-registry-harness.ts";

const permissionFor = (universe = sevenFixtureUniverse(), ledger = completeFixtureLedger()): { universe: ReturnType<typeof sevenFixtureUniverse>; ledger: ReturnType<typeof completeFixtureLedger>; permission: ManifestPromotionPermission } => {
  const body: ManifestPromotionPermissionBody = { kind: "ManifestPromotionPermission", stateIdentity: ledgerStateIdentity(ledger), ledgerHead: ledger.head!, tFreezeEventId: "t-freeze", sFreezeEventId: "s-freeze", skeletonPassEventId: "skeleton-pass", dCount: universe.dCount, universeIdentity: universe.universeIdentity, nonce: "00000000-0000-4000-8000-000000000001" };
  return { universe, ledger, permission: { ...body, permissionIdentity: canonicalIdentity(body, "amadeus.formal-verif.manifest-promotion-permission.v1").sha256 } };
};

describe("formal verification sealed fixture registry policy", () => {
  test("validates the structural binding to refolded events, both freezes, skeleton, D-COUNT, and nonce", () => {
    const { universe, ledger, permission } = permissionFor();
    expect(validateManifestPromotionPermissionBinding(universe, ledger, permission).ok).toBe(true);
  });

  test("does not export a raw Coordinator permission issuer from the production policy module", () => {
    expect("createCoordinatorPromotionPermissionIssuer" in directRegistry).toBe(false);
  });

  test("refolds ledger events instead of trusting the supplied head or state", () => {
    const { universe, ledger, permission } = permissionFor();
    expect(validateManifestPromotionPermissionBinding(universe, { ...ledger, head: "forged" }, permission).ok).toBe(false);
    expect(validateManifestPromotionPermissionBinding(universe, { ...ledger, state: "MANIFEST_PROMOTABLE" }, permission).ok).toBe(false);
  });

  test.each([
    ["D-COUNT", { dCount: 5 as const }],
    ["T freeze", { tFreezeEventId: "other" }],
    ["S freeze", { sFreezeEventId: "other" }],
    ["skeleton", { skeletonPassEventId: "other" }],
    ["nonce", { nonce: "not-a-uuid" }],
  ])("rejects %s permission drift even with a recomputed identity", (_name, override) => {
    const { universe, ledger, permission } = permissionFor();
    const { permissionIdentity: _identity, ...original } = permission;
    const body = { ...original, ...override };
    expect(validateManifestPromotionPermissionBinding(universe, ledger, { ...body, permissionIdentity: canonicalIdentity(body, "amadeus.formal-verif.manifest-promotion-permission.v1").sha256 } as ManifestPromotionPermission).ok).toBe(false);
  });

  test("requires #1252 first and a committed skeleton before remaining T disclosures", async () => {
    const { universe, fixtures } = await sealedFixtureSet();
    const complete = completeFixtureLedger();
    const beforeSkeleton = foldLedger(complete.events.slice(0, 2));
    if (!beforeSkeleton.ok) throw new Error("setup");
    const common = { universe, ledger: beforeSkeleton.value, arm: "tla" as const, worktree: "worktrees/t", frozenEventId: "t-freeze", destinationPrefixes: ["fixtures"] };
    expect(authorizeDisclosure({ ...common, fixture: fixtures[0]! }).ok).toBe(true);
    expect(authorizeDisclosure({ ...common, fixture: fixtures[1]! }).ok).toBe(false);
    expect(authorizeDisclosure({ ...common, fixture: fixtures[0]!, arm: "ts", frozenEventId: "t-freeze" }).ok).toBe(false);
    expect(authorizeDisclosure({ ...common, ledger: complete, fixture: fixtures[1]! }).ok).toBe(true);
  });

  test("does not let a caller redefine the fixed #1252 risk-first alias", async () => {
    const { universe, fixtures } = await sealedFixtureSet();
    const complete = completeFixtureLedger();
    const beforeSkeleton = foldLedger(complete.events.slice(0, 2));
    if (!beforeSkeleton.ok) throw new Error("setup");
    const result = authorizeDisclosure({ universe, ledger: beforeSkeleton.value, fixture: fixtures[1]!, arm: "tla", worktree: "worktrees/t", frozenEventId: "t-freeze", destinationPrefixes: ["fixtures"], riskFirstAlias: fixtures[1]!.fixtureAlias } as Parameters<typeof authorizeDisclosure>[0]);
    expect(result.ok).toBe(false);
  });

  test("keeps permission identity and manifest generation inside the Coordinator-bound store", () => {
    expect("manifestPromotionPermissionIdentity" in directRegistry).toBe(false);
    expect("createPromotedFixtureManifestForIssuedPermission" in directRegistry).toBe(false);
  });
});
