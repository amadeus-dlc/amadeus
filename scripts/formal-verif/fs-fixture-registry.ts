import { createHash, randomUUID } from "node:crypto";
import { closeSync, existsSync, fstatSync, fsyncSync, ftruncateSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, readSync, readdirSync, renameSync, rmSync, unlinkSync, writeFileSync, writeSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { canonicalIdentity } from "./canonical.ts";
import { isUtcInstant, type ArmId, type Result } from "./contract.ts";
import { createSealedFixture, fixturePayloadIdentity, validateManifestPromotionPermissionBinding, verifyDisclosureAuthorization, type DisclosureAuthorization, type FixtureSealInput, type ManifestPromotionPermission, type PromotedFixtureManifest, type SealedFixture } from "./fixture-registry.ts";
import type { DefectUniverse, RegistryError } from "./fixture-registry-domain.ts";
import type { FoldedLedger } from "./provenance.ts";

export type RegistryStorePhase = "after-write" | "after-staging-sync" | "before-rename" | "after-rename" | "after-parent-sync" | "before-receipt";
export type RegistryStoreFailureInjector = (phase: RegistryStorePhase) => void;
export interface RegistryStoreDependencies {
  utcNow(): string;
  owner: { host: string; pid: number; processStartedAt: string };
  liveness(owner: LockOwner): "live" | "dead" | "unknown";
  sandboxAvailable(): boolean;
}
export interface LockOwner { host: string; pid: number; processStartedAt: string; nonce: string; createdAt: string; operationIdentity: string }
export interface CapacityClaim { reservationId: string; revisionId: string; baselineSha: string; reservedBytes: number; backingLength: number; backingHash: string; owner: RegistryStoreDependencies["owner"]; state: "ACTIVE"; claimIdentity: string }
export interface DisclosureCommit { event: { eventId: string; ordinal: number; arm: ArmId; worktree: string; fixtureAlias: string; frozenEventId: string; sealedIdentity: string; disclosureHash: string; grantIdentity: string; at: string }; grant: DisclosureAuthorization & { eventId: string; grantIdentity: string } }
interface MaterializationReceiptBody { grantIdentity: string; authorizationIdentity: string; frozenEventId: string; fixtureAlias: string; sealIdentity: string; baselineSha: string; injectionSha: string; injectionPatchIdentity: string; destination: string; materializedIdentity: string }
const MATERIALIZATION_AUTHORITY = Symbol("verified materialization authority");
const verifiedMaterializations = new WeakSet<object>();
export class MaterializationReceipt {
  private constructor(body: MaterializationReceiptBody, readonly receiptIdentity: string) { Object.assign(this, body); verifiedMaterializations.add(this); Object.freeze(this); }
  readonly grantIdentity!: string;
  readonly authorizationIdentity!: string;
  readonly frozenEventId!: string;
  readonly fixtureAlias!: string;
  readonly sealIdentity!: string;
  readonly baselineSha!: string;
  readonly injectionSha!: string;
  readonly injectionPatchIdentity!: string;
  readonly destination!: string;
  readonly materializedIdentity!: string;
  static mint(authority: symbol, body: MaterializationReceiptBody): MaterializationReceipt {
    if (authority !== MATERIALIZATION_AUTHORITY) throw new Error("verified materialization authority mismatch");
    return new MaterializationReceipt(body, canonicalIdentity(body, "amadeus.formal-verif.materialization-receipt.v1").sha256);
  }
}
export function isVerifiedMaterializationReceipt(value: unknown): value is MaterializationReceipt {
  return typeof value === "object" && value !== null && verifiedMaterializations.has(value);
}

const SHA = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PRODUCTION_REQUIRED_CAPACITY_BYTES = 7 * 16 * 1024 * 1024 + 64 * 1024 * 1024 + 1024 * 1024 * 1024;
const TEST_CAPACITY_TOKEN = Symbol("sealed-fixture-registry-test-capacity");
interface InternalCapacityPolicy { token: typeof TEST_CAPACITY_TOKEN; requiredBytes: number }
const safe = (value: string) => value.length > 0 && !value.includes("\0") && !/^(?:[A-Za-z]:[\\/]|[\\/]|~[\\/])/.test(value) && !value.split(/[\\/]/).includes("..");
const fail = (kind: RegistryError["kind"], message: string, cause?: string): Result<never, RegistryError> => ({ ok: false, error: { kind, message, cause } });
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
const equal = (left: Uint8Array, right: Uint8Array) => left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
const plain = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const exact = (value: Record<string, unknown>, keys: string) => Object.keys(value).sort().join(",") === keys;

function createPromotedFixtureManifest(universe: DefectUniverse, ledger: FoldedLedger, permission: ManifestPromotionPermission, fixtures: readonly SealedFixture[]): Result<PromotedFixtureManifest, RegistryError> {
  const allowed = validateManifestPromotionPermissionBinding(universe, ledger, permission);
  if (!allowed.ok) return allowed;
  if (fixtures.length !== universe.dCount || new Set(fixtures.map((fixture) => fixture.fixtureAlias)).size !== fixtures.length || new Set(fixtures.map((fixture) => fixture.fixtureKey)).size !== fixtures.length || fixtures.some((fixture) => { const { sealIdentity, ...body } = fixture; return fixture.universeIdentity !== universe.universeIdentity || fixture.baselineSha !== universe.baselineSha || !SHA.test(sealIdentity) || canonicalIdentity(body, "amadeus.formal-verif.sealed-fixture.v1").sha256 !== sealIdentity; })) return fail("PromotionError", "manifest fixtures are incomplete, duplicate, or drifted");
  const expectedKeys = universe.dCount === 7 ? universe.rows.map((row) => row.rowIdentity) : [...new Set(universe.rootMappings.map((mapping) => mapping.rootCluster))];
  if (expectedKeys.some((key) => !fixtures.some((fixture) => fixture.fixtureKey === key))) return fail("PromotionError", "manifest does not cover the closed D-COUNT");
  const orderedEntries = [...fixtures].sort((left, right) => left.fixtureAlias < right.fixtureAlias ? -1 : left.fixtureAlias > right.fixtureAlias ? 1 : 0).map(({ rowIdentity: _row, rootCluster: _root, ...entry }) => entry);
  const body = { schemaVersion: 1 as const, baselineSha: universe.baselineSha, dCount: universe.dCount, orderedEntries, universeIdentity: universe.universeIdentity, promotionPermissionIdentity: permission.permissionIdentity };
  return { ok: true, value: { ...body, manifestIdentity: canonicalIdentity(body, "amadeus.formal-verif.promoted-fixture-manifest.v1").sha256 } };
}

class FixtureRegistryStore {
  readonly #issuedPromotionPermissions = new WeakSet<ManifestPromotionPermission>();
  private readonly requiredCapacityBytes: number;

  constructor(private readonly root: string, private readonly dependencies: RegistryStoreDependencies, private readonly inject?: RegistryStoreFailureInjector, policy?: InternalCapacityPolicy) {
    this.requiredCapacityBytes = policy?.token === TEST_CAPACITY_TOKEN && Number.isSafeInteger(policy.requiredBytes) && policy.requiredBytes > 0 ? policy.requiredBytes : PRODUCTION_REQUIRED_CAPACITY_BYTES;
  }

  private syncDirectory(path: string): void { const fd = openSync(path, "r"); try { fsyncSync(fd); } finally { closeSync(fd); } }
  private durableFile(path: string, value: Uint8Array): void { mkdirSync(dirname(path), { recursive: true }); const fd = openSync(path, "wx", 0o600); try { writeFileSync(fd, value); fsyncSync(fd); } finally { closeSync(fd); } }
  private listFiles(root: string, directory = root, prefix = ""): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) files.push(...this.listFiles(root, join(directory, entry.name), rel)); else if (entry.isFile()) files.push(rel); else files.push(`!${rel}`);
    }
    return files.sort();
  }
  private directoryMatches(path: string, files: Readonly<Record<string, Uint8Array>>): boolean {
    try { const actual = this.listFiles(path); const expected = Object.keys(files).sort(); return actual.length === expected.length && actual.every((name, index) => name === expected[index] && equal(readFileSync(join(path, name)), files[name]!)); } catch { return false; }
  }
  private commitDirectory(category: string, key: string, files: Readonly<Record<string, Uint8Array>>): Result<void, RegistryError> {
    if (!safe(category) || !safe(key) || Object.keys(files).length === 0 || Object.keys(files).some((path) => !safe(path))) return fail("CommitError", "transaction path is invalid");
    const parent = join(this.root, category); const final = join(parent, key);
    mkdirSync(parent, { recursive: true });
    if (existsSync(final)) return this.directoryMatches(final, files) ? { ok: true, value: undefined } : fail("CommitError", "immutable successor collision");
    const staging = mkdtempSync(join(this.root, `.registry-${category.replaceAll("/", "-")}-`));
    try {
      for (const [path, value] of Object.entries(files)) this.durableFile(join(staging, path), value);
      this.inject?.("after-write"); this.syncDirectory(staging); this.inject?.("after-staging-sync"); this.inject?.("before-rename");
      mkdirSync(dirname(final), { recursive: true }); renameSync(staging, final); this.inject?.("after-rename"); this.syncDirectory(dirname(final)); this.inject?.("after-parent-sync");
      return { ok: true, value: undefined };
    } catch (cause) {
      rmSync(staging, { recursive: true, force: true });
      if (existsSync(final) && this.directoryMatches(final, files)) return fail("CommitError", "response lost after durable successor publish", cause instanceof Error ? cause.message : String(cause));
      return fail("CommitError", "durable successor publish failed", cause instanceof Error ? cause.message : String(cause));
    }
  }

  private validOwner(value: unknown): value is LockOwner {
    if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
    const owner = value as Record<string, unknown>; const keys = Object.keys(owner).sort();
    return keys.join(",") === "createdAt,host,nonce,operationIdentity,pid,processStartedAt" && typeof owner.host === "string" && owner.host.length > 0 && Number.isSafeInteger(owner.pid) && Number(owner.pid) > 0 && typeof owner.processStartedAt === "string" && owner.processStartedAt.length > 0 && typeof owner.nonce === "string" && UUID.test(owner.nonce) && typeof owner.createdAt === "string" && isUtcInstant(owner.createdAt) && typeof owner.operationIdentity === "string" && SHA.test(owner.operationIdentity);
  }
  private acquire(operationIdentity: string): Result<LockOwner, RegistryError> {
    mkdirSync(this.root, { recursive: true }); const lock = join(this.root, ".writer-lock");
    if (existsSync(lock)) {
      let owner: unknown; try { owner = JSON.parse(readFileSync(join(lock, "owner.json"), "utf8")); } catch { return fail("CommitError", "writer lock owner is missing or malformed"); }
      if (!this.validOwner(owner)) return fail("CommitError", "writer lock owner schema is invalid");
      if (this.dependencies.liveness(owner) !== "dead") return fail("CommitError", "writer lock owner is live or unknown");
      const quarantine = join(this.root, ".lock-quarantine", `${owner.nonce}-${randomUUID()}`); mkdirSync(dirname(quarantine), { recursive: true });
      try { renameSync(lock, quarantine); this.syncDirectory(this.root); } catch (cause) { return fail("CommitError", "stale writer quarantine failed", String(cause)); }
    }
    const owner: LockOwner = { ...this.dependencies.owner, nonce: randomUUID(), createdAt: this.dependencies.utcNow(), operationIdentity };
    if (!this.validOwner(owner)) return fail("CommitError", "local writer owner schema is invalid");
    const staging = join(this.root, `.writer-lock-${owner.nonce}.staging`);
    try { mkdirSync(staging); this.durableFile(join(staging, "owner.json"), bytes(owner)); this.syncDirectory(staging); renameSync(staging, lock); this.syncDirectory(this.root); return { ok: true, value: owner }; }
    catch (cause) { rmSync(staging, { recursive: true, force: true }); return fail("CommitError", "writer lock acquisition failed", String(cause)); }
  }
  private release(owner: LockOwner): void {
    const lock = join(this.root, ".writer-lock"); let current: unknown;
    try { current = JSON.parse(readFileSync(join(lock, "owner.json"), "utf8")); } catch { return; }
    if (!this.validOwner(current) || current.nonce !== owner.nonce) return;
    const released = join(this.root, `.writer-release-${owner.nonce}`); renameSync(lock, released); this.syncDirectory(this.root); rmSync(released, { recursive: true, force: true });
  }
  private quarantineOrphans(): void {
    const names = readdirSync(this.root).filter((name) => name.startsWith(".registry-") || name.startsWith(".reservation-") || (name.startsWith(".writer-lock-") && name.endsWith(".staging")));
    if (names.length === 0) return; const quarantine = join(this.root, ".orphan-quarantine"); mkdirSync(quarantine, { recursive: true });
    for (const name of names) renameSync(join(this.root, name), join(quarantine, `${randomUUID()}-${name}`)); this.syncDirectory(this.root);
  }
  private locked<T>(operation: unknown, action: () => Result<T, RegistryError>): Result<T, RegistryError> {
    const owner = this.acquire(canonicalIdentity(operation, "amadeus.formal-verif.registry-operation.v1").sha256); if (!owner.ok) return owner;
    try { this.quarantineOrphans(); return action(); } catch (cause) { return fail("CommitError", "registry operation failed", cause instanceof Error ? cause.message : String(cause)); } finally { this.release(owner.value); }
  }

  private released(reservationId: string): boolean { return existsSync(join(this.root, "reservation-successors", reservationId, "RELEASED")); }
  private terminal(reservationId: string): boolean { return existsSync(join(this.root, "reservation-successors", reservationId, "CLOSED")) || existsSync(join(this.root, "reservation-successors", reservationId, "ABORTED")); }
  private validClaimOwner(value: unknown): value is RegistryStoreDependencies["owner"] {
    return plain(value) && exact(value, "host,pid,processStartedAt") && typeof value.host === "string" && value.host.length > 0 && Number.isSafeInteger(value.pid) && Number(value.pid) > 0 && typeof value.processStartedAt === "string" && value.processStartedAt.length > 0;
  }
  private inspectBacking(path: string): Result<{ backingLength: number; backingHash: string }, RegistryError> {
    let fd: number | undefined;
    try {
      const before = lstatSync(path);
      if (!before.isFile() || before.isSymbolicLink()) return fail("CapacityError", "capacity backing is not a regular file");
      fd = openSync(path, "r");
      const opened = fstatSync(fd);
      if (!opened.isFile() || opened.dev !== before.dev || opened.ino !== before.ino) return fail("CapacityError", "capacity backing changed before verification");
      const hash = createHash("sha256");
      const block = new Uint8Array(64 * 1024);
      let backingLength = 0;
      for (;;) {
        const count = readSync(fd, block, 0, block.byteLength, null);
        if (count === 0) break;
        backingLength += count;
        if (backingLength > this.requiredCapacityBytes) return fail("CapacityError", "capacity backing exceeds the required length");
        hash.update(block.subarray(0, count));
      }
      const after = fstatSync(fd);
      const linked = lstatSync(path);
      if (!after.isFile() || !linked.isFile() || linked.isSymbolicLink() || after.dev !== opened.dev || after.ino !== opened.ino || linked.dev !== opened.dev || linked.ino !== opened.ino || after.size !== opened.size || linked.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs || backingLength !== after.size) return fail("CapacityError", "capacity backing changed during verification");
      if (backingLength !== this.requiredCapacityBytes) return fail("CapacityError", "capacity backing length does not match the required capacity");
      return { ok: true, value: { backingLength, backingHash: hash.digest("hex") } };
    } catch (cause) {
      return fail("CapacityError", "capacity backing is unavailable", cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (fd !== undefined) closeSync(fd);
    }
  }
  private readClaim(reservationId: string): Result<CapacityClaim, RegistryError> {
    try {
      const value: unknown = JSON.parse(readFileSync(join(this.root, "reservations", reservationId, "claim.json"), "utf8"));
      if (!plain(value) || !exact(value, "backingHash,backingLength,baselineSha,claimIdentity,owner,reservationId,reservedBytes,revisionId,state")) return fail("CapacityError", "capacity claim schema is not closed");
      const claim = value as unknown as CapacityClaim;
      const { claimIdentity, ...body } = claim;
      if (!safe(claim.reservationId) || claim.reservationId !== reservationId || claim.state !== "ACTIVE" || !SHA.test(claim.revisionId) || !SHA.test(claim.baselineSha) || !SHA.test(claim.backingHash) || !Number.isSafeInteger(claim.backingLength) || claim.backingLength !== this.requiredCapacityBytes || !Number.isSafeInteger(claim.reservedBytes) || claim.reservedBytes !== this.requiredCapacityBytes || !this.validClaimOwner(claim.owner) || canonicalIdentity(body, "amadeus.formal-verif.registry-capacity-claim.v1").sha256 !== claimIdentity) return fail("CapacityError", "capacity claim is corrupt");
      const backing = this.inspectBacking(join(this.root, "reservations", reservationId, "backing.bin"));
      if (!backing.ok || backing.value.backingLength !== claim.backingLength || backing.value.backingHash !== claim.backingHash) return fail("CapacityError", "capacity claim does not bind the physical backing");
      return { ok: true, value: claim };
    }
    catch (cause) { return fail("CapacityError", "capacity claim is unavailable", String(cause)); }
  }
  private requireActive(revisionId: string, baselineSha: string): Result<CapacityClaim, RegistryError> {
    const reservations = join(this.root, "reservations"); if (!existsSync(reservations)) return fail("CapacityError", "revision has no active reservation");
    for (const id of readdirSync(reservations)) { if (this.terminal(id) || this.released(id)) continue; const claim = this.readClaim(id); if (!claim.ok) return claim; if (claim.value.revisionId === revisionId && claim.value.baselineSha === baselineSha) return claim; }
    return fail("CapacityError", "revision has no active reservation");
  }

  reserveCapacity(input: { reservationId: string; revisionId: string; baselineSha: string }): Result<CapacityClaim, RegistryError> {
    if (!plain(input) || !exact(input, "baselineSha,reservationId,revisionId") || !safe(input.reservationId) || !SHA.test(input.revisionId) || !SHA.test(input.baselineSha) || !this.validClaimOwner(this.dependencies.owner)) return fail("CapacityError", "capacity request is invalid");
    return this.locked({ kind: "RESERVE", ...input, reservedBytes: this.requiredCapacityBytes }, () => {
      const final = join(this.root, "reservations", input.reservationId);
      if (existsSync(final)) { const existing = this.readClaim(input.reservationId); return existing.ok && existing.value.revisionId === input.revisionId && existing.value.baselineSha === input.baselineSha ? existing : fail("CapacityError", "reservation identity collision"); }
      const reservations = join(this.root, "reservations"); if (existsSync(reservations) && readdirSync(reservations).some((id) => !this.released(id))) return fail("CapacityError", "another revision still owns physical capacity");
      const staging = mkdtempSync(join(this.root, ".reservation-"));
      try {
        const backingPath = join(staging, "backing.bin");
        const hash = createHash("sha256");
        const fd = openSync(backingPath, "wx", 0o600);
        try {
          ftruncateSync(fd, this.requiredCapacityBytes);
          const block = new Uint8Array(Math.min(64 * 1024, this.requiredCapacityBytes));
          let offset = 0;
          while (offset < this.requiredCapacityBytes) {
            const length = Math.min(block.byteLength, this.requiredCapacityBytes - offset);
            const written = writeSync(fd, block, 0, length, offset);
            if (written <= 0) throw new Error("physical reservation write made no progress");
            hash.update(block.subarray(0, written));
            offset += written;
          }
          fsyncSync(fd);
          if (fstatSync(fd).size !== this.requiredCapacityBytes) throw new Error("preallocation mismatch");
        } finally { closeSync(fd); }
        const backingHash = hash.digest("hex");
        const inspected = this.inspectBacking(backingPath);
        if (!inspected.ok || inspected.value.backingLength !== this.requiredCapacityBytes || inspected.value.backingHash !== backingHash) throw new Error("physical reservation verification failed");
        const body = { ...input, reservedBytes: this.requiredCapacityBytes, backingLength: inspected.value.backingLength, backingHash, owner: this.dependencies.owner, state: "ACTIVE" as const };
        const claim: CapacityClaim = { ...body, claimIdentity: canonicalIdentity(body, "amadeus.formal-verif.registry-capacity-claim.v1").sha256 };
        this.durableFile(join(staging, "claim.json"), bytes(claim));
        this.syncDirectory(staging); mkdirSync(dirname(final), { recursive: true }); renameSync(staging, final); this.syncDirectory(dirname(final)); return { ok: true, value: claim };
      }
      catch (cause) { rmSync(staging, { recursive: true, force: true }); return fail("CapacityError", "physical reservation failed", String(cause)); }
    });
  }

  closeCapacity(reservationId: string): Result<void, RegistryError> { return this.finishCapacity(reservationId, "CLOSED"); }
  abortCapacity(reservationId: string): Result<void, RegistryError> { return this.finishCapacity(reservationId, "ABORTED"); }
  private finishCapacity(reservationId: string, state: "CLOSED" | "ABORTED"): Result<void, RegistryError> {
    return this.locked({ kind: state, reservationId }, () => { const claim = this.readClaim(reservationId); if (!claim.ok) return claim; if (state === "ABORTED" && this.dependencies.liveness({ ...claim.value.owner, nonce: randomUUID(), createdAt: this.dependencies.utcNow(), operationIdentity: claim.value.claimIdentity }) !== "dead") return fail("CapacityError", "live or unknown reservation owner cannot be aborted"); const body = { reservationId, claimIdentity: claim.value.claimIdentity, state, at: this.dependencies.utcNow() }; return this.commitDirectory(`reservation-successors/${reservationId}`, state, { "event.json": bytes({ ...body, eventIdentity: canonicalIdentity(body, "amadeus.formal-verif.capacity-terminal.v1").sha256 }) }); });
  }
  releaseCapacity(reservationId: string): Result<void, RegistryError> {
    return this.locked({ kind: "RELEASE", reservationId }, () => { if (this.released(reservationId)) return { ok: true, value: undefined }; const claim = this.readClaim(reservationId); if (!claim.ok) return claim; if (!this.terminal(reservationId)) return fail("CapacityError", "capacity must be closed or aborted before release"); const backing = join(this.root, "reservations", reservationId, "backing.bin"); if (existsSync(backing)) { const quarantine = `${backing}.${randomUUID()}.release`; renameSync(backing, quarantine); unlinkSync(quarantine); this.syncDirectory(dirname(backing)); } if (existsSync(backing)) return fail("CapacityError", "physical backing release was not verified"); const body = { reservationId, claimIdentity: claim.value.claimIdentity, state: "RELEASED", at: this.dependencies.utcNow() }; return this.commitDirectory(`reservation-successors/${reservationId}`, "RELEASED", { "receipt.json": bytes({ ...body, receiptIdentity: canonicalIdentity(body, "amadeus.formal-verif.capacity-release.v1").sha256 }) }); });
  }

  publishSeal(input: FixtureSealInput, payloads: Readonly<Record<string, Uint8Array>>): Result<{ sealIdentity: string; fixture: SealedFixture }, RegistryError> {
    return this.locked({ kind: "SEAL", universeIdentity: input.universe.universeIdentity, rowIdentity: input.rowIdentity, fixtureAlias: input.fixtureAlias }, () => {
      const active = this.requireActive(input.universe.universeIdentity, input.universe.baselineSha); if (!active.ok) return active;
      if (Object.keys(payloads).length === 0 || Object.keys(payloads).some((path) => !safe(path))) return fail("SealError", "seal payload paths are invalid");
      const fixture = createSealedFixture({ ...input, disclosurePayloadIdentity: fixturePayloadIdentity(payloads) });
      if (!fixture.ok) return fixture;
      const files: Record<string, Uint8Array> = { "record.json": bytes(fixture.value) };
      for (const [path, value] of Object.entries(payloads)) files[`payloads/${path}`] = value;
      const committed = this.commitDirectory("seals", fixture.value.sealIdentity, files);
      return committed.ok ? { ok: true, value: { sealIdentity: fixture.value.sealIdentity, fixture: fixture.value } } : committed;
    });
  }
  readSeal(sealIdentity: string): Result<{ fixture: SealedFixture; payloads: Record<string, Uint8Array> }, RegistryError> {
    try { const directory = join(this.root, "seals", sealIdentity); const fixture = JSON.parse(readFileSync(join(directory, "record.json"), "utf8")) as SealedFixture; const { sealIdentity: recorded, ...body } = fixture; if (recorded !== sealIdentity || canonicalIdentity(body, "amadeus.formal-verif.sealed-fixture.v1").sha256 !== recorded) return fail("SealError", "sealed record identity is corrupt"); const payloads: Record<string, Uint8Array> = {}; for (const path of this.listFiles(join(directory, "payloads"))) payloads[path] = readFileSync(join(directory, "payloads", path)); if (fixturePayloadIdentity(payloads) !== fixture.disclosurePayloadIdentity) return fail("SealError", "sealed payload was modified"); return { ok: true, value: { fixture, payloads } }; }
    catch (cause) { return fail("SealError", "sealed record is unavailable", String(cause)); }
  }

  private durableDisclosureAliases(arm: ArmId): Result<string[], RegistryError> {
    const root = join(this.root, "disclosures", arm);
    if (!existsSync(root)) return { ok: true, value: [] };
    try {
      const aliases = readdirSync(root).sort();
      for (const alias of aliases) {
        const commit = this.readDisclosureCommit(join(root, alias));
        if (!commit.ok || commit.value.event.arm !== arm || commit.value.event.fixtureAlias !== alias) return fail("DisclosureError", "durable disclosure state is corrupt");
      }
      return { ok: true, value: aliases };
    } catch (cause) { return fail("DisclosureError", "durable disclosure state is incomplete", String(cause)); }
  }

  private readDisclosureCommit(directory: string): Result<DisclosureCommit, RegistryError> {
    try {
      const event: unknown = JSON.parse(readFileSync(join(directory, "event.json"), "utf8"));
      const grant: unknown = JSON.parse(readFileSync(join(directory, "grant.json"), "utf8"));
      if (!plain(event) || !plain(grant) || !exact(event, "arm,at,disclosureHash,eventId,fixtureAlias,frozenEventId,grantIdentity,ordinal,sealedIdentity,worktree") || !exact(grant, "arm,authorizationIdentity,destinationPrefixes,eventId,fixtureAlias,frozenAt,frozenEventId,grantIdentity,ledgerStateIdentity,sealedIdentity,universeIdentity,worktree")) return fail("DisclosureError", "disclosure event/grant schema is not closed");
      const { eventId, grantIdentity: eventGrantIdentity, ...eventBody } = event;
      const { grantIdentity, ...grantBody } = grant;
      const { eventId: grantEventId, authorizationIdentity, ...authorizationBody } = grantBody;
      if (typeof eventId !== "string" || typeof grantIdentity !== "string" || typeof eventGrantIdentity !== "string" || typeof grantEventId !== "string" || typeof authorizationIdentity !== "string" || ![eventId, grantIdentity, eventGrantIdentity, authorizationIdentity, event.sealedIdentity, event.disclosureHash, grant.ledgerStateIdentity, grant.sealedIdentity].every((identity) => typeof identity === "string" && SHA.test(identity))) return fail("DisclosureError", "disclosure event/grant identity field is invalid");
      if ((event.arm !== "tla" && event.arm !== "ts") || !Number.isSafeInteger(event.ordinal) || Number(event.ordinal) < 0 || grant.arm !== event.arm || grant.fixtureAlias !== event.fixtureAlias || grant.frozenEventId !== event.frozenEventId || grant.sealedIdentity !== event.sealedIdentity || grant.worktree !== event.worktree || grantEventId !== eventId || eventGrantIdentity !== grantIdentity || !isUtcInstant(String(event.at)) || !isUtcInstant(String(grant.frozenAt)) || Date.parse(String(event.at)) < Date.parse(String(grant.frozenAt))) return fail("DisclosureError", "disclosure event/grant cross-link is invalid");
      if (canonicalIdentity(eventBody, "amadeus.formal-verif.disclosure-event.v1").sha256 !== eventId || canonicalIdentity(grantBody, "amadeus.formal-verif.disclosure-grant.v1").sha256 !== grantIdentity || canonicalIdentity(authorizationBody, "amadeus.formal-verif.disclosure-authorization.v1").sha256 !== authorizationIdentity) return fail("DisclosureError", "disclosure event/grant canonical identity is invalid");
      return { ok: true, value: { event, grant } as unknown as DisclosureCommit };
    } catch (cause) { return fail("DisclosureError", "disclosure event/grant is unavailable", String(cause)); }
  }

  publishDisclosure(universe: DefectUniverse, ledger: FoldedLedger, authorization: DisclosureAuthorization, at = this.dependencies.utcNow()): Result<DisclosureCommit, RegistryError> {
    return this.locked({ kind: "DISCLOSE", authorization }, () => {
      if (!isUtcInstant(at) || !isUtcInstant(authorization.frozenAt) || Date.parse(at) < Date.parse(authorization.frozenAt)) return fail("DisclosureError", "disclosure timestamp is invalid or precedes freeze");
      const verified = verifyDisclosureAuthorization(universe, ledger, authorization); if (!verified.ok) return verified;
      const active = this.requireActive(authorization.universeIdentity, universe.baselineSha); if (!active.ok) return active;
      const disclosed = this.durableDisclosureAliases(authorization.arm); if (!disclosed.ok) return disclosed;
      if (disclosed.value.includes(authorization.fixtureAlias)) {
        const existing = this.readDisclosureCommit(join(this.root, "disclosures", authorization.arm, authorization.fixtureAlias));
        return existing.ok && existing.value.grant.authorizationIdentity === authorization.authorizationIdentity ? existing : fail("DisclosureError", "disclosure retry does not match the durable authorization");
      }
      const prior = disclosed.value;
      if (authorization.arm === "tla" && prior.length === 0 && authorization.fixtureAlias !== "fx-1252") return fail("DisclosureError", "the first durable T disclosure must be #1252");
      if (authorization.arm === "tla" && authorization.fixtureAlias !== "fx-1252" && !prior.includes("fx-1252")) return fail("DisclosureError", "remaining T disclosures require durable #1252 state");
      const seal = this.readSeal(authorization.sealedIdentity);
      if (!seal.ok || seal.value.fixture.fixtureAlias !== authorization.fixtureAlias || seal.value.fixture.universeIdentity !== authorization.universeIdentity) return fail("DisclosureError", "authorization does not bind a verified seal");
      const eventBody = { ordinal: prior.length, arm: authorization.arm, worktree: authorization.worktree, fixtureAlias: authorization.fixtureAlias, frozenEventId: authorization.frozenEventId, sealedIdentity: authorization.sealedIdentity, disclosureHash: seal.value.fixture.disclosurePayloadIdentity, at };
      const eventId = canonicalIdentity(eventBody, "amadeus.formal-verif.disclosure-event.v1").sha256;
      const grantBody = { ...authorization, eventId };
      const grantIdentity = canonicalIdentity(grantBody, "amadeus.formal-verif.disclosure-grant.v1").sha256;
      const commit: DisclosureCommit = { event: { eventId, ...eventBody, grantIdentity }, grant: { ...grantBody, grantIdentity } };
      const stored = this.commitDirectory(`disclosures/${authorization.arm}`, authorization.fixtureAlias, { "event.json": bytes(commit.event), "grant.json": bytes(commit.grant) });
      return stored.ok ? { ok: true, value: commit } : stored;
    });
  }
  private findGrant(grantIdentity: string): Result<DisclosureCommit, RegistryError> {
    try { for (const arm of readdirSync(join(this.root, "disclosures"))) for (const alias of readdirSync(join(this.root, "disclosures", arm))) { const commit = this.readDisclosureCommit(join(this.root, "disclosures", arm, alias)); if (!commit.ok) return commit; if (commit.value.grant.grantIdentity === grantIdentity) return commit; } } catch (cause) { return fail("DisclosureError", "grant lookup failed", String(cause)); } return fail("DisclosureError", "grant is unknown");
  }
  materializeDisclosure(grantIdentity: string, worktree: string, destinationRoot: string, destination: string): Result<MaterializationReceipt, RegistryError> {
    return this.locked({ kind: "MATERIALIZE", grantIdentity, worktree, destination }, () => {
      if (!this.dependencies.sandboxAvailable()) return fail("DisclosureError", "filesystem sandbox capability is unavailable");
      const found = this.findGrant(grantIdentity); if (!found.ok) return found;
      const { grant, event } = found.value;
      if (grant.grantIdentity !== grantIdentity || grant.worktree !== worktree || !grant.destinationPrefixes.some((prefix: string) => destination === prefix || destination.startsWith(`${prefix}/`)) || !safe(destination)) return fail("DisclosureError", "grant event, worktree, or destination binding is invalid");
      const seal = this.readSeal(grant.sealedIdentity);
      if (!seal.ok || event.disclosureHash !== seal.value.fixture.disclosurePayloadIdentity || event.sealedIdentity !== seal.value.fixture.sealIdentity || event.fixtureAlias !== seal.value.fixture.fixtureAlias) return fail("DisclosureError", "disclosure event does not bind the durable seal");
      const active = this.requireActive(grant.universeIdentity, seal.value.fixture.baselineSha); if (!active.ok) return active;
      const final = resolve(destinationRoot, destination); const rel = relative(resolve(destinationRoot), final);
      if (rel.startsWith("..") || /^[\\/]/.test(rel)) return fail("DisclosureError", "materialization path escapes worktree");
      const fixture = seal.value.fixture;
      const receipt = MaterializationReceipt.mint(MATERIALIZATION_AUTHORITY, { grantIdentity, authorizationIdentity: grant.authorizationIdentity, frozenEventId: event.frozenEventId, fixtureAlias: fixture.fixtureAlias, sealIdentity: fixture.sealIdentity, baselineSha: fixture.baselineSha, injectionSha: fixture.injectionSha, injectionPatchIdentity: fixture.patchIdentity, destination, materializedIdentity: fixturePayloadIdentity(seal.value.payloads) });
      const prior = join(this.root, "materializations", grantIdentity);
      if (existsSync(prior)) { const stored = JSON.parse(readFileSync(join(prior, "receipt.json"), "utf8")); return JSON.stringify(stored) === JSON.stringify(receipt) && this.directoryMatches(final, seal.value.payloads) ? { ok: true, value: receipt } : fail("DisclosureError", "single-use grant replay drifted"); }
      if (existsSync(final) && !this.directoryMatches(final, seal.value.payloads)) return fail("DisclosureError", "materialization destination already exists with different bytes");
      if (!existsSync(final)) {
        mkdirSync(dirname(final), { recursive: true }); const staging = mkdtempSync(join(dirname(final), `.grant-${grantIdentity}-`));
        try { for (const [path, value] of Object.entries(seal.value.payloads)) this.durableFile(join(staging, path), value); this.syncDirectory(staging); renameSync(staging, final); this.syncDirectory(dirname(final)); }
        catch (cause) { rmSync(staging, { recursive: true, force: true }); return fail("DisclosureError", "materialization commit failed", String(cause)); }
      }
      this.inject?.("before-receipt");
      const committed = this.commitDirectory("materializations", grantIdentity, { "receipt.json": bytes(receipt) });
      return committed.ok ? { ok: true, value: receipt } : committed;
    });
  }

  private verifyPromotionIndex(universe: DefectUniverse, permission: ManifestPromotionPermission, fixtures: readonly SealedFixture[]): Result<void, RegistryError> {
    const expectedAliases = fixtures.map((fixture) => fixture.fixtureAlias).sort();
    const expectedSeals = fixtures.map((fixture) => fixture.sealIdentity).sort();
    try {
      const durableSeals = readdirSync(join(this.root, "seals")).sort();
      if (durableSeals.length !== expectedSeals.length || durableSeals.some((seal, index) => seal !== expectedSeals[index])) return fail("PromotionError", "durable seal index does not equal the closed D-COUNT");
      for (const fixture of fixtures) {
        const row = universe.rows.find((candidate) => candidate.rowIdentity === fixture.rowIdentity);
        const identities = [fixture.sealIdentity, fixture.injectionSha, fixture.patchIdentity, fixture.proofIdentity, fixture.branchIdentity, fixture.payloadManifestIdentity, fixture.scanReceiptIdentity, fixture.disclosurePayloadIdentity];
        const stored = this.readSeal(fixture.sealIdentity);
        if (!row || !stored.ok || JSON.stringify(stored.value.fixture) !== JSON.stringify(fixture) || fixture.universeIdentity !== universe.universeIdentity || fixture.baselineSha !== universe.baselineSha || fixture.proofIdentity !== row.proofIdentity || fixture.patchIdentity !== row.patchIdentity || identities.some((identity) => !SHA.test(identity))) return fail("PromotionError", "durable seal identity chain is incomplete or drifted");
      }
      for (const arm of ["tla", "ts"] as const) {
        const root = join(this.root, "disclosures", arm);
        const aliases = readdirSync(root).sort();
        if (aliases.length !== expectedAliases.length || aliases.some((alias, index) => alias !== expectedAliases[index])) return fail("PromotionError", "durable disclosure aliases do not equal the closed D-COUNT");
        const ordinals = new Set<number>();
        for (const alias of aliases) {
          const commit = this.readDisclosureCommit(join(root, alias));
          const fixture = fixtures.find((candidate) => candidate.fixtureAlias === alias);
          const expectedFreeze = arm === "tla" ? permission.tFreezeEventId : permission.sFreezeEventId;
          if (!commit.ok || !fixture || commit.value.event.arm !== arm || commit.value.event.frozenEventId !== expectedFreeze || commit.value.event.sealedIdentity !== fixture.sealIdentity || commit.value.event.disclosureHash !== fixture.disclosurePayloadIdentity || commit.value.grant.universeIdentity !== universe.universeIdentity) return fail("PromotionError", "durable disclosure identity chain is incomplete or drifted");
          ordinals.add(commit.value.event.ordinal);
        }
        if (ordinals.size !== universe.dCount || Array.from({ length: universe.dCount }, (_, index) => index).some((ordinal) => !ordinals.has(ordinal))) return fail("PromotionError", "durable disclosure order is incomplete or duplicated");
        if (arm === "tla") { const first = this.readDisclosureCommit(join(root, "fx-1252")); if (!first.ok || first.value.event.ordinal !== 0) return fail("PromotionError", "the first durable T disclosure is not #1252"); }
      }
      return { ok: true, value: undefined };
    } catch (cause) { return fail("PromotionError", "durable promotion index is unavailable", String(cause)); }
  }

  promote(universe: DefectUniverse, ledger: FoldedLedger, permission: ManifestPromotionPermission, fixtures: readonly SealedFixture[]): Result<PromotedFixtureManifest, RegistryError> {
    if (!this.#issuedPromotionPermissions.has(permission)) return fail("PromotionError", "promotion permission was not issued by this Coordinator composition");
    return this.locked({ kind: "PROMOTE", permission: permission.permissionIdentity }, () => { const active = this.requireActive(universe.universeIdentity, universe.baselineSha); if (!active.ok) return active; const manifest = createPromotedFixtureManifest(universe, ledger, permission, fixtures); if (!manifest.ok) return manifest; const index = this.verifyPromotionIndex(universe, permission, fixtures); if (!index.ok) return index; const eventBody = { kind: "FIXTURE_MANIFEST_PROMOTED", manifestIdentity: manifest.value.manifestIdentity, permissionIdentity: permission.permissionIdentity, at: this.dependencies.utcNow() }; const files = { "permission-claim.json": bytes(permission), "manifest.json": bytes(manifest.value), "event.json": bytes({ ...eventBody, eventIdentity: canonicalIdentity(eventBody, "amadeus.formal-verif.promotion-event.v1").sha256 }) }; const committed = this.commitDirectory("promotions/by-permission", permission.nonce, files); return committed.ok ? manifest : committed; });
  }
}

export class FsFixtureRegistry extends FixtureRegistryStore {
  constructor(root: string, dependencies: RegistryStoreDependencies, inject?: RegistryStoreFailureInjector) {
    super(root, dependencies, inject);
  }
}

export function createFsFixtureRegistryForTesting(root: string, dependencies: RegistryStoreDependencies, requiredBytes: number, inject?: RegistryStoreFailureInjector): FsFixtureRegistry {
  return new FixtureRegistryStore(root, dependencies, inject, { token: TEST_CAPACITY_TOKEN, requiredBytes }) as FsFixtureRegistry;
}
