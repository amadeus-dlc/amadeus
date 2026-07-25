import { readFileSync, realpathSync } from "node:fs";
import { basename } from "node:path";
import {
  activeIntent,
  activeSpace,
  auditBlockField,
  auditShards,
  errorMessage,
  readIntentRegistry,
  StandingGrant,
  standingGrantSatisfiesGate,
  type OperatingMode,
  type StageEntry,
} from "./amadeus-lib.ts";

export type StandingGrantInvalidReason =
  | "not-found"
  | "ambiguous-id"
  | "malformed"
  | "expired"
  | "revoked"
  | "intent-mismatch"
  | "invalid-provenance"
  | "gate-out-of-scope";

export type StandingGrantValidation =
  | { readonly kind: "valid"; readonly grant: StandingGrant }
  | { readonly kind: "invalid"; readonly reason: StandingGrantInvalidReason };

export type StandingGrantScanPass =
  | "candidate-selection"
  | "receipt-lookup"
  | "owner-revalidation";

export type StandingGrantScanCounts = {
  readonly shardOpened: number;
  readonly eventVisited: number;
  readonly candidateCompared: number;
  readonly memoryItemAdded: number;
  readonly canonicalShards: readonly string[];
};

export type StandingGrantScanObserver = {
  shardOpened(pass: StandingGrantScanPass, canonicalPath: string): void;
  eventVisited(pass: StandingGrantScanPass): void;
  candidateCompared(pass: StandingGrantScanPass): void;
  memoryItemAdded(pass: StandingGrantScanPass): void;
};

export type StandingGrantTestObserver = StandingGrantScanObserver & {
  snapshot(pass: StandingGrantScanPass): StandingGrantScanCounts;
};

const NOOP_OBSERVER: StandingGrantScanObserver = {
  shardOpened(): void {},
  eventVisited(): void {},
  candidateCompared(): void {},
  memoryItemAdded(): void {},
};

// Mutable counter shape (the public StandingGrantScanCounts is readonly).
// Declared at module scope so the annotation carries no runtime-erased,
// DA:0-stamped rows inside the function signature.
type MutableScanCounts = {
  shardOpened: number;
  eventVisited: number;
  candidateCompared: number;
  memoryItemAdded: number;
  canonicalShards: string[];
};

function emptyCounts(): MutableScanCounts {
  return {
    shardOpened: 0,
    eventVisited: 0,
    candidateCompared: 0,
    memoryItemAdded: 0,
    canonicalShards: [],
  };
}

/** Test-only observer. Production callers use the allocation-free no-op default. */
export function createStandingGrantTestObserver(): StandingGrantTestObserver {
  const byPass = new Map<StandingGrantScanPass, MutableScanCounts>();
  function counts(pass: StandingGrantScanPass): MutableScanCounts {
    const existing = byPass.get(pass);
    if (existing) return existing;
    const created = emptyCounts();
    byPass.set(pass, created);
    return created;
  }
  return {
    shardOpened(pass, canonicalPath): void {
      const current = counts(pass);
      if (current.canonicalShards.includes(canonicalPath)) {
        throw new Error(`duplicate canonical shard open in ${pass}: ${canonicalPath}`);
      }
      current.shardOpened++;
      current.canonicalShards.push(canonicalPath);
    },
    eventVisited(pass): void {
      counts(pass).eventVisited++;
    },
    candidateCompared(pass): void {
      counts(pass).candidateCompared++;
    },
    memoryItemAdded(pass): void {
      counts(pass).memoryItemAdded++;
    },
    snapshot(pass): StandingGrantScanCounts {
      const current = counts(pass);
      return {
        shardOpened: current.shardOpened,
        eventVisited: current.eventVisited,
        candidateCompared: current.candidateCompared,
        memoryItemAdded: current.memoryItemAdded,
        canonicalShards: [...current.canonicalShards],
      };
    },
  };
}

export function dispatchStandingGrantQuery<T>(
  mode: OperatingMode,
  queries: { readonly solo: () => T; readonly team: () => T },
): T {
  return mode === "team" ? queries.team() : queries.solo();
}

