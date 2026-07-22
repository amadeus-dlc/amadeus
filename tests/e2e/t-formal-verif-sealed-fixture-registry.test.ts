import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalIdentity } from "../../scripts/formal-verif/canonical.ts";
import { authorizeDisclosure, ledgerStateIdentity } from "../../scripts/formal-verif/fixture-registry.ts";
import { createDefectUniverse } from "../../scripts/formal-verif/fixture-registry-domain.ts";
import { foldLedger } from "../../scripts/formal-verif/provenance.ts";
import { completeFixtureLedger, createTestFixtureRegistry, fiveSealedFixtureSet, fixtureRowInput, sealedFixtureSet } from "../formal-verif/support/sealed-fixture-registry-harness.ts";

describe("formal verification sealed fixture registry lifecycle", () => {
  const roots: string[] = [];
  afterEach(() => roots.splice(0).forEach((root) => { rmSync(root, { recursive: true, force: true }); }));

  test.each([[7, sealedFixtureSet], [5, fiveSealedFixtureSet]] as const)("runs a closed %i-fixture proof-to-promotion-ready lifecycle", async (dCount, build) => {
    const root = mkdtempSync(join(tmpdir(), `fv-fixture-e2e-${dCount}-`)); roots.push(root);
    const { universe, fixtures, payloads, sealInputs } = await build();
    const store = createTestFixtureRegistry(root, { utcNow: () => "2026-07-20T00:00:06Z", owner: { host: "e2e", pid: 77, processStartedAt: "e2e-start" }, liveness: () => "live", sandboxAvailable: () => true }, 4096);
    expect(store.reserveCapacity({ reservationId: `reserve-${dCount}`, revisionId: universe.universeIdentity, baselineSha: universe.baselineSha }).ok).toBe(true);
    for (const fixture of fixtures) expect(store.publishSeal(sealInputs.get(fixture.fixtureAlias)!, payloads.get(fixture.sealIdentity)!).ok).toBe(true);
    const fullLedger = completeFixtureLedger(); const tFrozen = foldLedger(fullLedger.events.slice(0, 2)); if (!tFrozen.ok) throw new Error("setup");
    const firstAuthorization = authorizeDisclosure({ universe, ledger: tFrozen.value, fixture: fixtures[0]!, arm: "tla", worktree: "worktrees/t", frozenEventId: "t-freeze", destinationPrefixes: ["fixtures"] });
    if (!firstAuthorization.ok) throw new Error(firstAuthorization.error.message); const first = store.publishDisclosure(universe, tFrozen.value, firstAuthorization.value); if (!first.ok) throw new Error(first.error.message);
    const materializedRoot = join(root, "arm-t"); mkdirSync(materializedRoot);
    expect(store.materializeDisclosure(first.value.grant.grantIdentity, "worktrees/t", materializedRoot, "fixtures/fx-1252").ok).toBe(true);
    const disclosedT = [fixtures[0]!.fixtureAlias];
    for (const fixture of fixtures.slice(1)) { const authorization = authorizeDisclosure({ universe, ledger: fullLedger, fixture, arm: "tla", worktree: "worktrees/t", frozenEventId: "t-freeze", destinationPrefixes: ["fixtures"] }); if (!authorization.ok) throw new Error(authorization.error.message); expect(store.publishDisclosure(universe, fullLedger, authorization.value).ok).toBe(true); disclosedT.push(fixture.fixtureAlias); }
    const disclosedS: string[] = [];
    for (const fixture of fixtures) { const authorization = authorizeDisclosure({ universe, ledger: fullLedger, fixture, arm: "ts", worktree: "worktrees/s", frozenEventId: "s-freeze", destinationPrefixes: ["fixtures"] }); if (!authorization.ok) throw new Error(authorization.error.message); expect(store.publishDisclosure(universe, fullLedger, authorization.value).ok).toBe(true); disclosedS.push(fixture.fixtureAlias); }
    expect(disclosedT).toHaveLength(dCount);
    expect(disclosedS).toHaveLength(dCount);
    const body = { kind: "ManifestPromotionPermission" as const, stateIdentity: ledgerStateIdentity(fullLedger), ledgerHead: fullLedger.head!, tFreezeEventId: "t-freeze", sFreezeEventId: "s-freeze", skeletonPassEventId: "skeleton-pass", dCount: universe.dCount, universeIdentity: universe.universeIdentity, nonce: `00000000-0000-4000-8000-00000000000${universe.dCount}` };
    const manual = { ...body, permissionIdentity: canonicalIdentity(body, "amadeus.formal-verif.manifest-promotion-permission.v1").sha256 };
    const denied = store.promote(universe, fullLedger, manual, fixtures);
    expect(denied.ok).toBe(false);
    expect(denied.ok ? "" : denied.error.message).toBe("promotion permission was not issued by this Coordinator composition");
    expect(existsSync(join(root, "promotions")) ? readdirSync(join(root, "promotions")).length : 0).toBe(0);
  });

  test("rejects an asymmetric six-row universe before any transaction", () => {
    expect(createDefectUniverse({ kind: "SEVEN_PREDICATES", revisionId: "six", baselineSha: "a".repeat(64), rows: Array.from({ length: 6 }, (_, index) => fixtureRowInput(index + 1)) }).ok).toBe(false);
  });
});
