import { readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  type BaselineDoc,
  type BaselineEntry,
  digest,
  type ExemptionDoc,
  InfraFailure,
  RULE_IDS,
  type RuleId,
} from "./model.ts";
import { isUlid, type Ulid, parseUlid } from "./ulid.ts";

export const EVENTS_DIR = "tests/no-silent-drop/events";

export type GrantKind = "grandfather" | "exemption";

export type GrantEvent = {
  readonly schemaVersion: 1;
  readonly ulid: Ulid;
  readonly op: "grant";
  readonly kind: GrantKind;
  readonly fingerprint: string;
  readonly ruleId: RuleId;
  readonly file: string;
  readonly reason: string;
  readonly issues: readonly string[];
};

export type RevokeEvent = {
  readonly schemaVersion: 1;
  readonly ulid: Ulid;
  readonly op: "revoke";
  readonly fingerprint: string;
};

export type SnapshotEffectiveEntry = {
  readonly fingerprint: string;
  readonly kind: GrantKind;
  readonly ruleId: RuleId;
  readonly file: string;
  readonly reason: string;
  readonly issues: readonly string[];
};

export type SnapshotEvent = {
  readonly schemaVersion: 1;
  readonly ulid: Ulid;
  readonly op: "snapshot";
  readonly effectiveDigest: string;
  readonly effective: readonly SnapshotEffectiveEntry[];
  readonly deleteUlids: readonly Ulid[];
};

export type LedgerEvent = GrantEvent | RevokeEvent | SnapshotEvent;

export type FoldedLedger = {
  readonly grandfather: readonly BaselineEntry[];
  readonly exemptions: readonly { readonly fingerprint: string; readonly reason: string }[];
  readonly effectiveDigest: string;
  readonly allowedMissingUlids: ReadonlySet<string>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseJson(text: string, label: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new InfraFailure("BASELINE_INVALID", `${label} is not valid JSON: ${String(error)}`);
  }
}

function requireIssues(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw) || raw.length === 0 || !raw.every((issue) => typeof issue === "string" && issue.trim() !== "")) {
    throw new InfraFailure("BASELINE_INVALID", `${label} requires a non-empty issues array`);
  }
  return raw as string[];
}

function parseGrantFields(raw: Record<string, unknown>, label: string): Omit<GrantEvent, "schemaVersion" | "ulid" | "op"> {
  const kind = raw.kind === "exemption" ? "exemption" : raw.kind === "grandfather" ? "grandfather" : null;
  if (kind === null) throw new InfraFailure("BASELINE_INVALID", `${label}.kind must be grandfather or exemption`);
  if (typeof raw.fingerprint !== "string" || raw.fingerprint.trim() === "") {
    throw new InfraFailure("BASELINE_INVALID", `${label}.fingerprint is invalid`);
  }
  if (!RULE_IDS.includes(raw.ruleId as RuleId)) {
    throw new InfraFailure("BASELINE_INVALID", `${label}.ruleId is invalid`);
  }
  if (typeof raw.file !== "string" || raw.file.startsWith("/") || raw.file.includes("..")) {
    throw new InfraFailure("BASELINE_INVALID", `${label}.file is invalid`);
  }
  if (typeof raw.reason !== "string" || raw.reason.trim() === "") {
    throw new InfraFailure("BASELINE_INVALID", `${label}.reason must be a non-empty string`);
  }
  return {
    kind,
    fingerprint: raw.fingerprint,
    ruleId: raw.ruleId as RuleId,
    file: raw.file,
    reason: raw.reason,
    issues: requireIssues(raw.issues, `${label}.issues`),
  };
}

function parseEffectiveEntry(raw: unknown, index: number, label: string): SnapshotEffectiveEntry {
  if (!isRecord(raw)) throw new InfraFailure("BASELINE_INVALID", `${label}.effective[${index}] is invalid`);
  return parseGrantFields(raw, `${label}.effective[${index}]`);
}