type RegisteredIntent = {
  readonly name: string;
};

function registeredIntents(projectDir: string, space: string): RegisteredIntent[] {
  const result: RegisteredIntent[] = [];
  const seen = new Set<string>();
  for (const row of readIntentRegistry(projectDir, space)) {
    if (row.status === "archived" || row.dirName === undefined) continue;
    if (
      row.dirName === "." ||
      row.dirName === ".." ||
      !/^[A-Za-z0-9._-]+$/.test(row.dirName)
    ) {
      throw new Error(`Invalid registered intent directory: ${row.dirName}`);
    }
    if (seen.has(row.dirName)) {
      throw new Error(`Duplicate registered intent directory: ${row.dirName}`);
    }
    seen.add(row.dirName);
    result.push({ name: row.dirName });
  }
  return result;
}

type ScanContext = {
  readonly pass: StandingGrantScanPass;
  readonly observer: StandingGrantScanObserver;
  readonly openedCanonicalShards: Set<string>;
};

function visitRegisteredAudit(
  projectDir: string,
  space: string,
  intents: readonly RegisteredIntent[],
  context: ScanContext,
  visit: (block: string, intent: string, shard: string) => void,
): void {
  for (const intent of intents) {
    for (const path of auditShards(projectDir, intent.name, space)) {
      visitAuditShard(path, intent.name, context, visit);
    }
  }
}

function visitAuditShard(
  path: string,
  intent: string,
  context: ScanContext,
  visit: (block: string, intent: string, shard: string) => void,
): void {
  let canonicalPath: string;
  try {
    canonicalPath = realpathSync(path);
  } catch (error) {
    throw new Error(
      `Cannot resolve standing grant audit shard ${basename(path)}: ${errorMessage(error)}`,
    );
  }
  if (context.openedCanonicalShards.has(canonicalPath)) {
    throw new Error(`duplicate canonical shard open in ${context.pass}: ${canonicalPath}`);
  }
  let content: string;
  try {
    content = readFileSync(canonicalPath, "utf-8");
  } catch (error) {
    throw new Error(
      `Cannot read standing grant audit shard ${basename(path)}: ${errorMessage(error)}`,
    );
  }
  context.openedCanonicalShards.add(canonicalPath);
  context.observer.shardOpened(context.pass, canonicalPath);
  for (const block of content.replace(/\r\n/g, "\n").split(/\n---\n/)) {
    if (auditBlockField(block, "Event") === null) continue;
    context.observer.eventVisited(context.pass);
    visit(block, intent, basename(path));
  }
}

type SoloGrantScan = {
  readonly humanTurns: Set<string>;
  readonly issues: string[];
  readonly revocations: string[];
};

type SoloGrantLedger = {
  readonly issues: string[];
  readonly revoked: ReadonlySet<string>;
  readonly humanTurns: ReadonlySet<string>;
};

function provenanceKey(block: string): string | null {
  const issuerSpace = auditBlockField(block, "Issuer Space");
  const issuerIntent = auditBlockField(block, "Issuer Intent");
  const issuerShard = auditBlockField(block, "Issuer Shard");
  const issuerHumanTs = auditBlockField(block, "Issuer Human Ts");
  if (!issuerSpace || !issuerIntent || !issuerShard || !issuerHumanTs) return null;
  return `${issuerSpace}\0${issuerIntent}\0${issuerShard}\0${issuerHumanTs}`;
}

