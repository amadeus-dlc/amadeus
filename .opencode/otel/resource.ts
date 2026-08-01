// resource.ts — the single resource assembly point (FR-RES-1/2/4, ADR-1).
//
// Before this module the resource concept existed as a two-key literal inside
// one span record, so logs and metrics carried no provenance at all and spans
// carried almost none. Assembly lives here instead, once, and all three
// signals read the SAME bag — a per-signal copy would drift the moment one of
// them learned a new attribute.
//
// Every attribute resolves under its own try (NFR-1, fail-open): a key that
// cannot be measured is ABSENT from the bag. It is never null and never the
// empty string, because a consumer filtering on presence must not have to also
// know which empty values mean "unknown".
//
// The bag is read through `currentResource`, a memoised getter rather than a
// snapshot taken at provider registration. Harness-supplied attributes
// (resource-suppliers.ts) can land after the providers are standing — a
// SessionStart hook supplies the conversation id, and the tracer was already
// registered — so a snapshot would silently persist the pre-supply bag for the
// rest of the process.
//
// Redaction runs HERE as well as at each export boundary (FR-RES-4). The
// write-time pass is what makes a supplied credential-shaped value harmless
// even to a consumer that reads the bag without going through a store.

import { execFileSync } from "node:child_process";
import { hostname } from "node:os";
import { auditCloneId, detectHarnessType } from "../tools/amadeus-lib.ts";
import { AMADEUS_VERSION } from "../tools/amadeus-version.ts";
import { CREDENTIAL_SCRUB_PATTERNS, redactAttributes } from "./redaction.ts";
import type { RedactionPolicy } from "./redaction.ts";
import { SUPPLIED_RESOURCE_KEYS, suppliedResourceAttributes, supplyGeneration } from "./resource-suppliers.ts";

// How a consumer learns the resource. A getter rather than a value: a harness
// supplies session id / model AFTER the providers are standing (ADR-1), and a
// value captured at registration would pin every later record to the
// pre-supply bag.
export type ResourceGetter = () => Record<string, string>;

export const SERVICE_NAME = "amadeus";
export const TELEMETRY_SDK_LANGUAGE = "typescript";

// The attributes core measures for itself.
const NEUTRAL_RESOURCE_KEYS = [
  "service.name",
  "service.version",
  "telemetry.sdk.language",
  "deployment.environment.name",
  "host.name",
  "amadeus.clone_id",
  "amadeus.operating_mode",
  "amadeus.harness",
] as const;

// The pair measured from git, omitted together when the directory is not a
// work tree.
const VCS_RESOURCE_KEYS = ["vcs.ref.head.name", "vcs.ref.head.revision"] as const;

// The whole closed vocabulary: what core measures, what git yields, and what a
// harness may supply. Nothing else can enter the bag — which is also what
// makes the redaction policy below expressible as an allow-list.
export const RESOURCE_ATTRIBUTE_KEYS: readonly string[] = [
  ...NEUTRAL_RESOURCE_KEYS,
  ...VCS_RESOURCE_KEYS,
  ...SUPPLIED_RESOURCE_KEYS,
];

// The resource bag's own redaction policy. It reuses the shared machinery
// (redactAttributes + the one compiled credential vocabulary) but carries its
// OWN safe keys: the default policy admits the registry's event attributes,
// which have no overlap with resource keys, so redacting the bag under it
// would empty the bag. Default-deny still holds — the allow-list is the closed
// resource vocabulary — and every admitted value is credential-scrubbed,
// because a supplied model name or branch name is free text from outside core.
export const RESOURCE_REDACTION_POLICY: RedactionPolicy = {
  safeKeys: RESOURCE_ATTRIBUTE_KEYS,
  optIn: [],
  scrubPatterns: CREDENTIAL_SCRUB_PATTERNS,
};

// One redaction pass over a resource bag. Exported because the export-boundary
// layer (each local exporter) applies the same policy to whatever bag reaches
// it, including one assembled before this module's own pass existed.
export function redactResource(bag: Record<string, string>): Record<string, string> {
  return redactAttributes(bag, RESOURCE_REDACTION_POLICY) as Record<string, string>;
}

// Resolve one attribute, absorbing any failure into absence (NFR-1). A blank
// result is treated as unresolved for the same reason a supplier refuses one.
function put(bag: Record<string, string>, key: string, resolve: () => string | undefined): void {
  try {
    const value = resolve();
    if (value === undefined) return;
    const trimmed = value.trim();
    if (trimmed !== "") bag[key] = trimmed;
  } catch {
    // fail-open: the attribute is simply absent
  }
}

function deploymentEnvironment(): string {
  return process.env.GITHUB_ACTIONS !== undefined || process.env.CI !== undefined ? "ci" : "local";
}

function git(projectDir: string, args: string[]): string {
  return execFileSync("git", args, { cwd: projectDir, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

// The vcs pair is measured as ONE step: a directory that cannot answer for its
// head revision cannot answer for its branch either, and reporting one half
// would describe a checkout that was never observed.
function putVcs(bag: Record<string, string>, projectDir: string): void {
  try {
    const name = git(projectDir, ["rev-parse", "--abbrev-ref", "HEAD"]);
    const revision = git(projectDir, ["rev-parse", "HEAD"]);
    if (name === "" || revision === "") return;
    bag["vcs.ref.head.name"] = name;
    bag["vcs.ref.head.revision"] = revision;
  } catch {
    // not a work tree, or git is unavailable — both vcs attributes omitted
  }
}

// Assemble the bag from scratch. Callers wanting the process-wide value use
// `currentResource`; this is exported for tests and for anything that needs an
// unmemoised read.
export function buildResource(projectDir: string): Record<string, string> {
  const bag: Record<string, string> = {};
  put(bag, "service.name", () => SERVICE_NAME);
  put(bag, "service.version", () => AMADEUS_VERSION);
  put(bag, "telemetry.sdk.language", () => TELEMETRY_SDK_LANGUAGE);
  put(bag, "deployment.environment.name", deploymentEnvironment);
  put(bag, "host.name", () => hostname());
  put(bag, "amadeus.clone_id", () => auditCloneId(projectDir));
  put(bag, "amadeus.operating_mode", () => process.env.AMADEUS_OPERATING_MODE ?? "solo");
  put(bag, "amadeus.harness", () => detectHarnessType());
  putVcs(bag, projectDir);
  for (const [key, value] of Object.entries(suppliedResourceAttributes())) {
    put(bag, key, () => value);
  }
  return redactResource(bag);
}

type Memo = {
  readonly projectDir: string;
  readonly generation: number;
  readonly bag: Record<string, string>;
};

let memo: Memo | null = null;

// The process-wide bag. Rebuilt when a supplier has landed since the last read
// (the generation moved) or when a different workspace is asked about —
// otherwise the memo answers, because span end is a hot path and the neutral
// half of the bag costs a git subprocess to measure.
export function currentResource(projectDir: string): Record<string, string> {
  const generation = supplyGeneration();
  if (memo === null || memo.projectDir !== projectDir || memo.generation !== generation) {
    memo = { projectDir, generation, bag: buildResource(projectDir) };
  }
  return memo.bag;
}

// Test seam: the memo is per-process by design, so fixtures drop it the same
// way they drop the provider registrations.
export function resetResourceForTests(): void {
  memo = null;
}
