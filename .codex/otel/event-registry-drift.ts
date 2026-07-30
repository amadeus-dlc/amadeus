// event-registry-drift.ts — machine extraction + comparison for the VER-1
// four-set drift guard. Shared by the unit test
// (tests/unit/event-registry-drift.test.ts) and the sensor script
// (tools/amadeus-sensor-event-registry-drift.ts) so both layers compare the
// SAME sets with the SAME extraction rules.
//
// The four sets and their sources of truth:
//   (a) state-machine references — the audit event types that
//       tools/amadeus-state.ts and the hooks reference, statically extracted
//       as quoted literals from every tools/ + hooks/ source EXCLUDING
//       amadeus-audit.ts's own vocabulary table.
//   (b) canonical registry — the auditEvent names of the registry's
//       canonical defs (event-registry.ts).
//   (c) exporter accept set — the AuditLogExporter dispatches any canonical
//       def via getEventDef, so (c) is DERIVED from (b); the unit test
//       additionally exercises the real exporter per canonical event so the
//       derivation cannot silently decouple. U4 hardens the exporter; this
//       derivation stays registry-driven.
//   (d) journal reader decode set — null until the U3 codec table lands. The
//       v1 reader (amadeus-journal.ts) accepts any event name, so there is no
//       closed set to compare yet; the unit test asserts the open reader
//       decodes every canonical event in the meantime. When the codec table
//       exists, pass it in and equality with (b) is enforced.
//
// Vacuous equality is banned by the EXPECTED_CANONICAL_COUNT cardinality pin:
// an emptied vocabulary or registry fails instead of comparing two empty sets.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalAuditEvents, EXPECTED_CANONICAL_COUNT } from "./event-registry.ts";

export type DriftSets = {
  // VALID_EVENT_TYPES — the v1 writer's closed vocabulary (78, #1672).
  readonly auditVocabulary: ReadonlySet<string>;
  // (a) state machine + hooks references.
  readonly stateMachineReferences: ReadonlySet<string>;
  // (b) canonical registry set.
  readonly registryCanonical: ReadonlySet<string>;
  // (c) exporter accept set (registry-derived).
  readonly exporterAccepted: ReadonlySet<string>;
  // (d) journal reader decode set; null until U3 lands the codec table.
  readonly journalReaderUnderstood: ReadonlySet<string> | null;
};

// Extract VALID_EVENT_TYPES members from amadeus-audit.ts source: the lines
// between `new Set([` and `]);`, all "[A-Z0-9_]+" double-quoted tokens,
// deduped + sorted (the same rule t28 uses, so the two guards cannot
// disagree on the vocabulary).
export function extractAuditVocabulary(auditTsSource: string): string[] {
  const lines = auditTsSource.split("\n");
  const block: string[] = [];
  let inRange = false;
  for (const line of lines) {
    if (!inRange) {
      if (/const VALID_EVENT_TYPES = new Set\(\[/.test(line)) {
        inRange = true;
        block.push(line);
      }
      continue;
    }
    block.push(line);
    if (/^\]\);/.test(line)) break;
  }
  if (block.length === 0) {
    throw new Error("VALID_EVENT_TYPES table not found in amadeus-audit.ts source");
  }
  const matches = block.join("\n").match(/"[A-Z0-9_]+"/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))].sort();
}

// (a): the vocabulary members referenced as quoted literals anywhere in the
// given sources (every tools/ + hooks/ file except the defining table). An
// event registered but never referenced is writer-only drift (BR-6); an event
// referenced here but missing from the registry fails the (a)==(b) equality.
export function extractStateMachineReferences(sources: readonly string[], vocabulary: readonly string[]): Set<string> {
  const found = new Set<string>();
  for (const eventType of vocabulary) {
    const needle = `"${eventType}"`;
    if (sources.some((src) => src.includes(needle))) {
      found.add(eventType);
    }
  }
  return found;
}

function listTsFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(dir, f));
}

// Collect all sets from a harness dir (the dir containing tools/, hooks/,
// otel/). Throws on missing sources — a guard that cannot read its sources
// fails closed.
export function collectDriftSets(harnessDir: string): DriftSets {
  const auditTsPath = join(harnessDir, "tools", "amadeus-audit.ts");
  const auditTs = readFileSync(auditTsPath, "utf-8");
  const vocabulary = extractAuditVocabulary(auditTs);
  const referenceFiles = [...listTsFiles(join(harnessDir, "tools")), ...listTsFiles(join(harnessDir, "hooks"))].filter(
    (f) => f !== auditTsPath
  );
  const sources = referenceFiles.map((f) => readFileSync(f, "utf-8"));
  const registryCanonical = new Set(canonicalAuditEvents());
  return {
    auditVocabulary: new Set(vocabulary),
    stateMachineReferences: extractStateMachineReferences(sources, vocabulary),
    registryCanonical,
    // (c): the exporter dispatches any canonical def via getEventDef — same
    // source as (b), so the accept set is derived, not re-declared.
    exporterAccepted: new Set(registryCanonical),
    journalReaderUnderstood: null,
  };
}

function diff(name: string, left: ReadonlySet<string>, right: ReadonlySet<string>, rightName: string): string[] {
  const findings: string[] = [];
  for (const v of left) {
    if (!right.has(v)) findings.push(`${name} event missing from ${rightName}: ${v}`);
  }
  for (const v of right) {
    if (!left.has(v)) findings.push(`${rightName} event missing from ${name}: ${v}`);
  }
  return findings;
}

// Compare the sets; returns drift findings (empty = consistent). Enforces
// (a)==(b)==(c) now, (d) when the codec table is supplied, and the 78
// cardinality pin against vacuous equality.
export function findRegistryDrift(sets: DriftSets): string[] {
  const findings: string[] = [];
  if (sets.auditVocabulary.size !== EXPECTED_CANONICAL_COUNT) {
    findings.push(
      `audit vocabulary cardinality drift: expected ${EXPECTED_CANONICAL_COUNT}, got ${sets.auditVocabulary.size}`
    );
  }
  if (sets.registryCanonical.size !== EXPECTED_CANONICAL_COUNT) {
    findings.push(
      `canonical registry cardinality drift: expected ${EXPECTED_CANONICAL_COUNT}, got ${sets.registryCanonical.size}`
    );
  }
  findings.push(...diff("audit vocabulary", sets.auditVocabulary, sets.registryCanonical, "canonical registry"));
  findings.push(
    ...diff("state machine reference", sets.stateMachineReferences, sets.registryCanonical, "canonical registry")
  );
  findings.push(...diff("exporter accept", sets.exporterAccepted, sets.registryCanonical, "canonical registry"));
  if (sets.journalReaderUnderstood !== null) {
    findings.push(
      ...diff("journal reader decode", sets.journalReaderUnderstood, sets.registryCanonical, "canonical registry")
    );
  }
  return findings;
}
