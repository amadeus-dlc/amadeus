import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { appendAuditEntry, appendAuditEntryUnlocked } from "./amadeus-audit.ts";
import {
  auditBlockField,
  auditShardName,
  auditShards,
  readIntentRegistry,
  SESSIONS_DIR,
  withAuditLock,
  workspaceRoot,
  writeFileAtomic,
} from "./amadeus-lib.ts";

export type PresenceReservationState = "armed" | "minted" | "consumed";

export type PresenceReservation = {
  readonly version: 1;
  readonly reservationId: string;
  readonly sessionDigest: string;
  readonly space: string;
  readonly targetIntentId: string;
  readonly targetIntentDir: string;
  readonly stage: string;
  readonly routeId: string;
  readonly state: PresenceReservationState;
  readonly armedAt: string;
  readonly humanTurnTimestamp: string | null;
  readonly humanTurnShard: string | null;
};

// Signature input/output shapes are declared here rather than inline in the
// parameter lists: TypeScript erases inline annotations at runtime, but Bun's
// LCOV still stamps their lines DA:0, which puts unmeasurable rows into the
// patch-coverage population. Module-scope type declarations carry no DA record.
export type ArmReservationInput = {
  readonly projectDir: string;
  readonly sessionId: string;
  readonly space: string;
  readonly targetIntentId: string;
  readonly stage: string;
  readonly routeId: string;
  readonly reservationIdFactory?: () => string;
};

export type MintReservationInput = {
  readonly projectDir: string;
  readonly sessionId: string;
};

export type MintReservationResult =
  | { readonly kind: "none" }
  | { readonly kind: "minted"; readonly reservation: PresenceReservation }
  | { readonly kind: "already-minted"; readonly reservation: PresenceReservation };

export type ConsumeReservationInput = {
  readonly projectDir: string;
  readonly sessionId: string;
  readonly reservationId: string;
  readonly targetIntentId: string;
  readonly stage: string;
};

export type VerifyReservationInput = ConsumeReservationInput & {
  readonly allowConsumed?: boolean;
};

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID_V7_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SAFE_NAME_RE = /^[A-Za-z0-9._-]+$/;
const SHA256_HEX_RE = /^[0-9a-f]{64}$/;
const STAGE_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const SHARD_NAME_RE = /^[A-Za-z0-9._-]+\.md$/;
const RESERVATION_KEYS = [
  "armedAt",
  "humanTurnShard",
  "humanTurnTimestamp",
  "reservationId",
  "routeId",
  "sessionDigest",
  "space",
  "stage",
  "state",
  "targetIntentDir",
  "targetIntentId",
  "version",
] as const;

type ReservationKey = (typeof RESERVATION_KEYS)[number];
type ReservationFieldCheck = (value: unknown) => boolean;

const stringMatching = (re: RegExp): ReservationFieldCheck => (value) =>
  typeof value === "string" && re.test(value);

const isTimestamp: ReservationFieldCheck = (value) =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

const nullOr =
  (check: ReservationFieldCheck): ReservationFieldCheck =>
  (value) =>
    value === null || check(value);

// Per-field parse rules, keyed by the on-disk field name. The record is total
// over RESERVATION_KEYS, so a new field without a rule is a compile error rather
// than a silently unchecked value.
const RESERVATION_FIELD_CHECKS: Readonly<
  Record<ReservationKey, ReservationFieldCheck>
> = {
  version: (value) => value === 1,
  reservationId: stringMatching(UUID_V4_RE),
  sessionDigest: stringMatching(SHA256_HEX_RE),
  space: stringMatching(SAFE_NAME_RE),
  targetIntentId: stringMatching(UUID_V7_RE),
  targetIntentDir: stringMatching(SAFE_NAME_RE),
  stage: stringMatching(STAGE_SLUG_RE),
  routeId: stringMatching(UUID_V4_RE),
  state: (value) =>
    value === "armed" || value === "minted" || value === "consumed",
  armedAt: isTimestamp,
  humanTurnTimestamp: nullOr(isTimestamp),
  humanTurnShard: nullOr(stringMatching(SHARD_NAME_RE)),
};

