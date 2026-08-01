// span-context.ts — the workflow context every span carries (FR-SPAN-1/2/3).
//
// Before this module a span said WHAT happened and, through the resource bag,
// WHERE the process ran — but not WHICH unit of work it belonged to. Answering
// "which spans were the code-generation stage of this intent" meant joining
// spans back to the audit journal by trace id. These six attributes put the
// answer on the span itself.
//
// The vocabulary is CLOSED (six keys) for the same reason the resource bag's
// is: it is what lets the redaction allow-list admit them by name rather than
// opening span attributes to arbitrary keys.
//
// Every key resolves under its own try (NFR-1, fail-open): one that cannot be
// measured is ABSENT. Absence is the whole contract here — the audit journal
// stamps "workspace"/"default" when the cursor does not resolve (BR-10, the
// journal row must name SOME ledger), but a span attribute has no such
// obligation, and a consumer grouping spans by intent must not be handed a
// bucket named after a fallback that describes no intent at all.
//
// Resolution happens ONCE per process. Amadeus tools are short-lived — one
// process serves one stage of one intent and exits — so the context cannot
// meaningfully change under a running process, and span end is a hot path that
// would otherwise re-read the cursor and the state file per span.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { activeIntent, activeSpace, getField, readStateFile, recordDir } from "../tools/amadeus-lib.ts";
import { BOLT_CONTEXT_MARKER } from "../tools/amadeus-observability.ts";
import { SPAN_CONTEXT_ATTRIBUTE_KEYS } from "./redaction.ts";

// The closed vocabulary this module resolves. Defined in redaction.ts — next to
// the allow-list that admits it — and re-exported here so a consumer can reach
// the key set from the module that owns their resolution.
export { SPAN_CONTEXT_ATTRIBUTE_KEYS };

// Resolve one attribute, absorbing any failure into absence (NFR-1). A blank
// result counts as unresolved: an empty attribute would force every consumer
// to know which empty values mean "unknown".
function put(bag: Record<string, string>, key: string, resolve: () => string | undefined | null): void {
  try {
    const value = resolve();
    if (value === undefined || value === null) return;
    const trimmed = value.trim();
    if (trimmed !== "") bag[key] = trimmed;
  } catch {
    // fail-open: the attribute is simply absent
  }
}

// The intent/space pair is measured as ONE step. Space alone describes no unit
// of work — it is the container an intent lives in — so a bag carrying a space
// with no intent would let a consumer group spans under a workspace while the
// intent that produced them is unknown. The journal's "workspace"/DEFAULT_SPACE
// fallback is deliberately NOT mirrored here (see the header).
// An UNRESOLVED cursor is the expected case and is handled here by the null
// check; the resolvers absorb their own filesystem failures. Anything they do
// throw is by definition unanticipated and belongs to the whole-bag guard in
// buildSpanContext, not to a local catch that would report a space with no
// intent.
function putIntentPair(bag: Record<string, string>, projectDir: string): void {
  const space = activeSpace(projectDir);
  const intent = activeIntent(projectDir, space);
  if (intent === null || intent.trim() === "" || space.trim() === "") return;
  bag["amadeus.intent.id"] = intent.trim();
  bag["amadeus.space"] = space.trim();
}

// Stage and phase come from the active intent's state file. The read is shared
// (one file, two fields) but each field still resolves under its own try: a
// state file that has advanced past one field but not the other should report
// the field it does have.
function putStagePair(bag: Record<string, string>, projectDir: string): void {
  let content: string;
  try {
    content = readStateFile(projectDir);
  } catch {
    return; // no state file — both attributes omitted
  }
  put(bag, "amadeus.stage", () => getField(content, "Current Stage"));
  put(bag, "amadeus.phase", () => getField(content, "Lifecycle Phase"));
}

// Read the marker of whichever workspace is being asked about. Each Bolt
// worktree has its own record dir, so two concurrent Bolts resolve their own
// marker with no shared state between them.
function putConstructionPair(bag: Record<string, string>, projectDir: string): void {
  let parsed: unknown;
  try {
    const record = recordDir(projectDir);
    if (record === null) return;
    parsed = JSON.parse(readFileSync(join(record, BOLT_CONTEXT_MARKER), "utf-8"));
  } catch {
    return; // no marker, unreadable, or not JSON — both keys omitted
  }
  if (parsed === null || typeof parsed !== "object") return;
  const marker = parsed as Record<string, unknown>;
  put(bag, "amadeus.bolt", () => (typeof marker.bolt === "string" ? marker.bolt : undefined));
  put(bag, "amadeus.unit", () => (typeof marker.unit === "string" ? marker.unit : undefined));
}

// Assemble the bag from scratch. Exported for tests and for anything needing an
// unmemoised read; callers wanting the process-wide value use
// `spanContextAttributes`.
export function buildSpanContext(projectDir: string): Record<string, string> {
  const bag: Record<string, string> = {};
  try {
    putIntentPair(bag, projectDir);
    putStagePair(bag, projectDir);
    putConstructionPair(bag, projectDir);
    put(bag, "amadeus.agent.type", () => process.env.AMADEUS_AGENT_TYPE);
    put(bag, "amadeus.agent.id", () => process.env.AMADEUS_AGENT_ID);
  } catch {
    // A failure the per-key guards did not anticipate degrades to NO context
    // rather than to a partial bag: the keys are resolved as pairs, and half a
    // pair would describe a unit of work that was never observed. Span creation
    // continues either way (NFR-1).
    return {};
  }
  return bag;
}

type Memo = {
  readonly projectDir: string;
  readonly attributes: Record<string, string>;
};

let memo: Memo | null = null;

// The process-wide context bag. Rebuilt only when a DIFFERENT workspace is
// asked about — a test harness drives many fixture projects through one
// process, and answering the second from the first's memo would attribute its
// spans to the wrong intent.
export function spanContextAttributes(projectDir: string): Record<string, string> {
  if (memo === null || memo.projectDir !== projectDir) {
    memo = { projectDir, attributes: buildSpanContext(projectDir) };
  }
  return memo.attributes;
}

// Test seam: the memo is per-process by design, so fixtures drop it the same
// way they drop the provider registrations.
export function resetSpanContextForTests(): void {
  memo = null;
}