function scanLedger(
  projectDir: string,
  targetIntent: string,
  space: string,
  pass: StandingGrantScanPass,
  observer: StandingGrantScanObserver,
): SoloGrantLedger {
  const scan: SoloGrantScan = {
    humanTurns: new Set<string>(),
    issues: [],
    revocations: [],
  };
  visitRegisteredAudit(
    projectDir,
    space,
    registeredIntents(projectDir, space),
    { pass, observer, openedCanonicalShards: new Set<string>() },
    (block, intent, shard) => {
      const event = auditBlockField(block, "Event");
      if (event === "HUMAN_TURN") {
        const timestamp = auditBlockField(block, "Timestamp");
        const key = `${space}\0${intent}\0${shard}\0${timestamp ?? ""}`;
        if (
          timestamp &&
          !Number.isNaN(Date.parse(timestamp)) &&
          !scan.humanTurns.has(key)
        ) {
          scan.humanTurns.add(key);
          observer.memoryItemAdded(pass);
        }
      } else if (event === "GRANT_ISSUED" && intent === targetIntent) {
        scan.issues.push(block);
        observer.memoryItemAdded(pass);
      } else if (event === "GRANT_REVOKED") {
        scan.revocations.push(block);
        observer.memoryItemAdded(pass);
      }
    },
  );

  const revoked = new Set<string>();
  for (const block of [...scan.issues, ...scan.revocations]) {
    const key = provenanceKey(block);
    if (key === null || !scan.humanTurns.has(key)) continue;
    if (auditBlockField(block, "Event") !== "GRANT_REVOKED") continue;
    const grantId = auditBlockField(block, "Grant Id");
    if (grantId && /^[0-9a-f]{8}$/.test(grantId) && !revoked.has(grantId)) {
      revoked.add(grantId);
      observer.memoryItemAdded(pass);
    }
  }
  return { issues: scan.issues, revoked, humanTurns: scan.humanTurns };
}

function validateGrant(
  intent: string,
  block: string,
  ledger: SoloGrantLedger,
  slug: string,
  stateContent: string,
  graph: StageEntry[],
  nowMs: number,
): StandingGrantValidation {
  const grant = StandingGrant.parse(block);
  if (grant === null) return { kind: "invalid", reason: "malformed" };
  if (grant.issuerIntent !== intent) return { kind: "invalid", reason: "intent-mismatch" };
  const key = provenanceKey(block);
  if (key === null || !ledger.humanTurns.has(key)) {
    return { kind: "invalid", reason: "invalid-provenance" };
  }
  if (grant.isExpired(nowMs)) return { kind: "invalid", reason: "expired" };
  if (ledger.revoked.has(grant.grantId)) return { kind: "invalid", reason: "revoked" };
  if (!standingGrantSatisfiesGate(grant, slug, stateContent, graph)) {
    return { kind: "invalid", reason: "gate-out-of-scope" };
  }
  return { kind: "valid", grant };
}

function outranks(candidate: StandingGrant, current: StandingGrant): boolean {
  if (candidate.expiresAtMs !== current.expiresAtMs) {
    return candidate.expiresAtMs > current.expiresAtMs;
  }
  if (candidate.issuedAtMs !== current.issuedAtMs) {
    return candidate.issuedAtMs > current.issuedAtMs;
  }
  return candidate.grantId < current.grantId;
}

function selectBestGrant(
  ledger: SoloGrantLedger,
  intent: string,
  slug: string,
  stateContent: string,
  graph: StageEntry[],
  nowMs: number,
  observer: StandingGrantScanObserver,
): StandingGrant | null {
  const grouped = new Map<string, string[]>();
  for (const block of ledger.issues) {
    const grant = StandingGrant.parse(block);
    if (grant === null) continue;
    const blocks = grouped.get(grant.grantId) ?? [];
    blocks.push(block);
    observer.memoryItemAdded("candidate-selection");
    grouped.set(grant.grantId, blocks);
  }
  let best: StandingGrant | null = null;
  for (const blocks of grouped.values()) {
    if (blocks.length !== 1) continue;
    const validation = validateGrant(
      intent,
      blocks[0],
      ledger,
      slug,
      stateContent,
      graph,
      nowMs,
    );
    if (validation.kind !== "valid") continue;
    if (best !== null) observer.candidateCompared("candidate-selection");
    if (best === null || outranks(validation.grant, best)) best = validation.grant;
  }
  return best;
}

export function findSoloStandingGrant(
  projectDir: string,
  intent: string,
  slug: string,
  stateContent: string,
  graph: StageEntry[],
  nowMs: number,
  observer: StandingGrantScanObserver = NOOP_OBSERVER,
): StandingGrant | null {
  const space = activeSpace(projectDir);
  if (activeIntent(projectDir, space) !== intent) return null;
  const intents = registeredIntents(projectDir, space);
  if (intents.filter((entry) => entry.name === intent).length !== 1) return null;
  const ledger = scanLedger(
    projectDir,
    intent,
    space,
    "candidate-selection",
    observer,
  );
  return selectBestGrant(ledger, intent, slug, stateContent, graph, nowMs, observer);
}

