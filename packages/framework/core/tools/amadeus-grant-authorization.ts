import { randomUUID } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { basename } from "node:path";
import { appendAuditEntryUnlocked } from "./amadeus-audit.ts";
import type { RunStageDirective } from "./amadeus-directive.ts";
import {
  activeIntent,
  activeSpace,
  auditBlockField,
  auditShards,
  errorMessage,
  isPlainObject,
  readIntentRegistry,
  resolveOperatingMode,
  StandingGrant,
  standingGrantSatisfiesGate,
  GRANT_ID_RE,
  UUID_V4_RE,
  UUID_V7_RE,
  withAuditLock,
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

// Fold one audit block into the running ledger scan. Shared by the space-wide
// pass (which also resolves the route receipt) and the owner-only revalidation
// pass, so both derive the same facts from one traversal each.
function collectLedgerBlock(
  scan: SoloGrantScan,
  space: string,
  targetIntent: string | null,
  block: string,
  intent: string,
  shard: string,
  pass: StandingGrantScanPass,
  observer: StandingGrantScanObserver,
): void {
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
      collectLedgerBlock(scan, space, targetIntent, block, intent, shard, pass, observer);
    },
  );
  return finishLedger(scan, pass, observer);
}

// Second phase of a ledger scan: a revocation only counts once its issuer
// provenance is grounded in a HUMAN_TURN the same scan saw.
function finishLedger(
  scan: SoloGrantScan,
  pass: StandingGrantScanPass,
  observer: StandingGrantScanObserver,
): SoloGrantLedger {
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
  return validateGrantById(intent, grantId, ledger, slug, stateContent, graph, nowMs);
}

function validateGrantById(
  intent: string,
  grantId: string,
  ledger: SoloGrantLedger,
  slug: string,
  stateContent: string,
  graph: StageEntry[],
  nowMs: number,
): StandingGrantValidation {
  const matching = ledger.issues.filter(
    (block) => auditBlockField(block, "Grant Id") === grantId,
  );
  const valid = matching.filter((block) => StandingGrant.parse(block) !== null);
  if (matching.length === 0) return { kind: "invalid", reason: "not-found" };
  if (valid.length === 0) return { kind: "invalid", reason: "malformed" };
  if (valid.length !== 1) return { kind: "invalid", reason: "ambiguous-id" };
  return validateGrant(intent, valid[0], ledger, slug, stateContent, graph, nowMs);
}

// Owner-lock revalidation of an already-resolved route. The space-wide facts
// (grounded HUMAN_TURNs and revocations, from the same audit-lock window as the
// receipt resolution) come in with the resolution, so this pass reads only the
// receipt owner's shards for the issue blocks it must re-check.
export function validateStandingGrantWithinLedger(
  projectDir: string,
  intent: string,
  grantId: string,
  slug: string,
  stateContent: string,
  graph: StageEntry[],
  nowMs: number,
  spaceLedger: StandingGrantSpaceLedger,
  observer: StandingGrantScanObserver = NOOP_OBSERVER,
): StandingGrantValidation {
  const space = activeSpace(projectDir);
  const owner = registeredIntents(projectDir, space).filter(
    (entry) => entry.name === intent,
  );
  if (owner.length !== 1) return { kind: "invalid", reason: "not-found" };
  const issues: string[] = [];
  visitRegisteredAudit(
    projectDir,
    space,
    owner,
    {
      pass: "owner-revalidation",
      observer,
      openedCanonicalShards: new Set<string>(),
    },
    (block, blockIntent) => {
      if (
        auditBlockField(block, "Event") === "GRANT_ISSUED" &&
        blockIntent === intent
      ) {
        issues.push(block);
        observer.memoryItemAdded("owner-revalidation");
      }
    },
  );
  const ledger: SoloGrantLedger = {
    issues,
    revoked: spaceLedger.revoked,
    humanTurns: spaceLedger.humanTurns,
  };
  return validateGrantById(intent, grantId, ledger, slug, stateContent, graph, nowMs);
}