// An armed reservation carries no provenance yet; a minted/consumed one carries
// both halves. Anything else is a corrupt marker.
function provenanceMatchesState(record: Record<string, unknown>): boolean {
  return record.state === "armed"
    ? record.humanTurnTimestamp === null && record.humanTurnShard === null
    : record.humanTurnTimestamp !== null && record.humanTurnShard !== null;
}

function reservationDir(projectDir: string): string {
  return join(workspaceRoot(projectDir), SESSIONS_DIR, "presence-reservations");
}

function reservationPath(projectDir: string, reservationId: string): string {
  if (!UUID_V4_RE.test(reservationId)) {
    throw new Error("Presence Reservation Id must be UUID v4");
  }
  return join(reservationDir(projectDir), `${reservationId}.json`);
}

function digestSessionId(sessionId: string): string {
  if (sessionId.length === 0) throw new Error("Trusted session identity is required");
  return createHash("sha256").update(sessionId, "utf-8").digest("hex");
}

function resolveTargetIntent(
  projectDir: string,
  space: string,
  targetIntentId: string,
): string {
  if (!UUID_V7_RE.test(targetIntentId)) {
    throw new Error("Target intent id must be UUID v7");
  }
  const matches = readIntentRegistry(projectDir, space).filter(
    (entry) => entry.uuid === targetIntentId,
  );
  if (
    matches.length !== 1 ||
    matches[0].status !== "in-flight" ||
    matches[0].dirName === undefined ||
    !SAFE_NAME_RE.test(matches[0].dirName)
  ) {
    throw new Error("Target intent must resolve to exactly one in-flight registry row");
  }
  return matches[0].dirName;
}

function parseReservation(raw: string): PresenceReservation {
  const value: unknown = JSON.parse(raw);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Presence reservation must be an object");
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (
    keys.length !== RESERVATION_KEYS.length ||
    !keys.every((key, index) => key === RESERVATION_KEYS[index])
  ) {
    throw new Error("Presence reservation has an unknown or missing field");
  }
  for (const key of RESERVATION_KEYS) {
    if (!RESERVATION_FIELD_CHECKS[key](record[key])) {
      throw new Error("Presence reservation field is malformed");
    }
  }
  if (!provenanceMatchesState(record)) {
    throw new Error("Presence reservation state does not match its provenance");
  }
  return Object.freeze(record as PresenceReservation);
}

function writeReservation(projectDir: string, marker: PresenceReservation): void {
  mkdirSync(reservationDir(projectDir), { recursive: true });
  writeFileAtomic(
    reservationPath(projectDir, marker.reservationId),
    `${JSON.stringify(marker, null, 2)}\n`,
  );
}

function listReservations(projectDir: string): PresenceReservation[] {
  let names: string[];
  try {
    names = readdirSync(reservationDir(projectDir));
  } catch {
    return [];
  }
  return names
    .filter((name) => /^[0-9a-f-]+\.json$/.test(name))
    .sort()
    .map((name) =>
      parseReservation(readFileSync(join(reservationDir(projectDir), name), "utf-8")),
    );
}

export function readPresenceReservation(
  projectDir: string,
  reservationId: string,
): PresenceReservation | null {
  const path = reservationPath(projectDir, reservationId);
  if (!existsSync(path)) return null;
  return parseReservation(readFileSync(path, "utf-8"));
}