export function validateSoloStandingGrantById(
  projectDir: string,
  intent: string,
  grantId: string,
  slug: string,
  stateContent: string,
  graph: StageEntry[],
  nowMs: number,
  observer: StandingGrantScanObserver = NOOP_OBSERVER,
): StandingGrantValidation {
  const space = activeSpace(projectDir);
  const ledger = scanLedger(projectDir, intent, space, "owner-revalidation", observer);
  const matching = ledger.issues.filter(
    (block) => auditBlockField(block, "Grant Id") === grantId,
  );
  const valid = matching.filter((block) => StandingGrant.parse(block) !== null);
  if (matching.length === 0) return { kind: "invalid", reason: "not-found" };
  if (valid.length === 0) return { kind: "invalid", reason: "malformed" };
  if (valid.length !== 1) return { kind: "invalid", reason: "ambiguous-id" };
  return validateGrant(intent, valid[0], ledger, slug, stateContent, graph, nowMs);
}

export type StandingGrantRouteReceipt = {
  readonly routeId: string;
  readonly stage: string;
  readonly grantId: string;
  readonly timestamp: string;
};

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const StandingGrantRouteReceipt = {
  parse(auditBlock: string): StandingGrantRouteReceipt | null {
    if (auditBlockField(auditBlock, "Event") !== "GATE_AUTHORIZATION_SELECTED") {
      return null;
    }
    const routeId = auditBlockField(auditBlock, "Route Id");
    const stage = auditBlockField(auditBlock, "Stage");
    const grantId = auditBlockField(auditBlock, "Grant Id");
    const timestamp = auditBlockField(auditBlock, "Timestamp");
    if (
      !routeId ||
      !UUID_V4_RE.test(routeId) ||
      !stage ||
      !/^[a-z0-9][a-z0-9-]*$/.test(stage) ||
      !grantId ||
      !/^[0-9a-f]{8}$/.test(grantId) ||
      !timestamp ||
      Number.isNaN(Date.parse(timestamp))
    ) {
      return null;
    }
    return Object.freeze({ routeId, stage, grantId, timestamp });
  },
};

export function findStandingGrantRouteReceiptById(
  projectDir: string,
  routeId: string,
  observer: StandingGrantScanObserver = NOOP_OBSERVER,
): { readonly intent: string; readonly receipt: StandingGrantRouteReceipt } | null {
  if (!UUID_V4_RE.test(routeId)) return null;
  const matches = standingGrantRouteReceiptMatches(projectDir, routeId, observer);
  if (matches.length !== 1) return null;
  const receipt = StandingGrantRouteReceipt.parse(matches[0].block);
  return receipt === null ? null : { intent: matches[0].intent, receipt };
}

export function countStandingGrantRouteReceiptsById(
  projectDir: string,
  routeId: string,
): number {
  if (!UUID_V4_RE.test(routeId)) return 0;
  return standingGrantRouteReceiptMatches(projectDir, routeId, NOOP_OBSERVER).length;
}

function standingGrantRouteReceiptMatches(
  projectDir: string,
  routeId: string,
  observer: StandingGrantScanObserver,
): Array<{ intent: string; block: string }> {
  const space = activeSpace(projectDir);
  const matches: Array<{ intent: string; block: string }> = [];
  visitRegisteredAudit(
    projectDir,
    space,
    registeredIntents(projectDir, space),
    { pass: "receipt-lookup", observer, openedCanonicalShards: new Set<string>() },
    (block, intent) => {
      if (
        auditBlockField(block, "Event") === "GATE_AUTHORIZATION_SELECTED" &&
        auditBlockField(block, "Route Id") === routeId
      ) {
        matches.push({ intent, block });
        observer.memoryItemAdded("receipt-lookup");
      }
    },
  );
  return matches;
}