export type StandingGrantRouteReceipt = {
  readonly routeId: string;
  readonly stage: string;
  readonly grantId: string;
  readonly timestamp: string;
};


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

// Space-wide ledger facts a commit carries from its receipt resolution into the
// owner-lock revalidation: which grant ids are revoked, and which issuer
// provenances a real HUMAN_TURN grounds.
export type StandingGrantSpaceLedger = {
  readonly revoked: ReadonlySet<string>;
  readonly humanTurns: ReadonlySet<string>;
};

export type StandingGrantRouteResolution =
  | {
      readonly kind: "resolved";
      readonly count: number;
      readonly intent: string;
      readonly receipt: StandingGrantRouteReceipt;
      readonly ledger: StandingGrantSpaceLedger;
    }
  | { readonly kind: "unresolved"; readonly count: number };

// One space-wide pass that answers everything the commit needs before it takes
// the owner lock: the receipt cardinality (never short-circuited on the first
// match, so a duplicated route id still fails closed), the owning intent, the
// parsed receipt, and the space-wide revocation/HUMAN_TURN ledger.
export function resolveStandingGrantRouteReceipt(
  projectDir: string,
  routeId: string,
  observer: StandingGrantScanObserver = NOOP_OBSERVER,
): StandingGrantRouteResolution {
  if (!UUID_V4_RE.test(routeId)) return { kind: "unresolved", count: 0 };
  const space = activeSpace(projectDir);
  const matches: Array<{ intent: string; block: string }> = [];
  const scan: SoloGrantScan = {
    humanTurns: new Set<string>(),
    issues: [],
    revocations: [],
  };
  visitRegisteredAudit(
    projectDir,
    space,
    registeredIntents(projectDir, space),
    {
      pass: "receipt-lookup",
      observer,
      openedCanonicalShards: new Set<string>(),
    },
    (block, intent, shard) => {
      collectLedgerBlock(scan, space, null, block, intent, shard, "receipt-lookup", observer);
      if (
        auditBlockField(block, "Event") === "GATE_AUTHORIZATION_SELECTED" &&
        auditBlockField(block, "Route Id") === routeId
      ) {
        matches.push({ intent, block });
        observer.memoryItemAdded("receipt-lookup");
      }
    },
  );
  const ledger = finishLedger(scan, "receipt-lookup", observer);
  if (matches.length !== 1) return { kind: "unresolved", count: matches.length };
  const receipt = StandingGrantRouteReceipt.parse(matches[0].block);
  if (receipt === null) return { kind: "unresolved", count: matches.length };
  return {
    kind: "resolved",
    count: matches.length,
    intent: matches[0].intent,
    receipt,
    ledger: { revoked: ledger.revoked, humanTurns: ledger.humanTurns },
  };
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

// ---------------------------------------------------------------------------
// Approval authority classification.
//
// The two solo-gate transaction arms are selected here, from the approve verb's
// carrier flags alone. This is a pure total function over the parsed flags: it
// never reads state, audit, or the filesystem, so both the state CLI (which
// drives the transaction) and the orchestrator (which forwards the carriers to
// it) classify against one definition instead of two.
// ---------------------------------------------------------------------------


export type ApprovalAuthorityInput = {
  readonly operatingMode: string;
  readonly userInput?: string;
  readonly standingGrantId?: string;
  readonly standingGrantRouteId?: string;
  readonly targetIntentId?: string;
  readonly presenceReservationId?: string;
};

export type ApprovalAuthority =
  | { readonly kind: "normal"; readonly userInput?: string }
  | { readonly kind: "grant-backed"; readonly grantId: string; readonly routeId: string }
  | {
      readonly kind: "targeted-human";
      readonly userInput: string;
      readonly targetIntentId: string;
      readonly reservationId: string;
    }
  | { readonly kind: "invalid"; readonly reason: string };

export function classifyApprovalAuthority(
  input: ApprovalAuthorityInput,
): ApprovalAuthority {
  const hasGrantId = input.standingGrantId !== undefined;
  const hasRouteId = input.standingGrantRouteId !== undefined;
  const hasTarget = input.targetIntentId !== undefined;
  const hasReservation = input.presenceReservationId !== undefined;
  const hasUser = input.userInput !== undefined;
  if (hasGrantId !== hasRouteId || hasTarget !== hasReservation) {
    return { kind: "invalid", reason: "partial authorization carrier" };
  }
  if (hasGrantId) {
    if (hasUser || hasTarget || input.operatingMode !== "solo") {
      return { kind: "invalid", reason: "mixed or non-solo grant authority" };
    }
    if (
      !GRANT_ID_RE.test(input.standingGrantId!) ||
      !UUID_V4_RE.test(input.standingGrantRouteId!)
    ) {
      return { kind: "invalid", reason: "malformed grant authority" };
    }
    return {
      kind: "grant-backed",
      grantId: input.standingGrantId!,
      routeId: input.standingGrantRouteId!,
    };
  }
  if (hasTarget) {
    if (
      !hasUser ||
      input.operatingMode !== "solo" ||
      !UUID_V7_RE.test(input.targetIntentId!) ||
      !UUID_V4_RE.test(input.presenceReservationId!)
    ) {
      return { kind: "invalid", reason: "malformed targeted human authority" };
    }
    return {
      kind: "targeted-human",
      userInput: input.userInput!,
      targetIntentId: input.targetIntentId!,
      reservationId: input.presenceReservationId!,
    };
  }
  return input.userInput === undefined
    ? { kind: "normal" }
    : { kind: "normal", userInput: input.userInput };
}

// ---------------------------------------------------------------------------
// Standing grant route receipt: the minting side.
//
// Read/count/resolve of route receipts live above; minting one lives here, so
// the write and its check share a file and can never drift apart. A solo-mode
// gate covered by a standing grant gets a GATE_AUTHORIZATION_SELECTED receipt
// and carries its Route Id on the directive; every other gate is returned
// untouched.
// ---------------------------------------------------------------------------

export type SoloGrantRouteOptions = {
  readonly directive: RunStageDirective;
  readonly projectDir: string;
  readonly stateContent: string;
  readonly graph: StageEntry[];
  readonly nowMs?: number;
  readonly operatingMode?: OperatingMode;
  readonly routeIdFactory?: () => string;
};

export function routeSoloStandingGrantDirective(
  options: SoloGrantRouteOptions,
): RunStageDirective {
  if (options.directive.gate !== true) return options.directive;
  const modeResult =
    options.operatingMode === undefined
      ? resolveOperatingMode(process.env.AMADEUS_OPERATING_MODE)
      : { kind: "valid" as const, mode: options.operatingMode };
  if (modeResult.kind !== "valid" || modeResult.mode !== "solo") {
    return options.directive;
  }
  const space = activeSpace(options.projectDir);
  const intent = activeIntent(options.projectDir, space);
  if (intent === null) return options.directive;
  const grant = findSoloStandingGrant(
    options.projectDir,
    intent,
    options.directive.stage,
    options.stateContent,
    options.graph,
    options.nowMs ?? Date.now(),
  );
  if (grant === null) return options.directive;
  const mintRouteId = options.routeIdFactory ?? randomUUID;
  const routeId = mintRouteId();
  return withAuditLock(
    options.projectDir,
    () => {
      if (
        countStandingGrantRouteReceiptsById(options.projectDir, routeId) !== 0
      ) {
        throw new Error(`Standing grant Route Id collision: ${routeId}`);
      }
      withAuditLock(
        options.projectDir,
        () => {
          const appended = appendAuditEntryUnlocked(
            "GATE_AUTHORIZATION_SELECTED",
            {
              "Route Id": routeId,
              Stage: options.directive.stage,
              "Grant Id": grant.grantId,
            },
            options.projectDir,
            intent,
            space,
          );
          if (!appended.appended) {
            throw new Error(
              `Cannot append standing grant route receipt to ${intent}: intent is complete`,
            );
          }
        },
        intent,
        space,
      );
      return {
        ...options.directive,
        standing_grant_id: grant.grantId,
        standing_grant_route_id: routeId,
      };
    },
    undefined,
    space,
  );
}

// ---------------------------------------------------------------------------
// The grant approval subprocess wire contract.
//
// The state CLI answers a carrier-bearing approve on exactly one stdout line.
// Parsing that answer is part of the grant authorization contract, not of the
// orchestrator's transport, so it is defined and tested here as a pure function
// over the captured process result.
// ---------------------------------------------------------------------------

export type GrantApprovalProcessResult =
  | { readonly kind: "approved" }
  | {
      readonly kind: "await-approval";
      readonly stage: string;
      readonly targetIntentId: string;
    }
  | { readonly kind: "protocol-error"; readonly detail: string }
  | { readonly kind: "fatal-error"; readonly detail: string };

const GRANT_AWAIT_KEYS = ["kind", "reason", "stage", "target_intent_id"];
const GRANT_STAGE_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

// Decode the await-approval payload — the shape the state CLI answers with when
// the grant no longer authorizes the gate and a human must take over. Returns
// null for anything that is not exactly this shape, so the caller reports one
// "unknown shape" protocol error instead of enumerating the payload's fields.
function grantAwaitApprovalResult(
  value: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): GrantApprovalProcessResult | null {
  if (keys.length !== GRANT_AWAIT_KEYS.length) return null;
  if (!keys.every((key, index) => key === GRANT_AWAIT_KEYS[index])) return null;
  if (value.reason !== "standing-grant-no-longer-authorizes") return null;
  const stage = value.stage;
  const targetIntentId = value.target_intent_id;
  if (typeof stage !== "string" || !GRANT_STAGE_SLUG_RE.test(stage)) return null;
  if (typeof targetIntentId !== "string" || !UUID_V7_RE.test(targetIntentId)) return null;
  return { kind: "await-approval", stage, targetIntentId };
}

// Decode the one stdout line a carrier-bearing approve answers with. Envelope
// faults (non-zero exit, stderr, non-single-line, non-JSON, non-object) are
// distinguished here; the payload shapes are decoded below it.
export function parseGrantApprovalProcessResult(
  result: { readonly exitCode: number; readonly stdout: string; readonly stderr: string },
): GrantApprovalProcessResult {
  if (result.exitCode !== 0) {
    return { kind: "fatal-error", detail: (result.stderr || result.stdout).trim() };
  }
  if (result.stderr.length !== 0) {
    return { kind: "protocol-error", detail: "grant approval process wrote stderr" };
  }
  if (!/^[^\r\n]+\n?$/.test(result.stdout)) {
    return { kind: "protocol-error", detail: "grant approval stdout must be one JSON line" };
  }
  let value: unknown;
  try {
    value = JSON.parse(result.stdout.trimEnd());
  } catch {
    return { kind: "protocol-error", detail: "grant approval stdout is not JSON" };
  }
  if (!isPlainObject(value) || typeof value.kind !== "string") {
    return { kind: "protocol-error", detail: "grant approval JSON must be an object" };
  }
  const keys = Object.keys(value).sort();
  if (value.kind === "approved" && keys.length === 1 && keys[0] === "kind") {
    return { kind: "approved" };
  }
  const awaited = value.kind === "await-approval" ? grantAwaitApprovalResult(value, keys) : null;
  return awaited ?? { kind: "protocol-error", detail: "unknown grant approval JSON shape" };
}
