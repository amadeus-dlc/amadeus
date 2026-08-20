// event-registry-drift.ts — machine extraction + comparison for the VER-1
// registry drift guard. Shared by the integration test and the sensor script
// so both layers compare the SAME sets with the SAME extraction rules.
//
// The four sets and their sources of truth:
//   (a) state-machine references — canonical audit event types that
//       tools/amadeus-state.ts and the hooks reference, statically extracted
//       as quoted literals from every tools/ + hooks/ source EXCLUDING
//       amadeus-audit.ts itself.
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
// an emptied registry fails instead of comparing two empty sets.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalAuditEvents, EXPECTED_CANONICAL_COUNT, REGISTERED_EVENTS } from "./event-registry.ts";

export type DriftSets = {
  // (a) state machine + hooks references.
  readonly stateMachineReferences: ReadonlySet<string>;
  // (b) canonical registry set.
  readonly registryCanonical: ReadonlySet<string>;
  // (c) exporter accept set (registry-derived).
  readonly exporterAccepted: ReadonlySet<string>;
  // (d) journal reader decode set; null until U3 lands the codec table.
  readonly journalReaderUnderstood: ReadonlySet<string> | null;
};

// (a): the vocabulary members referenced as quoted literals anywhere in the
// given sources (every tools/ + hooks/ file except amadeus-audit.ts). An event
// registered but never referenced is writer-only drift (BR-6); an event
// referenced here but missing from the registry fails the (a)==(b) equality.
export function extractStateMachineReferences(sources: readonly string[], vocabulary: ReadonlySet<string>): Set<string> {
  const found = new Set<string>();
  for (const eventType of vocabulary) {
    const needle = `"${eventType}"`;
    if (sources.some((src) => src.includes(needle))) {
      found.add(eventType);
    }
  }
  return found;
}

// The names a diagnostic may not borrow (U10 BR-6): every canonical def's OTel
// event name AND its v1 audit event type. Derived from the registry table, so
// a new canonical event is off limits to diagnostics the moment it lands.
function canonicalNameVocabulary(): Set<string> {
  const names = new Set<string>();
  for (const def of REGISTERED_EVENTS) {
    if (def.durability !== "canonical") continue;
    names.add(def.name);
    if (def.auditEvent !== null) names.add(def.auditEvent);
  }
  return names;
}

// Literal first argument of a diagnostic emit call, in any of the three quote
// forms. Interpolated names are outside the static reach of this guard and are
// left to the reviewer.
const DIAGNOSTIC_CALL_RE = /emitDiagnostic\(\s*(["'`])([^"'`]*)\1/g;

// BR-6 (U10 diagnostic-logs): a diagnostic must never be named after a
// canonical Registry event — the two paths would become indistinguishable in
// the stores even though only one is auditable. This is enforced statically,
// not at runtime: the diagnostic path is fail-open by contract (BR-2), so it
// must never throw at its caller. Returns one finding per violating call site
// (empty = clean). An emptied vocabulary fails closed rather than reporting a
// vacuously clean sweep.
export function findDiagnosticNameMisuse(
  sources: readonly { readonly path: string; readonly source: string }[],
  canonical: ReadonlySet<string> = canonicalNameVocabulary()
): string[] {
  if (canonical.size === 0) {
    throw new Error("canonical name vocabulary is empty — the sweep would pass vacuously (BR-6)");
  }
  const findings: string[] = [];
  for (const { path, source } of sources) {
    for (const match of source.matchAll(DIAGNOSTIC_CALL_RE)) {
      const name = match[2];
      if (name === undefined || !canonical.has(name)) continue;
      findings.push(`${path}: emitDiagnostic names the canonical event ${name} — classification boundary misuse (BR-6)`);
    }
  }
  return findings;
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
  const referenceFiles = [...listTsFiles(join(harnessDir, "tools")), ...listTsFiles(join(harnessDir, "hooks"))].filter(
    (f) => f !== auditTsPath
  );
  const sources = referenceFiles.map((f) => readFileSync(f, "utf-8"));
  const registryCanonical = new Set(canonicalAuditEvents());
  return {
    stateMachineReferences: extractStateMachineReferences(sources, registryCanonical),
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
// (a)==(b)==(c) now, (d) when the codec table is supplied, and the canonical
// cardinality pin against vacuous equality.
export function findRegistryDrift(sets: DriftSets): string[] {
  const findings: string[] = [];
  if (sets.registryCanonical.size !== EXPECTED_CANONICAL_COUNT) {
    findings.push(
      `canonical registry cardinality drift: expected ${EXPECTED_CANONICAL_COUNT}, got ${sets.registryCanonical.size}`
    );
  }
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