export function parseLedgerEvent(text: string, expectedFileUlid?: string): LedgerEvent {
  const label = expectedFileUlid === undefined ? "event" : `event ${expectedFileUlid}`;
  const raw = parseJson(text, label);
  if (!isRecord(raw) || raw.schemaVersion !== 1) {
    throw new InfraFailure("BASELINE_INVALID", `${label} must use schemaVersion 1`);
  }
  if (typeof raw.ulid !== "string" || !isUlid(raw.ulid)) {
    throw new InfraFailure("BASELINE_INVALID", `${label}.ulid is invalid`);
  }
  const ulid = parseUlid(raw.ulid, `${label}.ulid`);
  if (expectedFileUlid !== undefined && ulid !== expectedFileUlid) {
    throw new InfraFailure("BASELINE_INVALID", `${label} ulid does not match filename`);
  }
  if (raw.op === "grant") return { schemaVersion: 1, ulid, op: "grant", ...parseGrantFields(raw, label) };
  if (raw.op === "revoke") {
    if (typeof raw.fingerprint !== "string" || raw.fingerprint.trim() === "") {
      throw new InfraFailure("BASELINE_INVALID", `${label}.fingerprint is invalid`);
    }
    return { schemaVersion: 1, ulid, op: "revoke", fingerprint: raw.fingerprint };
  }
  if (raw.op === "snapshot") {
    if (typeof raw.effectiveDigest !== "string" || !/^[0-9a-f]{64}$/.test(raw.effectiveDigest)) {
      throw new InfraFailure("BASELINE_INVALID", `${label}.effectiveDigest is invalid`);
    }
    if (!Array.isArray(raw.effective)) {
      throw new InfraFailure("BASELINE_INVALID", `${label}.effective must be an array`);
    }
    if (!Array.isArray(raw.deleteUlids) || !raw.deleteUlids.every((value) => typeof value === "string" && isUlid(value))) {
      throw new InfraFailure("BASELINE_INVALID", `${label}.deleteUlids must be a ULID array`);
    }
    const deleteUlids = [...new Set(raw.deleteUlids as string[])].sort() as Ulid[];
    if (deleteUlids.length !== raw.deleteUlids.length) {
      throw new InfraFailure("BASELINE_INVALID", `${label}.deleteUlids contains duplicates`);
    }
    return {
      schemaVersion: 1,
      ulid,
      op: "snapshot",
      effectiveDigest: raw.effectiveDigest,
      effective: raw.effective.map((entry, index) => parseEffectiveEntry(entry, index, label)),
      deleteUlids,
    };
  }
  throw new InfraFailure("BASELINE_INVALID", `${label}.op must be grant, revoke, or snapshot`);
}

export type LoadedEvents = {
  readonly byUlid: ReadonlyMap<string, LedgerEvent>;
  readonly files: readonly string[];
};

/** Fail-closed directory load: one unreadable/invalid event aborts the whole set. */
export function loadEventsFromDir(eventsDir: string): LoadedEvents {
  let names: string[];
  try {
    names = readdirSync(eventsDir).filter((name) => name.endsWith(".json")).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new InfraFailure("BASELINE_MISSING", `event ledger is missing: ${eventsDir}`);
    }
    throw new InfraFailure("BASELINE_INVALID", `event ledger is unreadable: ${String(error)}`);
  }
  const byUlid = new Map<string, LedgerEvent>();
  for (const name of names) {
    const ulid = name.slice(0, -".json".length);
    if (!isUlid(ulid) || name !== `${ulid}.json`) {
      throw new InfraFailure("BASELINE_INVALID", `event filename is not <ulid>.json: ${name}`);
    }
    let text: string;
    try {
      text = readFileSync(join(eventsDir, name), "utf8");
    } catch (error) {
      throw new InfraFailure("BASELINE_INVALID", `event ${ulid} is unreadable: ${String(error)}`);
    }
    const event = parseLedgerEvent(text, ulid);
    byUlid.set(ulid, event);
  }
  return { byUlid, files: names };
}

export function loadEvents(repoRoot: string): LoadedEvents {
  return loadEventsFromDir(join(repoRoot, EVENTS_DIR));
}

type GrantMeta = {
  readonly fingerprint: string;
  readonly kind: GrantKind;
  readonly ruleId: RuleId;
  readonly file: string;
  readonly reason: string;
  readonly issues: readonly string[];
};

/**
 * Order-independent fold: effective = (grant events ∪ snapshot.effective) \ revokes.
 * Revoke always wins regardless of ULID order. Snapshot materialization lets retention
 * delete grant/revoke files without changing the folded set.
 */
