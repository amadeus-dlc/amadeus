import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalIdentity } from "../../scripts/formal-verif/canonical.ts";
import { FsFixtureRegistry } from "../../scripts/formal-verif/fs-fixture-registry.ts";
import * as directStore from "../../scripts/formal-verif/fs-fixture-registry.ts";
import * as publicApi from "../../scripts/formal-verif/index.ts";
import * as directRegistry from "../../scripts/formal-verif/fixture-registry.ts";
import { authorizeDisclosure, ledgerStateIdentity } from "../../scripts/formal-verif/fixture-registry.ts";
import * as registryHarness from "../formal-verif/support/sealed-fixture-registry-harness.ts";
import { completeFixtureLedger, createTestFixtureRegistry, sealedFixtureSet } from "../formal-verif/support/sealed-fixture-registry-harness.ts";

describe("formal verification filesystem fixture registry", () => {
  const roots: string[] = [];
  afterEach(() => roots.splice(0).forEach((root) => { rmSync(root, { recursive: true, force: true }); }));

  const dependencies = (liveness: "live" | "dead" | "unknown" = "live", sandbox = true) => ({ utcNow: () => "2026-07-20T00:00:06Z", owner: { host: "test-host", pid: 42, processStartedAt: "test-process" }, liveness: () => liveness, sandboxAvailable: () => sandbox });
  const workspace = async (inject?: ConstructorParameters<typeof FsFixtureRegistry>[2]) => {
    const root = mkdtempSync(join(tmpdir(), "fv-fixture-store-"));
    roots.push(root);
    const set = await sealedFixtureSet();
    const store = createTestFixtureRegistry(root, dependencies(), 1024, inject);
    const reserved = store.reserveCapacity({ reservationId: "reserve-1", revisionId: set.universe.universeIdentity, baselineSha: set.universe.baselineSha });
    if (!reserved.ok) throw new Error(reserved.error.message);
    return { root, store, ...set };
  };
  const publishCompleteDisclosures = (store: FsFixtureRegistry, universe: Awaited<ReturnType<typeof sealedFixtureSet>>["universe"], fixtures: Awaited<ReturnType<typeof sealedFixtureSet>>["fixtures"]): void => {
    const ledger = completeFixtureLedger();
    for (const arm of ["tla", "ts"] as const) for (const fixture of fixtures) {
      const authorization = authorizeDisclosure({ universe, ledger, fixture, arm, worktree: arm === "tla" ? "worktrees/t" : "worktrees/s", frozenEventId: arm === "tla" ? "t-freeze" : "s-freeze", destinationPrefixes: ["fixtures"] });
      if (!authorization.ok || !store.publishDisclosure(universe, ledger, authorization.value).ok) throw new Error("disclosure setup failed");
    }
  };

  test("durably reserves physical capacity for one active revision", () => {
    const root = mkdtempSync(join(tmpdir(), "fv-fixture-store-"));
    roots.push(root);
    const store = createTestFixtureRegistry(root, dependencies(), 256);
    const result = store.reserveCapacity({ reservationId: "reserve-1", revisionId: "a".repeat(64), baselineSha: "b".repeat(64) });
    expect(result.ok).toBe(true);
    expect(statSync(join(root, "reservations", "reserve-1", "backing.bin")).size).toBe(256);
  });

  test("rejects a caller-selected reservation smaller than the design capacity", () => {
    const root = mkdtempSync(join(tmpdir(), "fv-fixture-capacity-")); roots.push(root);
    const store = new FsFixtureRegistry(root, dependencies());
    const forgedRequest = { reservationId: "reserve-small", revisionId: "a".repeat(64), baselineSha: "b".repeat(64), reservedBytes: 1 };
    expect("createFsFixtureRegistryForTesting" in publicApi).toBe(false);
    expect("createCoordinatorPromotionPermissionIssuer" in publicApi).toBe(false);
    expect(store.reserveCapacity(forgedRequest).ok).toBe(false);
  });

  test("denies promotion permission minting to direct module, barrel, and manual rehash callers", async () => {
    const { store, universe, fixtures } = await workspace();
    const ledger = completeFixtureLedger();
    const body = { kind: "ManifestPromotionPermission" as const, stateIdentity: ledgerStateIdentity(ledger), ledgerHead: ledger.head!, tFreezeEventId: "t-freeze", sFreezeEventId: "s-freeze", skeletonPassEventId: "skeleton-pass", dCount: universe.dCount, universeIdentity: universe.universeIdentity, nonce: "11111111-1111-4111-8111-111111111111" };
    const manual = { ...body, permissionIdentity: canonicalIdentity(body, "amadeus.formal-verif.manifest-promotion-permission.v1").sha256 };
    expect("createCoordinatorPromotionPermissionIssuer" in directRegistry).toBe(false);
    expect("manifestPromotionPermissionIdentity" in directRegistry).toBe(false);
    expect("createPromotedFixtureManifestForIssuedPermission" in directRegistry).toBe(false);
    expect("createCoordinatorPromotionPermissionIssuer" in publicApi).toBe(false);
    // MaterializationReceipt / isVerifiedMaterializationReceipt are the registry's issued "subject receipt"
    // (domain-entities.md: Registry.materialize -> subject receipt) and its store-issuance guard, consumed by
    // the TLA skeleton preflight for its fail-closed precondition check. They carry no promotion-permission minting.
    expect(Object.keys(directStore).sort()).toEqual(["FsFixtureRegistry", "MaterializationReceipt", "createFsFixtureRegistryForTesting", "isVerifiedMaterializationReceipt"]);
    expect(Object.keys(publicApi).filter((name) => /Coordinator.*FixtureRegistry/.test(name))).toEqual([]);
    expect(Object.keys(registryHarness).filter((name) => /Coordinator.*FixtureRegistry/.test(name))).toEqual([]);
    expect(Object.getOwnPropertyNames(store)).not.toContain("issuedPromotionPermissions");
    Reflect.set(store, "issuedPromotionPermissions", new WeakSet([manual]));
    const denied = store.promote(universe, ledger, manual, fixtures);
    expect(denied.ok).toBe(false);
    expect(denied.ok ? "" : denied.error.message).toBe("promotion permission was not issued by this Coordinator composition");
  });

  test("revalidates the active backing before publishing a seal", async () => {
    const { root, store, fixtures, payloads, sealInputs } = await workspace();
    truncateSync(join(root, "reservations", "reserve-1", "backing.bin"), 0);
    const fixture = fixtures[0]!;
    expect(store.publishSeal(sealInputs.get(fixture.fixtureAlias)!, payloads.get(fixture.sealIdentity)!).ok).toBe(false);
  });

  test("holds capacity until terminal successor and release receipt are durable", async () => {
    const { store, universe } = await workspace();
    expect(store.reserveCapacity({ reservationId: "reserve-1", revisionId: universe.universeIdentity, baselineSha: universe.baselineSha }).ok).toBe(true);
    expect(store.reserveCapacity({ reservationId: "reserve-2", revisionId: "f".repeat(64), baselineSha: universe.baselineSha }).ok).toBe(false);
    expect(store.closeCapacity("reserve-1").ok).toBe(true);
    expect(store.reserveCapacity({ reservationId: "reserve-2", revisionId: "f".repeat(64), baselineSha: universe.baselineSha }).ok).toBe(false);
    expect(store.releaseCapacity("reserve-1").ok).toBe(true);
    expect(store.reserveCapacity({ reservationId: "reserve-2", revisionId: "f".repeat(64), baselineSha: universe.baselineSha }).ok).toBe(true);
  });

  test("rejects live-owner abort and allows only verified-dead abort", async () => {
    const { root, universe } = await workspace();
    const live = createTestFixtureRegistry(root, dependencies("live"), 1024);
    expect(live.abortCapacity("reserve-1").ok).toBe(false);
    const dead = createTestFixtureRegistry(root, dependencies("dead"), 1024);
    expect(dead.abortCapacity("reserve-1").ok).toBe(true);
    expect(dead.releaseCapacity("reserve-1").ok).toBe(true);
    expect(dead.reserveCapacity({ reservationId: "reserve-2", revisionId: "f".repeat(64), baselineSha: universe.baselineSha }).ok).toBe(true);
  });

  test("fails closed for live and malformed locks, but quarantines a verified-dead owner", () => {
    const root = mkdtempSync(join(tmpdir(), "fv-fixture-lock-"));
    roots.push(root);
    const owner = { host: "remote", pid: 7, processStartedAt: "remote-start", nonce: "00000000-0000-4000-8000-000000000099", createdAt: "2026-07-20T00:00:00Z", operationIdentity: "a".repeat(64) };
    mkdirSync(join(root, ".writer-lock")); writeFileSync(join(root, ".writer-lock", "owner.json"), JSON.stringify(owner));
    const input = { reservationId: "reserve-1", revisionId: "a".repeat(64), baselineSha: "b".repeat(64) };
    expect(createTestFixtureRegistry(root, dependencies("live"), 64).reserveCapacity(input).ok).toBe(false);
    expect(readdirSync(join(root, ".writer-lock"))).toEqual(["owner.json"]);
    writeFileSync(join(root, ".writer-lock", "owner.json"), JSON.stringify({ ...owner, nonce: "bad" }));
    expect(createTestFixtureRegistry(root, dependencies("dead"), 64).reserveCapacity(input).ok).toBe(false);
    expect(readdirSync(root).includes(".lock-quarantine")).toBe(false);
    writeFileSync(join(root, ".writer-lock", "owner.json"), JSON.stringify(owner));
    expect(createTestFixtureRegistry(root, dependencies("dead"), 64).reserveCapacity(input).ok).toBe(true);
    expect(readdirSync(join(root, ".lock-quarantine"))).toHaveLength(1);
  });

  test("publishes an immutable seal, verifies reads, and converges exact retries", async () => {
    const { root, store, fixtures, payloads, sealInputs } = await workspace();
    const fixture = fixtures[0]!; const payload = payloads.get(fixture.sealIdentity)!;
    expect(store.publishSeal(sealInputs.get(fixture.fixtureAlias)!, payload).ok).toBe(true);
    expect(store.publishSeal(sealInputs.get(fixture.fixtureAlias)!, payload).ok).toBe(true);
    expect(store.readSeal(fixture.sealIdentity).ok).toBe(true);
    writeFileSync(join(root, "seals", fixture.sealIdentity, "payloads", "fixture.bin"), "tampered");
    expect(store.readSeal(fixture.sealIdentity).ok).toBe(false);
  });

  test("rejects a rehashed seal whose proof identity was not issued by the proof chain", async () => {
    const { store, fixtures, payloads, sealInputs } = await workspace();
    const original = fixtures[0]!;
    const input = sealInputs.get(original.fixtureAlias)!;
    const forged = { ...input, proof: { ...input.proof, proofId: "f".repeat(64) } };
    expect(store.publishSeal(forged, payloads.get(original.sealIdentity)!).ok).toBe(false);
  });

  test("reports response loss after rename and recovers the exact seal on retry", async () => {
    let failed = false;
    const { store, fixtures, payloads, sealInputs } = await workspace((phase) => { if (!failed && phase === "after-rename") { failed = true; throw new Error("response lost"); } });
    const fixture = fixtures[0]!; const payload = payloads.get(fixture.sealIdentity)!;
    expect(store.publishSeal(sealInputs.get(fixture.fixtureAlias)!, payload).ok).toBe(false);
    expect(store.publishSeal(sealInputs.get(fixture.fixtureAlias)!, payload).ok).toBe(true);
  });

  test("quarantines orphan staging and retries cleanly after a pre-rename failure", async () => {
    let failed = false;
    const { root, store, fixtures, payloads, sealInputs } = await workspace((phase) => { if (!failed && phase === "before-rename") { failed = true; throw new Error("crash"); } });
    mkdirSync(join(root, ".registry-orphan")); writeFileSync(join(root, ".registry-orphan", "partial"), "partial");
    const fixture = fixtures[0]!; const payload = payloads.get(fixture.sealIdentity)!;
    expect(store.publishSeal(sealInputs.get(fixture.fixtureAlias)!, payload).ok).toBe(false);
    expect(readdirSync(join(root, ".orphan-quarantine"))).toHaveLength(1);
    expect(store.publishSeal(sealInputs.get(fixture.fixtureAlias)!, payload).ok).toBe(true);
  });

  test("atomically commits event/grant and consumes it only at bound materialization", async () => {
    const { root, store, universe, fixtures, payloads, sealInputs } = await workspace();
    const fixture = fixtures[0]!; expect(store.publishSeal(sealInputs.get(fixture.fixtureAlias)!, payloads.get(fixture.sealIdentity)!).ok).toBe(true);
    const ledger = completeFixtureLedger();
    const authorization = authorizeDisclosure({ universe, ledger, fixture, arm: "tla", worktree: "worktrees/t", frozenEventId: "t-freeze", destinationPrefixes: ["fixtures"] });
    if (!authorization.ok) throw new Error("setup");
    const disclosure = store.publishDisclosure(universe, ledger, authorization.value); if (!disclosure.ok) throw new Error(disclosure.error.message);
    const worktreeRoot = join(root, "arm-worktree"); mkdirSync(worktreeRoot);
    expect(store.materializeDisclosure(disclosure.value.grant.grantIdentity, "worktrees/t", worktreeRoot, "fixtures/fx-1252").ok).toBe(true);
    expect(readFileSync(join(worktreeRoot, "fixtures", "fx-1252", "fixture.bin"), "utf8")).toBe("payload-1");
    expect(store.materializeDisclosure(disclosure.value.grant.grantIdentity, "worktrees/t", worktreeRoot, "fixtures/fx-1252").ok).toBe(true);
    expect(store.materializeDisclosure(disclosure.value.grant.grantIdentity, "worktrees/other", worktreeRoot, "fixtures/other").ok).toBe(false);
    expect(new FsFixtureRegistry(root, dependencies("live", false)).materializeDisclosure(disclosure.value.grant.grantIdentity, "worktrees/t", worktreeRoot, "fixtures/fx-1252").ok).toBe(false);
  });

  test("rejects materialization when a committed event arm or freeze link is tampered", async () => {
    const { root, store, universe, fixtures, payloads, sealInputs } = await workspace();
    const fixture = fixtures[0]!;
    expect(store.publishSeal(sealInputs.get(fixture.fixtureAlias)!, payloads.get(fixture.sealIdentity)!).ok).toBe(true);
    const ledger = completeFixtureLedger();
    const authorization = authorizeDisclosure({ universe, ledger, fixture, arm: "tla", worktree: "worktrees/t", frozenEventId: "t-freeze", destinationPrefixes: ["fixtures"] });
    if (!authorization.ok) throw new Error("setup");
    const disclosure = store.publishDisclosure(universe, ledger, authorization.value); if (!disclosure.ok) throw new Error("setup");
    const eventPath = join(root, "disclosures", "tla", fixture.fixtureAlias, "event.json");
    const event = JSON.parse(readFileSync(eventPath, "utf8"));
    writeFileSync(eventPath, JSON.stringify({ ...event, arm: "ts", frozenEventId: "s-freeze" }));
    const worktreeRoot = join(root, "arm-tampered"); mkdirSync(worktreeRoot);
    expect(store.materializeDisclosure(disclosure.value.grant.grantIdentity, "worktrees/t", worktreeRoot, "fixtures/fx-1252").ok).toBe(false);
  });

  test("rejects caller-invented disclosure history and a rehashed forged freeze authorization", async () => {
    const { store, universe, fixtures, payloads, sealInputs } = await workspace();
    for (const fixture of fixtures.slice(0, 2)) expect(store.publishSeal(sealInputs.get(fixture.fixtureAlias)!, payloads.get(fixture.sealIdentity)!).ok).toBe(true);
    const ledger = completeFixtureLedger();
    const second = authorizeDisclosure({ universe, ledger, fixture: fixtures[1]!, arm: "tla", worktree: "worktrees/t", frozenEventId: "t-freeze", destinationPrefixes: ["fixtures"] });
    if (!second.ok) throw new Error("setup");
    expect(store.publishDisclosure(universe, ledger, second.value).ok).toBe(false);

    const first = authorizeDisclosure({ universe, ledger, fixture: fixtures[0]!, arm: "tla", worktree: "worktrees/t", frozenEventId: "t-freeze", destinationPrefixes: ["fixtures"] });
    if (!first.ok) throw new Error("setup");
    const { authorizationIdentity: _identity, ...forgedBody } = { ...first.value, frozenEventId: "missing-freeze" };
    const forged = { ...forgedBody, authorizationIdentity: canonicalIdentity(forgedBody, "amadeus.formal-verif.disclosure-authorization.v1").sha256 };
    expect(store.publishDisclosure(universe, ledger, forged).ok).toBe(false);
    expect(store.publishDisclosure(universe, ledger, first.value).ok).toBe(true);
    expect(store.publishDisclosure(universe, ledger, second.value).ok).toBe(true);
  });

  test("recovers materialized bytes after receipt-boundary loss and rejects a half disclosure", async () => {
    let failed = false;
    const { root, store, universe, fixtures, payloads, sealInputs } = await workspace((phase) => { if (!failed && phase === "before-receipt") { failed = true; throw new Error("receipt lost"); } });
    const fixture = fixtures[0]!; expect(store.publishSeal(sealInputs.get(fixture.fixtureAlias)!, payloads.get(fixture.sealIdentity)!).ok).toBe(true);
    const ledger = completeFixtureLedger();
    const authorization = authorizeDisclosure({ universe, ledger, fixture, arm: "tla", worktree: "worktrees/t", frozenEventId: "t-freeze", destinationPrefixes: ["fixtures"] }); if (!authorization.ok) throw new Error("setup");
    const disclosure = store.publishDisclosure(universe, ledger, authorization.value); if (!disclosure.ok) throw new Error("setup"); const worktreeRoot = join(root, "arm-recovery"); mkdirSync(worktreeRoot);
    expect(store.materializeDisclosure(disclosure.value.grant.grantIdentity, "worktrees/t", worktreeRoot, "fixtures/fx-1252").ok).toBe(false);
    const recovered = createTestFixtureRegistry(root, dependencies(), 1024);
    expect(recovered.materializeDisclosure(disclosure.value.grant.grantIdentity, "worktrees/t", worktreeRoot, "fixtures/fx-1252").ok).toBe(true);
    rmSync(join(root, "disclosures", "tla", "fx-1252", "event.json"));
    expect(recovered.materializeDisclosure(disclosure.value.grant.grantIdentity, "worktrees/t", worktreeRoot, "fixtures/fx-1252").ok).toBe(false);
  });

  test("keeps promotion authority sealed after the durable fixture set becomes ready", async () => {
    const { root, store, universe, fixtures, payloads, sealInputs } = await workspace();
    for (const fixture of fixtures) expect(store.publishSeal(sealInputs.get(fixture.fixtureAlias)!, payloads.get(fixture.sealIdentity)!).ok).toBe(true);
    publishCompleteDisclosures(store, universe, fixtures);
    const ledger = completeFixtureLedger();
    const body = { kind: "ManifestPromotionPermission" as const, stateIdentity: ledgerStateIdentity(ledger), ledgerHead: ledger.head!, tFreezeEventId: "t-freeze", sFreezeEventId: "s-freeze", skeletonPassEventId: "skeleton-pass", dCount: universe.dCount, universeIdentity: universe.universeIdentity, nonce: "00000000-0000-4000-8000-000000000001" };
    const manual = { ...body, permissionIdentity: canonicalIdentity(body, "amadeus.formal-verif.manifest-promotion-permission.v1").sha256 };
    const denied = store.promote(universe, ledger, manual, fixtures);
    expect(denied.ok).toBe(false);
    expect(denied.ok ? "" : denied.error.message).toBe("promotion permission was not issued by this Coordinator composition");
    expect(readdirSync(root).includes("promotions")).toBe(false);
  });
});