export function armPresenceReservation(input: ArmReservationInput): PresenceReservation {
  const sessionDigest = digestSessionId(input.sessionId);
  const active = listReservations(input.projectDir).filter(
    (marker) =>
      marker.sessionDigest === sessionDigest && marker.state !== "consumed",
  );
  if (active.length !== 0) {
    throw new Error("Trusted session already has an active presence reservation");
  }
  const targetIntentDir = resolveTargetIntent(
    input.projectDir,
    input.space,
    input.targetIntentId,
  );
  const reservationId = (input.reservationIdFactory ?? randomUUID)();
  if (readPresenceReservation(input.projectDir, reservationId) !== null) {
    throw new Error(`Presence Reservation Id collision: ${reservationId}`);
  }
  const marker: PresenceReservation = {
    version: 1,
    reservationId,
    sessionDigest,
    space: input.space,
    targetIntentId: input.targetIntentId,
    targetIntentDir,
    stage: input.stage,
    routeId: input.routeId,
    state: "armed",
    armedAt: new Date().toISOString(),
    humanTurnTimestamp: null,
    humanTurnShard: null,
  };
  writeReservation(input.projectDir, marker);
  return marker;
}

function reservationHumanTurns(
  projectDir: string,
  marker: PresenceReservation,
): Array<{ timestamp: string; shard: string }> {
  const matches: Array<{ timestamp: string; shard: string }> = [];
  for (const path of auditShards(projectDir, marker.targetIntentDir, marker.space)) {
    const content = readFileSync(path, "utf-8");
    for (const block of content.replace(/\r\n/g, "\n").split(/\n---\n/)) {
      if (
        auditBlockField(block, "Event") !== "HUMAN_TURN" ||
        auditBlockField(block, "Presence Reservation Id") !== marker.reservationId
      ) {
        continue;
      }
      const timestamp = auditBlockField(block, "Timestamp");
      if (timestamp !== null) matches.push({ timestamp, shard: basename(path) });
    }
  }
  return matches;
}

export function mintArmedPresenceReservation(
  input: MintReservationInput,
): MintReservationResult {
  const sessionDigest = digestSessionId(input.sessionId);
  const active = listReservations(input.projectDir).filter(
    (marker) =>
      marker.sessionDigest === sessionDigest && marker.state !== "consumed",
  );
  if (active.length === 0) return { kind: "none" };
  if (active.length !== 1) {
    throw new Error("Trusted session has ambiguous presence reservations");
  }
  const marker = active[0];
  if (marker.state === "minted") {
    return { kind: "already-minted", reservation: marker };
  }
  resolveTargetIntent(input.projectDir, marker.space, marker.targetIntentId);
  const minted = withAuditLock(
    input.projectDir,
    () => {
      const matches = reservationHumanTurns(input.projectDir, marker);
      if (matches.length > 1) {
        throw new Error("Presence reservation has multiple HUMAN_TURN events");
      }
      let provenance = matches[0];
      if (provenance === undefined) {
        const result = appendAuditEntryUnlocked(
          "HUMAN_TURN",
          { "Presence Reservation Id": marker.reservationId },
          input.projectDir,
          marker.targetIntentDir,
          marker.space,
        );
        if (!result.appended) {
          throw new Error("Cannot mint HUMAN_TURN for a completed target intent");
        }
        provenance = {
          timestamp: result.timestamp,
          shard: auditShardName(input.projectDir),
        };
      }
      const next: PresenceReservation = {
        ...marker,
        state: "minted",
        humanTurnTimestamp: provenance.timestamp,
        humanTurnShard: provenance.shard,
      };
      writeReservation(input.projectDir, next);
      return next;
    },
    marker.targetIntentDir,
    marker.space,
  );
  return { kind: "minted", reservation: minted };
}

export function consumePresenceReservation(
  input: ConsumeReservationInput,
): PresenceReservation {
  const marker = readPresenceReservation(input.projectDir, input.reservationId);
  if (marker === null) throw new Error("Presence reservation was not found");
  if (marker.sessionDigest !== digestSessionId(input.sessionId)) {
    throw new Error("Presence reservation session does not match");
  }
  if (
    marker.targetIntentId !== input.targetIntentId ||
    marker.stage !== input.stage
  ) {
    throw new Error("Presence reservation target does not match");
  }
  if (marker.state === "consumed") return marker;
  if (marker.state !== "minted") {
    throw new Error("Presence reservation has not been minted");
  }
  const consumed: PresenceReservation = { ...marker, state: "consumed" };
  writeReservation(input.projectDir, consumed);
  return consumed;
}