export function foldEvents(events: Iterable<LedgerEvent>): FoldedLedger {
  const grants = new Map<string, GrantMeta>();
  const revokes = new Set<string>();
  const allowedMissing = new Set<string>();

  for (const event of events) {
    if (event.op === "grant") {
      grants.set(event.fingerprint, {
        fingerprint: event.fingerprint,
        kind: event.kind,
        ruleId: event.ruleId,
        file: event.file,
        reason: event.reason,
        issues: event.issues,
      });
    } else if (event.op === "revoke") {
      revokes.add(event.fingerprint);
    } else {
      for (const entry of event.effective) {
        grants.set(entry.fingerprint, entry);
      }
      for (const ulid of event.deleteUlids) allowedMissing.add(ulid);
    }
  }

  // Re-scan for snapshot integrity: each snapshot's deleteUlids must be absent.
  const presentUlids = new Set<string>();
  for (const event of events) presentUlids.add(event.ulid);
  for (const event of events) {
    if (event.op !== "snapshot") continue;
    for (const ulid of event.deleteUlids) {
      if (presentUlids.has(ulid)) {
        throw new InfraFailure(
          "BASELINE_INVALID",
          `snapshot ${event.ulid} lists ${ulid} for deletion but the event file is still present`,
        );
      }
    }
  }

  const grandfather: BaselineEntry[] = [];
  const exemptions: { fingerprint: string; reason: string }[] = [];
  for (const meta of grants.values()) {
    if (revokes.has(meta.fingerprint)) continue;
    if (meta.kind === "exemption") {
      exemptions.push({ fingerprint: meta.fingerprint, reason: meta.reason });
    } else {
      grandfather.push({
        fingerprint: meta.fingerprint,
        ruleId: meta.ruleId,
        file: meta.file,
        reason: meta.reason,
        issues: meta.issues,
      });
    }
  }
  grandfather.sort((a, b) => (a.fingerprint < b.fingerprint ? -1 : a.fingerprint > b.fingerprint ? 1 : 0));
  exemptions.sort((a, b) => (a.fingerprint < b.fingerprint ? -1 : a.fingerprint > b.fingerprint ? 1 : 0));
  const effectiveFingerprints = [
    ...grandfather.map((entry) => entry.fingerprint),
    ...exemptions.map((entry) => entry.fingerprint),
  ].sort();
  const effectiveDigest = digest(effectiveFingerprints.join("\n"));

  for (const event of events) {
    if (event.op === "snapshot" && event.effectiveDigest !== effectiveDigest) {
      // Snapshot digests are checked against the fold of the tree they describe.
      // After further grants/revokes the live digest may diverge; only require that
      // the snapshot's embedded effective set is self-consistent with its digest.
      const snapshotDigest = digest(
        [...event.effective.map((entry) => entry.fingerprint)].sort().join("\n"),
      );
      if (event.effectiveDigest !== snapshotDigest) {
        throw new InfraFailure(
          "BASELINE_INVALID",
          `snapshot ${event.ulid} effectiveDigest does not match its embedded effective set`,
        );
      }
    }
  }

  return {
    grandfather,
    exemptions,
    effectiveDigest,
    allowedMissingUlids: allowedMissing,
  };
}

export function baselineDocFromFold(
  folded: FoldedLedger,
  revision: string,
  censusDigest: string,
  approvalDigest = digest(""),
): BaselineDoc {
  return {
    schemaVersion: 1,
    direction: "shrink-only",
    generatedFrom: { revision, censusDigest, approvalDigest },
    entries: folded.grandfather,
  };
}

export function exemptionsDocFromFold(folded: FoldedLedger): ExemptionDoc {
  return { schemaVersion: 1, entries: folded.exemptions };
}

export function listEventUlidsAtRevision(repoRoot: string, sha: string): Set<string> {
  const listed = spawnSync(
    "git",
    ["ls-tree", "--name-only", sha, "--", EVENTS_DIR],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (listed.error || listed.status === null) {
    throw new InfraFailure("INTERNAL_ERROR", "trusted event ledger lookup could not start");
  }
  if (listed.status !== 0) {
    // Missing path → empty set (pre-migration base or bootstrap).
    return new Set();
  }
  const ulids = new Set<string>();
  for (const line of listed.stdout.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    const name = line.split("/").pop() ?? "";
    if (!name.endsWith(".json")) continue;
    const ulid = name.slice(0, -".json".length);
    if (!isUlid(ulid)) {
      throw new InfraFailure("BASELINE_INVALID", `trusted base event filename is not a ULID: ${name}`);
    }
    ulids.add(ulid);
  }
  return ulids;
}

/**
 * Chain-of-custody: base event files ⊆ head event files, except ULID files that a
 * head snapshot enumerates for deletion.
 */
export function assertEventCustody(
  repoRoot: string,
  trustedSha: string,
  head: LoadedEvents,
  folded: FoldedLedger,
): void {
  if (!/^[0-9a-f]{40}$/.test(trustedSha)) {
    throw new InfraFailure("BASELINE_INVALID", `trusted base must be a full commit: ${trustedSha}`);
  }
  const exists = spawnSync("git", ["cat-file", "-e", `${trustedSha}^{commit}`], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (exists.status !== 0) {
    throw new InfraFailure("BASELINE_INVALID", `trusted base is not a resolvable full commit: ${trustedSha}`);
  }

  const baseUlids = listEventUlidsAtRevision(repoRoot, trustedSha);
  const headUlids = new Set(head.byUlid.keys());
  const missing: string[] = [];
  for (const ulid of baseUlids) {
    if (!headUlids.has(ulid) && !folded.allowedMissingUlids.has(ulid)) missing.push(ulid);
  }
  if (missing.length > 0) {
    throw new InfraFailure(
      "BASELINE_INVALID",
      `event custody subset check failed; deleted without snapshot enumeration: ${missing.sort().join(", ")}`,
    );
  }
}

export function eventPath(ulid: string): string {
  return `${EVENTS_DIR}/${ulid}.json`;
}

export function encodeEvent(event: LedgerEvent): string {
  return `${JSON.stringify(event, null, 2)}\n`;
}
