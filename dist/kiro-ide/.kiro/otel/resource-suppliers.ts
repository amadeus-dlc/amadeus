// resource-suppliers.ts — the harness-dependent attribute supply seam
// (FR-RES-3, ADR-2).
//
// Four resource attributes cannot be resolved from the harness-neutral core:
// the conversation id, the model, the agent role, and the harness's own
// version exist only in a hook payload. They arrive here instead, pushed by
// whichever harness surface sees them, and `resource.ts` reads them back when
// it assembles the bag.
//
// This module is a LEAF: it imports nothing from the otel tree. That is what
// keeps the dependency one-way (resource → suppliers) and the cycle absent —
// so memo invalidation is published as a generation counter the reader polls
// rather than a callback the supplier would have to hold.
//
// Admission is fail-closed on BOTH axes (ADR-2): a key outside the closed set
// is refused, and a second supply of the same key is refused rather than
// overwriting. Everything downstream of a supplied value is fail-open — an
// attribute nobody supplied is simply absent from the bag.

// The closed key set (#1868 §1, harness-dependent half). Ordered as declared
// so the literal reads as the spec's list.
export const SUPPLIED_RESOURCE_KEYS = [
  "amadeus.harness.version",
  "gen_ai.request.model",
  "session.id",
  "amadeus.agent.role",
] as const;

export type SuppliedResourceKey = (typeof SUPPLIED_RESOURCE_KEYS)[number];

// Token counts a harness observed for one exchange, handed to whichever sink
// the metrics arm installed (see supplyTokenUsage).
export type TokenUsage = {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly model?: string;
};

const supplied = new Map<SuppliedResourceKey, string>();
let generation = 0;

function isSuppliedKey(key: string): key is SuppliedResourceKey {
  return (SUPPLIED_RESOURCE_KEYS as readonly string[]).includes(key);
}

// Supply one harness-dependent attribute. Throws on an unknown key, a repeat
// supply, or a blank value — a blank would persist an attribute that says
// nothing, where the fail-open shape is for it to be absent entirely.
export function supplyResourceAttribute(key: SuppliedResourceKey, value: string): void {
  // The type narrows the call site; the runtime check is what holds when the
  // caller is a hook parsing an untyped payload.
  if (!isSuppliedKey(key)) {
    throw new Error(`${key} is not a supplied resource key — invariant violation (FR-RES-3)`);
  }
  if (supplied.has(key)) {
    throw new Error(`${key} already supplied — resource attributes are set once (FR-RES-3)`);
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new Error(`${key} supplied empty — omit the attribute instead (FR-RES-3)`);
  }
  supplied.set(key, trimmed);
  generation += 1;
}

// Everything supplied so far, as a fresh object: the reader composes it into
// the resource bag, and a caller mutating what it got back must not be able to
// rewrite the registry.
export function suppliedResourceAttributes(): Readonly<Record<string, string>> {
  return Object.fromEntries(supplied);
}

// How many supplies have been accepted in this process. `resource.ts` memoises
// against this value, so a supply that lands AFTER the bag was first read
// invalidates the memo without this module knowing the reader exists (ADR-1).
export function supplyGeneration(): number {
  return generation;
}

// Where a supplied token count goes. Installed by the bootstrap seam rather
// than imported, for the same reason the memo invalidation above is a polled
// counter: this module is a LEAF, and importing the metrics arm — which reaches
// the exporter, which reaches back here for the resource bag — would close a
// cycle. Absent until the metrics arm stands up, which is also the honest
// default: nothing consumes token counts in a process with no Meter.
export type TokenUsageSink = (usage: TokenUsage) => void;

let tokenUsageSink: TokenUsageSink | null = null;

export function setTokenUsageSink(sink: TokenUsageSink): void {
  tokenUsageSink = sink;
}

// Token-usage supply seam (FR-MET-3, #1868 §6). Fail-open on BOTH halves: a
// hook that supplies before the metrics arm is up is dropped rather than
// failing the session, and a sink that throws never reaches the harness —
// telemetry does not get to break the surface that produced it.
export function supplyTokenUsage(usage: TokenUsage): void {
  if (tokenUsageSink === null) return;
  try {
    tokenUsageSink(usage);
  } catch {
    // fail-open
  }
}

// Test seam: per-process state, dropped between fixtures.
export function resetSuppliersForTests(): void {
  supplied.clear();
  generation = 0;
  tokenUsageSink = null;
}