export function verifyMintedPresenceReservation(
  input: VerifyReservationInput,
): PresenceReservation {
  const marker = readPresenceReservation(input.projectDir, input.reservationId);
  if (marker === null) throw new Error("Presence reservation was not found");
  if (marker.sessionDigest !== digestSessionId(input.sessionId)) {
    throw new Error("Presence reservation session does not match");
  }
  if (
    marker.targetIntentId !== input.targetIntentId ||
    marker.stage !== input.stage
  ) {
    throw new Error("Presence reservation target does not match");
  }
  if (
    marker.state !== "minted" &&
    !(input.allowConsumed === true && marker.state === "consumed")
  ) {
    throw new Error("Presence reservation is not minted");
  }
  const resolvedIntent = resolveTargetIntent(
    input.projectDir,
    marker.space,
    marker.targetIntentId,
  );
  if (resolvedIntent !== marker.targetIntentDir) {
    throw new Error("Presence reservation owner no longer matches the registry");
  }
  const turns = reservationHumanTurns(input.projectDir, marker);
  if (
    turns.length !== 1 ||
    turns[0].timestamp !== marker.humanTurnTimestamp ||
    turns[0].shard !== marker.humanTurnShard
  ) {
    throw new Error("Presence reservation HUMAN_TURN provenance does not match");
  }
  return marker;
}

// --------------------------------------------------------------------------
// Host session capability — the one canonical seam every harness mints through
// --------------------------------------------------------------------------
//
// Each harness adapter converts its own UserPromptSubmit payload into this
// union and nothing else: no harness may decide WHETHER a turn authorizes
// anything, only whether its host handed it a stable session identity. A host
// with no stable identity (Kiro IDE's promptSubmit hook carries only the prompt
// text; OpenCode ships no prompt hook at all) reports `unavailable` and NEVER
// degrades to a shared workspace key, the PID, or the active-intent cursor —
// the targeted continuation simply does not fire there, which is the fail-
// closed side of the reservation contract.
export type HostSessionCapability =
  | { readonly kind: "available"; readonly sessionId: string }
  | { readonly kind: "unavailable"; readonly reason: string };

// Normalize a raw host payload field into the capability union. Only a
// non-empty string that survives trimming is a usable identity.
export function hostSessionCapability(
  rawSessionId: unknown,
  reason = "host payload carries no stable session id",
): HostSessionCapability {
  if (typeof rawSessionId !== "string") return { kind: "unavailable", reason };
  const sessionId = rawSessionId.trim();
  if (sessionId.length === 0) return { kind: "unavailable", reason };
  return { kind: "available", sessionId };
}

export type MintHumanPresenceInput = {
  readonly projectDir: string;
  readonly capability: HostSessionCapability;
};

// The canonical presence mint. `available` sessions first try their own armed
// reservation (the targeted continuation of a solo grant fallback, minted
// exactly once per Reservation Id); every other case appends the ordinary
// untargeted HUMAN_TURN the human-presence gate has always required.
export function mintHumanPresence(input: MintHumanPresenceInput): void {
  if (input.capability.kind === "available") {
    const reservation = mintArmedPresenceReservation({
      projectDir: input.projectDir,
      sessionId: input.capability.sessionId,
    });
    // Only the turn that actually mints the owner-targeted HUMAN_TURN skips the
    // ordinary append. `already-minted` falls through: the reservation holds its
    // one owner event (HR-24 counts owner HUMAN_TURN per Reservation Id, and an
    // untargeted append carries no Reservation Id), while the host session keeps
    // recording ordinary presence. Returning here instead would suppress every
    // later human turn in the session for as long as the reservation is unconsumed
    // — and reservations never expire on time alone.
    if (reservation.kind === "minted") return;
  }
  appendAuditEntry("HUMAN_TURN", {}, input.projectDir);
}
