import { canonicalIdentity } from "./canonical.ts";
import { isUtcInstant, type CellResult, type Result } from "./contract.ts";
import {
  TLA_NAMED_INVARIANTS,
  validateFrozenTlaModelReceipt,
  type FrozenTlaModelBundle,
  type FrozenTlaModelReceipt,
  type TlaInvariantSourceLocation,
  type TlaNamedInvariant,
} from "./tla-arm.ts";

function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const item of value) deepFreeze(item);
  } else if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) deepFreeze(item);
  }
  return Object.freeze(value);
}

export const FIXED_TLC_ARTIFACT_DESCRIPTOR = deepFreeze({
  version: "1.7.4",
  url: "https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar",
  sha256: "936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88",
  fileName: "tla2tools.jar",
  redirectOrigins: ["github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"],
  maxBytes: 134_217_728,
  integrity: "HASH_ONLY",
} as const);

export const FIXED_TLC_PROFILE = deepFreeze({
  voters: ["V1", "V2", "V3"],
  choices: ["C1", "C2", "C3"],
  unknownChoice: "UNKNOWN_CHOICE",
  submittedAt: ["T0", "T1", "T2", "INVALID_FORMAT", "INVALID_DATE"],
  receivedAt: ["T0", "T1", "T2"],
  unknownReference: "UNKNOWN_REF",
  goa: [1, 2, 3, 4, 5, 6, 7, 8],
  budgets: {
    initialPerVoter: 1,
    amendPerVoter: 1,
    globalHold: 1,
  },
  workers: 1,
} as const);

export const FIXED_JDK_RUN_PROFILE = deepFreeze({
  vendor: "OpenJDK",
  version: "26.0.1",
  jvmArgs: [
    "-Xms256m",
    "-Xmx1024m",
    "-XX:+UseParallelGC",
    "-Dfile.encoding=UTF-8",
    "-Duser.language=en",
    "-Duser.country=US",
    "-Duser.timezone=UTC",
  ],
  locale: "en_US",
  timezone: "UTC",
} as const);

export type TlcArtifactDescriptor = typeof FIXED_TLC_ARTIFACT_DESCRIPTOR;
export type TlcProfile = typeof FIXED_TLC_PROFILE;
export type JdkRunProfile = typeof FIXED_JDK_RUN_PROFILE;

export type ToolchainDomainError =
  | { kind: "ArtifactDescriptorError"; message: string }
  | { kind: "TlcProfileError"; message: string }
  | { kind: "JdkRunProfileError"; message: string }
  | { kind: "JdkDistributionError"; message: string }
  | { kind: "SandboxReceiptError"; message: string }
  | { kind: "RunManifestError"; message: string };

const ARTIFACT_DOMAIN = "amadeus.formal-verif.tlc-artifact-descriptor.v1";
const PROFILE_DOMAIN = "amadeus.formal-verif.tlc-profile.v1";
const JDK_DOMAIN = "amadeus.formal-verif.jdk-run-profile.v1";
const JDK_DISTRIBUTION_DOMAIN = "amadeus.formal-verif.jdk-distribution.v1";
const JDK_SNAPSHOT_DOMAIN = "amadeus.formal-verif.jdk-snapshot.v1";
const SANDBOX_PROVIDER_DOMAIN = "amadeus.formal-verif.sandbox-provider.v1";
const SANDBOX_POLICY_DOMAIN = "amadeus.formal-verif.network-deny-policy.v1";
const SANDBOX_RECEIPT_DOMAIN = "amadeus.formal-verif.sandbox-probe-receipt.v1";
const RUN_MANIFEST_DOMAIN = "amadeus.formal-verif.tlc-run-manifest.v1";

export const FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY = canonicalIdentity(
  FIXED_TLC_ARTIFACT_DESCRIPTOR,
  ARTIFACT_DOMAIN,
).sha256;
export const FIXED_TLC_PROFILE_IDENTITY = canonicalIdentity(FIXED_TLC_PROFILE, PROFILE_DOMAIN).sha256;
export const FIXED_JDK_RUN_PROFILE_IDENTITY = canonicalIdentity(FIXED_JDK_RUN_PROFILE, JDK_DOMAIN).sha256;
export const DARWIN_SANDBOX_PROVIDER_IDENTITY = canonicalIdentity({
  platform: "darwin",
  executable: "/usr/bin/sandbox-exec",
  provider: "DarwinSandboxExecProvider",
}, SANDBOX_PROVIDER_DOMAIN).sha256;
export const DARWIN_NETWORK_DENY_POLICY_IDENTITY = canonicalIdentity({
  defaultPolicy: "DENY",
  networkPolicy: "DENY_ALL",
  probes: ["TCP_LOOPBACK", "UDP_LOOPBACK", "DNS"],
}, SANDBOX_POLICY_DOMAIN).sha256;
export const MAX_TLC_STREAM_BYTES = 16 * 1024 * 1024;
interface TlcEnvelope {
  code: number;
  severity: number;
  payload: string;
}

export interface TlcOutputInput {
  chunks: Uint8Array[];
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  expectedModuleName: string;
  expectedModulePath: string;
  expectedStandardModuleDirectory: string;
  verifiedArtifactDescriptorIdentity: string;
  modelReceipt: FrozenTlaModelReceipt;
}
export interface CompleteTlcExploration {
  kind: "COMPLETE";
  generatedStates: number;
  distinctStates: number;
  statesLeftOnQueue: 0;
  searchDepth: number;
  completionMarker: "Model checking completed. No error has been found.";
  terminationReason: "EXHAUSTED";
}
export interface TlcTraceState {
  ordinal: number;
  label: string;
  body: string[];
}
export interface CounterexampleTlcExploration {
  kind: "COUNTEREXAMPLE";
  invariant: string;
  sourceLocation: TlaInvariantSourceLocation;
  trace: TlcTraceState[];
  counterexampleIdentity: string;
  generatedStates: number | null;
  distinctStates: number | null;
  statesLeftOnQueue: number | null;
  searchDepth: number | null;
}
export interface FailedTlcExploration {
  kind: "HARNESS_ERROR";
  reason: "TIMEOUT" | "SIGNAL" | "OUTPUT_CAPACITY" | "UTF8" | "GRAMMAR" | "OUTCOME_MISMATCH";
  detail: string;
}
export type TlcExploration = CompleteTlcExploration | CounterexampleTlcExploration | FailedTlcExploration;

const MAX_TLC_OUTPUT_BYTES = 16 * 1024 * 1024;
const START = /^@!@!@STARTMSG ([0-9]+):([0-9]+) @!@!@$/;
const END = /^@!@!@ENDMSG ([0-9]+) @!@!@$/;
const ALLOWED_CODES = new Map<number, { severity: number; repeat: boolean }>([
  [2262, { severity: 0, repeat: false }],
  [2187, { severity: 0, repeat: false }],
  [2220, { severity: 0, repeat: false }],
  [2219, { severity: 0, repeat: false }],
  [2185, { severity: 0, repeat: false }],
  [2189, { severity: 0, repeat: false }],
  [2190, { severity: 0, repeat: false }],
  [2193, { severity: 0, repeat: false }],
  [2200, { severity: 0, repeat: true }],
  [2199, { severity: 0, repeat: false }],
  [2194, { severity: 0, repeat: false }],
  [2268, { severity: 0, repeat: false }],
  [2186, { severity: 0, repeat: false }],
  [2107, { severity: 1, repeat: false }],
  [2110, { severity: 1, repeat: false }],
  [2121, { severity: 1, repeat: false }],
  [2217, { severity: 4, repeat: true }],
]);

function failed(reason: FailedTlcExploration["reason"], detail: string): FailedTlcExploration {
  return { kind: "HARNESS_ERROR", reason, detail };
}

function decodeChunks(chunks: Uint8Array[]): string | FailedTlcExploration {
  let total = 0;
  for (const chunk of chunks) {
    total += chunk.byteLength;
    if (!Number.isSafeInteger(total) || total > MAX_TLC_OUTPUT_BYTES) return failed("OUTPUT_CAPACITY", "TLC stdout exceeds 16 MiB");
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const normalized = decoded.replaceAll("\r\n", "\n");
    if (normalized.includes("\r")) return failed("GRAMMAR", "lone carriage return");
    if (!normalized.endsWith("\n")) return failed("GRAMMAR", "stdout is not LF/EOF closed");
    return normalized;
  } catch {
    return failed("UTF8", "stdout is not valid UTF-8");
  }
}

const STANDARD_MODULES = ["Naturals", "Sequences", "FiniteSets", "TLC"] as const;
function parsedAuxiliaryModule(line: string, input: TlcOutputInput): string | null {
  if (line === `Parsing file ${input.expectedModulePath}`) return input.expectedModuleName;
  const directory = input.expectedStandardModuleDirectory.replace(/\/+$/, "");
  return STANDARD_MODULES.find((module) => line === `Parsing file ${directory}/${module}.tla`) ?? null;
}

type EnvelopeRead = { ok: true; envelope: TlcEnvelope; next: number; repeat: boolean } | { ok: false; error: FailedTlcExploration };

function readEnvelope(lines: string[], startIndex: number): EnvelopeRead {
  const start = START.exec(lines[startIndex]!);
  if (start === null) return { ok: false, error: failed("GRAMMAR", `unframed output at line ${startIndex + 1}`) };
  const code = Number(start[1]);
  const severity = Number(start[2]);
  const spec = ALLOWED_CODES.get(code);
  if (spec === undefined || severity !== spec.severity || severity === 3) {
    return { ok: false, error: failed("GRAMMAR", `unknown code or severity ${code}:${severity}`) };
  }
  const payload: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const candidate = lines[index]!;
    if (START.test(candidate)) return { ok: false, error: failed("GRAMMAR", `nested STARTMSG for ${code}`) };
    const end = END.exec(candidate);
    if (end === null) {
      payload.push(candidate);
      continue;
    }
    if (Number(end[1]) !== code) return { ok: false, error: failed("GRAMMAR", `mismatched ENDMSG for ${code}`) };
    return { ok: true, envelope: { code, severity, payload: payload.join("\n") }, next: index + 1, repeat: spec.repeat };
  }
  return { ok: false, error: failed("GRAMMAR", `unclosed STARTMSG for ${code}`) };
}

function parseEnvelopes(output: string, input: TlcOutputInput): TlcEnvelope[] | FailedTlcExploration {
  const lines = output.split("\n");
  lines.pop();
  const envelopes: TlcEnvelope[] = [];
  const seen = new Map<number, number>();
  const moduleTranscript: string[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index]!;
    const parsedModule = parsedAuxiliaryModule(line, input);
    if (parsedModule !== null) {
      if (seen.get(2220) !== 1 || seen.has(2219)) return failed("GRAMMAR", "parsed module outside SANY envelope window");
      moduleTranscript.push(`P:${parsedModule}`);
      index += 1;
      continue;
    }
    const semantic = /^Semantic processing of module ([A-Za-z_][A-Za-z0-9_]*)$/.exec(line)?.[1];
    if (semantic !== undefined) {
      if (seen.get(2220) !== 1 || seen.has(2219)) return failed("GRAMMAR", "semantic module outside SANY envelope window");
      moduleTranscript.push(`S:${semantic}`);
      index += 1;
      continue;
    }
    const read = readEnvelope(lines, index);
    if (!read.ok) return read.error;
    const occurrences = (seen.get(read.envelope.code) ?? 0) + 1;
    if (occurrences > 1 && !read.repeat) return failed("GRAMMAR", `duplicate singleton code ${read.envelope.code}`);
    seen.set(read.envelope.code, occurrences);
    envelopes.push(read.envelope);
    index = read.next;
  }
  const expectedTranscript = [
    `P:${input.expectedModuleName}`,
    ...STANDARD_MODULES.map((module) => `P:${module}`),
    ...STANDARD_MODULES.map((module) => `S:${module}`),
    `S:${input.expectedModuleName}`,
  ];
  if (
    moduleTranscript.length !== expectedTranscript.length
    || moduleTranscript.some((entry, index) => entry !== expectedTranscript[index])
  ) {
    return failed("GRAMMAR", "SANY module transcript differs from the fixed expected sequence");
  }
  return envelopes;
}

function only(envelopes: TlcEnvelope[], code: number): TlcEnvelope | undefined {
  return envelopes.find((envelope) => envelope.code === code);
}

function count(envelopes: TlcEnvelope[], code: number): number {
  return envelopes.filter((envelope) => envelope.code === code).length;
}

function safeInteger(value: string): number | null {
  if (!/^(?:0|[1-9][0-9]*)$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function safeFormattedInteger(value: string): number | null {
  if (!/^(?:0|[1-9][0-9]{0,2}(?:,[0-9]{3})*)$/.test(value)) return null;
  return safeInteger(value.replaceAll(",", ""));
}

function parseStatistics(payload: string): { generated: number; distinct: number; queue: number } | null {
  const match = /^([0-9]+) states generated, ([0-9]+) distinct states found, ([0-9]+) states left on queue\.$/.exec(payload);
  if (match === null) return null;
  const generated = safeInteger(match[1]!);
  const distinct = safeInteger(match[2]!);
  const queue = safeInteger(match[3]!);
  return generated === null || distinct === null || queue === null || generated < distinct || distinct < queue
    ? null
    : { generated, distinct, queue };
}

function validProgress(payload: string): boolean {
  const match = /^Progress\(([0-9]+)\)(?: at \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})?: ([0-9][0-9,]*) states generated(?: \(([0-9][0-9,]*) s\/min\))?, ([0-9][0-9,]*) distinct states found(?: \(([0-9][0-9,]*) ds\/min\))?, ([0-9][0-9,]*) states left on queue\.$/.exec(payload);
  if (match === null) return false;
  const values = [safeInteger(match[1]!), ...match.slice(2).filter((value): value is string => value !== undefined).map(safeFormattedInteger)];
  if (values.some((value) => value === null)) return false;
  const generated = safeFormattedInteger(match[2]!);
  const distinct = safeFormattedInteger(match[4]!);
  const queue = safeFormattedInteger(match[6]!);
  return generated !== null && distinct !== null && queue !== null && generated >= distinct && distinct >= queue;
}

function parseDepth(payload: string): number | null {
  const match = /^The depth of the complete state graph search is ([0-9]+)\.$/.exec(payload);
  return match === null ? null : safeInteger(match[1]!);
}

function validOutdegree(payload: string): boolean {
  const match = /^The average outdegree of the complete state graph is ([0-9]+) \(minimum is ([0-9]+), the maximum ([0-9]+) and the 95th percentile is ([0-9]+)\)\.$/.exec(payload);
  if (match === null) return false;
  const [average, minimum, maximum, percentile] = match.slice(1).map(safeInteger);
  return average !== null
    && minimum !== null
    && maximum !== null
    && percentile !== null
    && minimum <= maximum
    && average <= maximum
    && percentile >= minimum
    && percentile <= maximum;
}

function lifecyclePrefixCodes(initialViolation: boolean): number[] {
  return initialViolation ? [2262, 2187, 2220, 2219, 2185, 2189] : [2262, 2187, 2220, 2219, 2185, 2189, 2190];
}

// After a MSG 2107 terminal only progress lines and the Finished marker may follow.
function initialViolationOrderError(codes: number[], start: number): string | null {
  let index = start;
  while (codes[index] === 2200) index += 1;
  if (codes[index] !== 2186 || index + 1 !== codes.length) return "Finished must be the final terminal marker";
  return null;
}

// An initial-state violation (MSG 2107) aborts before 2190/2199/2194 are ever
// printed — those three lifecycle codes are required only for the trace/success
// shapes, and their PRESENCE alongside 2107 is itself a grammar contradiction.
function lifecycleCodeCountsError(envelopes: TlcEnvelope[], initialViolation: boolean): string | null {
  const required = initialViolation ? [2262, 2187, 2220, 2219, 2185, 2189, 2186] : [2262, 2187, 2220, 2219, 2185, 2189, 2190, 2199, 2194, 2186];
  for (const code of required) {
    if (count(envelopes, code) !== 1) return `required lifecycle code ${code} must occur once`;
  }
  if (initialViolation && (count(envelopes, 2190) !== 0 || count(envelopes, 2199) !== 0 || count(envelopes, 2194) !== 0)) {
    return "initial-state violation must not carry post-init lifecycle codes";
  }
  return null;
}

function validateLifecyclePayloads(envelopes: TlcEnvelope[]): string | null {
  const initialViolation = count(envelopes, 2107) === 1;
  const countsError = lifecycleCodeCountsError(envelopes, initialViolation);
  if (countsError !== null) return countsError;
  const payloadChecks: Array<[number, RegExp]> = [
    [2262, /^TLC2 Version 2\.19 of 08 August 2024 \(rev: 5a47802\)$/],
    [2187, /^Running breadth-first search Model-Checking .+ with 1 worker(?:\.| on .+)$/],
    [2220, /^Starting SANY\.\.\.$/],
    [2219, /^SANY finished\.$/],
    [2185, /^Starting\.\.\. \(.+\)$/],
    [2189, /^Computing initial states\.\.\.$/],
    [2190, /^Finished computing initial states: [0-9]+ distinct state(?:s)? generated at .+\.$/],
    [2186, /^Finished in .+ at \(.+\)$/],
  ];
  for (const [code, pattern] of payloadChecks) {
    const envelope = only(envelopes, code);
    if (envelope === undefined && code === 2190 && initialViolation) continue;
    if (envelope === undefined || !pattern.test(envelope.payload)) return `invalid payload for code ${code}`;
  }
  if (envelopes.filter(({ code }) => code === 2200).some(({ payload }) => !validProgress(payload))) return "invalid payload for code 2200";
  const outdegree = only(envelopes, 2268);
  if (outdegree !== undefined && !validOutdegree(outdegree.payload)) return "invalid payload for code 2268";
  return null;
}

function validateLifecycleOrder(envelopes: TlcEnvelope[]): string | null {
  const codes = envelopes.map(({ code }) => code);
  const prefix = lifecyclePrefixCodes(codes.includes(2107));
  if (prefix.some((code, index) => codes[index] !== code)) return "lifecycle prefix codes are out of order";
  let index = prefix.length;
  while (codes[index] === 2200) index += 1;
  if (codes[index] === 2107) return initialViolationOrderError(codes, index + 1);
  if (codes[index] === 2193) {
    index += 1;
  } else {
    if (codes[index] !== 2110 || codes[index + 1] !== 2121) return "semantic terminal header is out of order";
    index += 2;
    const firstState = index;
    while (codes[index] === 2217) index += 1;
    if (index - firstState < 2) return "counterexample terminal requires at least two ordered states";
  }
  while (codes[index] === 2200) index += 1;
  if (codes[index] !== 2199 || codes[index + 1] !== 2194) return "statistics and depth terminals are out of order";
  index += 2;
  if (codes[index] === 2268) index += 1;
  if (codes[index] !== 2186 || index + 1 !== codes.length) return "Finished must be the final terminal marker";
  return null;
}

function validateLifecycle(envelopes: TlcEnvelope[]): string | null {
  return validateLifecyclePayloads(envelopes) ?? validateLifecycleOrder(envelopes);
}

const TRACE_STATE_VARIABLES = ["initialBudget", "amendBudget", "accepted", "holdMarkers", "holdBudget", "tally", "reexamRequired"] as const;

// Real TLC labels each non-initial trace step with the NAME of the next-state
// action that fired (e.g. "<Tally line 133, col 3 ...>", "<SubmitOriginal ...>"),
// not the literal token "Next" — measured 2026-07-22 against the first real
// trace-form counterexample (D1 choice-winner fixture). The label grammar
// accepts any identifier while keeping the span/module binding exact.

function parseTrace(envelopes: TlcEnvelope[]): TlcTraceState[] | null {
  const trace: TlcTraceState[] = [];
  for (const envelope of envelopes.filter(({ code }) => code === 2217)) {
    const lines = envelope.payload.split("\n");
    const header = /^([0-9]+): (.+)$/.exec(lines[0] ?? "");
    if (header === null) return null;
    const ordinal = safeInteger(header[1]!);
    const label = header[2]!;
    const validLabel = ordinal === 1
      ? label === "<Initial predicate>"
      : /^<[A-Za-z_][A-Za-z0-9_]* line [1-9][0-9]*, col [1-9][0-9]* to line [1-9][0-9]*, col [1-9][0-9]* of module FormalElection>$/.test(label);
    const variables = lines.slice(1).flatMap((line) => /^\/\\ ([A-Za-z_][A-Za-z0-9_]*) =/.exec(line)?.[1] ?? []);
    if (ordinal === null || ordinal !== trace.length + 1 || !validLabel
      || variables.length !== TRACE_STATE_VARIABLES.length
      || variables.some((name, index) => name !== TRACE_STATE_VARIABLES[index])) return null;
    trace.push({ ordinal, label: header[2]!, body: lines.slice(1) });
  }
  return trace;
}

interface TlcStatistics { generated: number; distinct: number; queue: number }

const FINGERPRINT_PROBABILITY = String.raw`(?:0(?:\.0+)?|[1-9][0-9]*(?:\.[0-9]+)?E[+-][0-9]+)`;
const COMPLETE_PAYLOAD = new RegExp(
  String.raw`^Model checking completed\. No error has been found\.\n  Estimates of the probability that TLC did not check all reachable states\n  because two distinct states had the same fingerprint:\n  calculated \(optimistic\):  val = ${FINGERPRINT_PROBABILITY}(?:\n  based on the actual fingerprints:  val = ${FINGERPRINT_PROBABILITY})?$`,
);

function completeExploration(input: TlcOutputInput, parsed: TlcEnvelope[], statistics: TlcStatistics, depth: number): TlcExploration {
  if (!COMPLETE_PAYLOAD.test(only(parsed, 2193)!.payload) || input.exitCode !== 0 || statistics.queue !== 0) {
    return failed("OUTCOME_MISMATCH", "success markers, exit code, or queue disagree");
  }
  return {
    kind: "COMPLETE",
    generatedStates: statistics.generated,
    distinctStates: statistics.distinct,
    statesLeftOnQueue: 0,
    searchDepth: depth,
    completionMarker: "Model checking completed. No error has been found.",
    terminationReason: "EXHAUSTED",
  };
}

function counterexampleExploration(input: TlcOutputInput, parsed: TlcEnvelope[], statistics: TlcStatistics, depth: number, model: FrozenTlaModelBundle): TlcExploration {
  if (input.exitCode !== 12 || count(parsed, 2110) !== 1 || count(parsed, 2121) !== 1 || count(parsed, 2217) < 2) {
    return failed("OUTCOME_MISMATCH", "counterexample markers and exit code disagree");
  }
  const invariantMatch = /^Invariant ([A-Za-z_][A-Za-z0-9_]*) is violated\.$/.exec(only(parsed, 2110)!.payload);
  if (invariantMatch === null || only(parsed, 2121)!.payload !== "The behavior up to this point is:") return failed("GRAMMAR", "invalid counterexample header");
  const invariantName = invariantMatch[1]!;
  if (!TLA_NAMED_INVARIANTS.includes(invariantName as TlaNamedInvariant)) return failed("GRAMMAR", "counterexample invariant is outside the frozen set");
  const sourceLocation = model.invariantSourceMap[invariantName as TlaNamedInvariant];
  const trace = parseTrace(parsed);
  if (sourceLocation === undefined || trace === null) return failed("GRAMMAR", "counterexample source map or trace is invalid");
  return {
    kind: "COUNTEREXAMPLE",
    invariant: invariantName,
    sourceLocation,
    trace,
    counterexampleIdentity: canonicalIdentity({ invariantName, sourceLocation, trace }, "amadeus.formal-verif.tlc.counterexample.v1").sha256,
    generatedStates: statistics.generated,
    distinctStates: statistics.distinct,
    statesLeftOnQueue: statistics.queue,
    searchDepth: depth,
  };
}

function hasFrozenModelOutputBinding(input: TlcOutputInput): boolean {
  return input.expectedModuleName === "FormalElection"
    && input.expectedModulePath.split(/[\\/]/).at(-1) === "FormalElection.tla"
    && input.expectedStandardModuleDirectory.startsWith("/");
}

// TLC reports an invariant already violated while COMPUTING INITIAL STATES as a
// single MSG 2107 envelope (message line + one full state dump) with exit 12 and
// NO behavior trace (2121/2217) and NO statistics/depth markers (2199/2194) —
// measured 2026-07-22 against the D4 invalid-timestamp fixture (issue #1359).
// It is a valid one-state counterexample; statistics are null, never invented.
function initialStateCounterexampleExploration(input: TlcOutputInput, parsed: TlcEnvelope[], model: FrozenTlaModelBundle): TlcExploration {
  if (input.exitCode !== 12 || count(parsed, 2107) !== 1 || count(parsed, 2110) !== 0 || count(parsed, 2121) !== 0 || count(parsed, 2217) !== 0 || count(parsed, 2193) !== 0) {
    return failed("OUTCOME_MISMATCH", "initial-state counterexample markers and exit code disagree");
  }
  const lines = only(parsed, 2107)!.payload.split("\n");
  const headerMatch = /^Invariant ([A-Za-z_][A-Za-z0-9_]*) is violated by the initial state:$/.exec(lines[0] ?? "");
  if (headerMatch === null) return failed("GRAMMAR", "invalid initial-state counterexample header");
  const invariantName = headerMatch[1]!;
  if (!TLA_NAMED_INVARIANTS.includes(invariantName as TlaNamedInvariant)) return failed("GRAMMAR", "counterexample invariant is outside the frozen set");
  const sourceLocation = model.invariantSourceMap[invariantName as TlaNamedInvariant];
  const body = lines.slice(1);
  const variables = body.flatMap((line) => /^\/\\ ([A-Za-z_][A-Za-z0-9_]*) =/.exec(line)?.[1] ?? []);
  if (sourceLocation === undefined || variables.length !== TRACE_STATE_VARIABLES.length
    || variables.some((name, index) => name !== TRACE_STATE_VARIABLES[index])) {
    return failed("GRAMMAR", "counterexample source map or initial state is invalid");
  }
  const trace: TlcTraceState[] = [{ ordinal: 1, label: lines[0]!, body }];
  return {
    kind: "COUNTEREXAMPLE",
    invariant: invariantName,
    sourceLocation,
    trace,
    counterexampleIdentity: canonicalIdentity({ invariantName, sourceLocation, trace }, "amadeus.formal-verif.tlc.counterexample.v1").sha256,
    generatedStates: null,
    distinctStates: null,
    statesLeftOnQueue: null,
    searchDepth: null,
  };
}

export function parseTlcOutput174(input: TlcOutputInput): TlcExploration {
  if (input.timedOut) return failed("TIMEOUT", "TLC process exceeded its deadline");
  if (input.signal !== null) return failed("SIGNAL", `TLC process ended with signal ${input.signal}`);
  if (input.verifiedArtifactDescriptorIdentity !== FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY) {
    return failed("GRAMMAR", "TLC output is not bound to the fixed verified artifact descriptor");
  }
  const model = validateFrozenTlaModelReceipt(input.modelReceipt);
  if (!model.ok) return failed("GRAMMAR", `TLC output model receipt is invalid: ${model.error.message}`);
  if (!hasFrozenModelOutputBinding(input)) return failed("GRAMMAR", "TLC output module path is not bound to the frozen model");
  const decoded = decodeChunks(input.chunks);
  if (typeof decoded !== "string") return decoded;
  const parsed = parseEnvelopes(decoded, input);
  if (!Array.isArray(parsed)) return parsed;
  const lifecycleError = validateLifecycle(parsed);
  if (lifecycleError !== null) return failed("GRAMMAR", lifecycleError);
  if (count(parsed, 2107) === 1) return initialStateCounterexampleExploration(input, parsed, model.value);
  return statisticsShapeExploration(input, parsed, model.value);
}

function statisticsShapeExploration(input: TlcOutputInput, parsed: TlcEnvelope[], model: FrozenTlaModelBundle): TlcExploration {
  const statistics = parseStatistics(only(parsed, 2199)!.payload);
  const depth = parseDepth(only(parsed, 2194)!.payload);
  if (statistics === null || depth === null) return failed("GRAMMAR", "invalid statistics or depth payload");
  const hasSuccess = count(parsed, 2193) === 1;
  const hasViolation = count(parsed, 2110) === 1 || count(parsed, 2121) === 1 || count(parsed, 2217) > 0;
  if (hasSuccess === hasViolation) return failed("GRAMMAR", "exactly one terminal semantic class is required");
  return hasSuccess
    ? completeExploration(input, parsed, statistics, depth)
    : counterexampleExploration(input, parsed, statistics, depth, model);
}

export interface JdkDistributionEntry {
  readonly kind: "FILE" | "SYMLINK";
  readonly path: string;
  readonly target: string | null;
  readonly byteLength: number;
  readonly sha256: string;
}

export interface JdkDistributionManifest {
  readonly vendor: "OpenJDK";
  readonly version: "26.0.1";
  readonly javaExecutablePath: string;
  readonly javaExecutableSha256: string;
  readonly entries: readonly JdkDistributionEntry[];
  readonly manifestIdentity: string;
}

export type JdkDistributionManifestInput = Omit<JdkDistributionManifest, "entries" | "manifestIdentity"> & {
  readonly entries: readonly JdkDistributionEntry[];
};

const SHA256 = /^[0-9a-f]{64}$/;

function canonicalRelativePath(value: unknown): value is string {
  return typeof value === "string"
    && value.length > 0
    && !value.includes("\\")
    && !value.includes("\0")
    && !value.startsWith("/")
    && value.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function canonicalDistributionTarget(value: unknown): value is string {
  return value === "." || canonicalRelativePath(value);
}

function validJdkEntry(entry: JdkDistributionEntry): boolean {
  if (!canonicalRelativePath(entry.path) || !Number.isSafeInteger(entry.byteLength) || entry.byteLength < 0 || !SHA256.test(entry.sha256)) return false;
  return entry.kind === "FILE" ? entry.target === null : entry.kind === "SYMLINK" && canonicalDistributionTarget(entry.target);
}

function coversJdkRuntime(entries: readonly JdkDistributionEntry[]): boolean {
  return entries.some(({ path }) => path === "lib/modules")
    && entries.some(({ path }) => path.startsWith("conf/"))
    && entries.some(({ path }) => /\.(?:dylib|dll|so(?:\.[0-9]+)*)$/.test(path));
}

export function createJdkDistributionManifest(
  input: JdkDistributionManifestInput,
): Result<JdkDistributionManifest, ToolchainDomainError> {
  const fail = (message: string): Result<never, ToolchainDomainError> => ({
    ok: false,
    error: { kind: "JdkDistributionError", message },
  });
  if (input.vendor !== FIXED_JDK_RUN_PROFILE.vendor || input.version !== FIXED_JDK_RUN_PROFILE.version) {
    return fail("JDK vendor or version differs from the fixed run profile");
  }
  if (!canonicalRelativePath(input.javaExecutablePath) || !SHA256.test(input.javaExecutableSha256)) {
    return fail("JDK executable identity is invalid");
  }
  const entries = [...input.entries].sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  if (entries.some((entry) => !validJdkEntry(entry))) return fail("JDK manifest entry or symlink binding is invalid");
  if (entries.length === 0 || new Set(entries.map(({ path }) => path)).size !== entries.length) return fail("JDK manifest paths must be non-empty and unique");
  const java = entries.find(({ path }) => path === input.javaExecutablePath);
  if (java?.sha256 !== input.javaExecutableSha256) return fail("JDK executable is not bound to the manifest");
  if (!coversJdkRuntime(entries)) return fail("JDK manifest does not cover modules, native libraries, and configuration");
  const body = { vendor: input.vendor, version: input.version, javaExecutablePath: input.javaExecutablePath, javaExecutableSha256: input.javaExecutableSha256, entries };
  return { ok: true, value: deepFreeze({ ...body, manifestIdentity: canonicalIdentity(body, JDK_DISTRIBUTION_DOMAIN).sha256 }) };
}

export function createJdkSnapshotIdentity(
  manifest: JdkDistributionManifest,
  javaVersionReceiptIdentity: string,
): string {
  return canonicalIdentity({
    manifestIdentity: manifest.manifestIdentity,
    javaExecutablePath: manifest.javaExecutablePath,
    javaExecutableSha256: manifest.javaExecutableSha256,
    javaVersionReceiptIdentity,
    jdkRunProfileIdentity: FIXED_JDK_RUN_PROFILE_IDENTITY,
  }, JDK_SNAPSHOT_DOMAIN).sha256;
}

export type SandboxProbeKind = "TCP_LOOPBACK" | "UDP_LOOPBACK" | "DNS";

export interface SandboxProbeObservation {
  readonly kind: SandboxProbeKind;
  readonly denied: boolean;
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly evidenceIdentity: string;
}

export interface VerifiedSandboxProbe extends SandboxProbeObservation {
  readonly denied: true;
}

export interface SandboxProbeReceipt {
  readonly providerIdentity: string;
  readonly policyIdentity: string;
  readonly checkedAt: string;
  readonly probes: readonly VerifiedSandboxProbe[];
  readonly receiptIdentity: string;
}

export interface SandboxProbeReceiptInput extends Omit<SandboxProbeReceipt, "probes" | "receiptIdentity"> {
  readonly probes: readonly SandboxProbeObservation[];
}

const SANDBOX_PROBES: readonly SandboxProbeKind[] = ["TCP_LOOPBACK", "UDP_LOOPBACK", "DNS"];

export function createSandboxProbeReceipt(
  input: SandboxProbeReceiptInput,
): Result<SandboxProbeReceipt, ToolchainDomainError> {
  const fail = (message: string): Result<never, ToolchainDomainError> => ({ ok: false, error: { kind: "SandboxReceiptError", message } });
  if (input.providerIdentity !== DARWIN_SANDBOX_PROVIDER_IDENTITY || input.policyIdentity !== DARWIN_NETWORK_DENY_POLICY_IDENTITY || !isUtcInstant(input.checkedAt)) return fail("sandbox provider, policy, or timestamp is invalid");
  const byKind = new Map(input.probes.map((probe) => [probe.kind, probe]));
  if (input.probes.length !== SANDBOX_PROBES.length || byKind.size !== SANDBOX_PROBES.length) return fail("sandbox receipt must contain each fixed probe exactly once");
  const probes: VerifiedSandboxProbe[] = [];
  for (const kind of SANDBOX_PROBES) {
    const probe = byKind.get(kind);
    if (probe?.denied !== true || (probe.exitCode === 0 && probe.signal === null) || (probe.exitCode !== null && !Number.isSafeInteger(probe.exitCode)) || (probe.signal !== null && probe.signal.length === 0) || !SHA256.test(probe.evidenceIdentity)) return fail(`sandbox ${kind} probe is not a verified denial`);
    probes.push({ ...probe, denied: true });
  }
  const body = { providerIdentity: input.providerIdentity, policyIdentity: input.policyIdentity, checkedAt: input.checkedAt, probes };
  return { ok: true, value: deepFreeze({ ...body, receiptIdentity: canonicalIdentity(body, SANDBOX_RECEIPT_DOMAIN).sha256 }) };
}

export interface VerifiedTlcArtifact {
  readonly kind: "VerifiedTlcArtifact";
  readonly descriptorIdentity: string;
  readonly actualSha256: string;
  readonly byteLength: number;
  readonly cachePath: string;
  readonly receiptIdentity: string;
}

export interface VerifiedJdkSnapshot {
  readonly kind: "VerifiedJdkSnapshot";
  readonly manifest: JdkDistributionManifest;
  readonly manifestIdentity: string;
  readonly snapshotIdentity: string;
  readonly javaVersionReceiptIdentity: string;
  readonly snapshotRoot: string;
  readonly javaExecutablePath: string;
  readonly verifiedAt: string;
}

export interface VerifiedSandbox {
  readonly kind: "VerifiedSandbox";
  readonly providerIdentity: string;
  readonly policyIdentity: string;
  readonly receiptIdentity: string;
  readonly checkedAt: string;
}

export interface TlcRunManifestInput {
  readonly artifact: VerifiedTlcArtifact;
  readonly jdk: VerifiedJdkSnapshot;
  readonly sandbox: VerifiedSandbox;
  readonly modelReceipt: FrozenTlaModelReceipt;
  readonly modulePath: string;
  readonly cfgPath: string;
  readonly subjectAlias: string;
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly deadlineMs: number;
}

export interface TlcRunManifest {
  readonly schemaVersion: 1;
  readonly artifactDescriptorIdentity: string;
  readonly artifactReceiptIdentity: string;
  readonly artifactSha256: string;
  readonly jdkManifestIdentity: string;
  readonly jdkSnapshotIdentity: string;
  readonly javaVersionReceiptIdentity: string;
  readonly jdkRunProfileIdentity: string;
  readonly sandboxProviderIdentity: string;
  readonly sandboxPolicyIdentity: string;
  readonly sandboxReceiptIdentity: string;
  readonly tlcProfileIdentity: string;
  readonly modelIdentity: string;
  readonly moduleIdentity: string;
  readonly cfgIdentity: string;
  readonly modulePath: string;
  readonly cfgPath: string;
  readonly subjectAlias: string;
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly workers: 1;
  readonly deadlineMs: number;
  readonly runIdentity: string;
}

function hasFixedManifestArtifact(input: TlcRunManifestInput): boolean {
  return input.artifact.kind === "VerifiedTlcArtifact" && input.artifact.descriptorIdentity === FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY && input.artifact.actualSha256 === FIXED_TLC_ARTIFACT_DESCRIPTOR.sha256 && Number.isSafeInteger(input.artifact.byteLength) && input.artifact.byteLength > 0 && input.artifact.byteLength <= FIXED_TLC_ARTIFACT_DESCRIPTOR.maxBytes && SHA256.test(input.artifact.receiptIdentity);
}
function hasBoundManifestJdk(input: TlcRunManifestInput, rebuilt: ReturnType<typeof createJdkDistributionManifest>): boolean {
  return rebuilt.ok && rebuilt.value.manifestIdentity === input.jdk.manifestIdentity && SHA256.test(input.jdk.javaVersionReceiptIdentity) && input.jdk.snapshotIdentity === createJdkSnapshotIdentity(rebuilt.value, input.jdk.javaVersionReceiptIdentity) && input.jdk.snapshotRoot.length > 0 && input.jdk.javaExecutablePath === rebuilt.value.javaExecutablePath && isUtcInstant(input.jdk.verifiedAt);
}
function hasBoundManifestSandbox(input: TlcRunManifestInput): boolean {
  return input.sandbox.kind === "VerifiedSandbox" && input.sandbox.providerIdentity === DARWIN_SANDBOX_PROVIDER_IDENTITY && input.sandbox.policyIdentity === DARWIN_NETWORK_DENY_POLICY_IDENTITY && SHA256.test(input.sandbox.receiptIdentity) && isUtcInstant(input.sandbox.checkedAt);
}

/** This pure envelope binds identities but never authorizes a process spawn. */
export function createTlcRunManifest(
  input: TlcRunManifestInput,
): Result<TlcRunManifest, ToolchainDomainError> {
  const fail = (message: string): Result<never, ToolchainDomainError> => ({ ok: false, error: { kind: "RunManifestError", message } });
  const rebuiltJdk = createJdkDistributionManifest({ vendor: input.jdk.manifest.vendor, version: input.jdk.manifest.version, javaExecutablePath: input.jdk.manifest.javaExecutablePath, javaExecutableSha256: input.jdk.manifest.javaExecutableSha256, entries: input.jdk.manifest.entries });
  const validatedModel = validateFrozenTlaModelReceipt(input.modelReceipt);
  if (!hasFixedManifestArtifact(input)) return fail("artifact structure differs from the fixed descriptor");
  if (!hasBoundManifestJdk(input, rebuiltJdk)) return fail("JDK snapshot structure is not identity-bound");
  if (!hasBoundManifestSandbox(input)) return fail("sandbox structure is not identity-bound");
  if (!validatedModel.ok) return fail(`model receipt is invalid: ${validatedModel.error.message}`);
  if (![input.modulePath, input.cfgPath, input.subjectAlias, input.cwd].every((value) => value.length > 0 && !value.includes("\0"))) return fail("run paths and subject alias must be non-empty");
  if (!Number.isSafeInteger(input.deadlineMs) || input.deadlineMs <= 0 || input.deadlineMs > 180_000) return fail("run deadline must be within the fixed 180 second budget");
  const javaPath = `${input.jdk.snapshotRoot.replace(/\/+$/, "")}/${input.jdk.javaExecutablePath}`;
  const standardModuleDirectory = `${input.cwd.replace(/\/+$/, "")}/.tlc-stdlib`;
  const expectedArgv = [javaPath, ...FIXED_JDK_RUN_PROFILE.jvmArgs, `-Djava.io.tmpdir=${standardModuleDirectory}`, "-cp", input.artifact.cachePath, "tlc2.TLC", "-workers", "1", "-tool", "-config", input.cfgPath, input.modulePath];
  if (input.argv.length !== expectedArgv.length || input.argv.some((argument, index) => argument !== expectedArgv[index])) return fail("argv differs from the fixed array invocation");
  const body = {
    schemaVersion: 1 as const,
    artifactDescriptorIdentity: input.artifact.descriptorIdentity,
    artifactReceiptIdentity: input.artifact.receiptIdentity,
    artifactSha256: input.artifact.actualSha256,
    jdkManifestIdentity: input.jdk.manifestIdentity,
    jdkSnapshotIdentity: input.jdk.snapshotIdentity,
    javaVersionReceiptIdentity: input.jdk.javaVersionReceiptIdentity,
    jdkRunProfileIdentity: FIXED_JDK_RUN_PROFILE_IDENTITY,
    sandboxProviderIdentity: input.sandbox.providerIdentity,
    sandboxPolicyIdentity: input.sandbox.policyIdentity,
    sandboxReceiptIdentity: input.sandbox.receiptIdentity,
    tlcProfileIdentity: FIXED_TLC_PROFILE_IDENTITY,
    modelIdentity: validatedModel.value.modelIdentity,
    moduleIdentity: validatedModel.value.moduleBytesIdentity,
    cfgIdentity: validatedModel.value.cfgBytesIdentity,
    modulePath: input.modulePath,
    cfgPath: input.cfgPath,
    subjectAlias: input.subjectAlias,
    argv: [...input.argv],
    cwd: input.cwd,
    workers: 1 as const,
    deadlineMs: input.deadlineMs,
  };
  return { ok: true, value: deepFreeze({ ...body, runIdentity: canonicalIdentity(body, RUN_MANIFEST_DOMAIN).sha256 }) };
}

export interface TlcOperationError {
  readonly kind: "AcquisitionError" | "CacheIntegrityError" | "PreparationError" | "InvocationError" | "NormalizationError";
  readonly code: string;
  readonly message: string;
  readonly cause?: string;
}
export type TlcToolchainError = ToolchainDomainError | TlcOperationError;
export interface TlcClosedEnvironment {
  readonly JAVA_HOME: string;
  readonly LANG: "en_US.UTF-8";
  readonly LC_ALL: "en_US.UTF-8";
  readonly TZ: "UTC";
}
export interface TlcPrepareInput {
  readonly artifact: VerifiedTlcArtifact;
  readonly modelReceipt: FrozenTlaModelReceipt;
  readonly modulePath: string;
  readonly cfgPath: string;
  readonly subjectAlias: string;
  readonly deadlineMs: number;
}
/** Concrete filesystem adapters must issue and recognize these objects with private instance state. */
export interface PreparedTlcRun {
  readonly artifact: VerifiedTlcArtifact;
  readonly jdk: VerifiedJdkSnapshot;
  readonly sandbox: VerifiedSandbox;
  readonly modelReceipt: FrozenTlaModelReceipt;
  readonly manifest: TlcRunManifest;
  readonly environment: TlcClosedEnvironment;
}
export interface RawTlcOutcome {
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly stdoutChunks: readonly Uint8Array[];
  readonly stderrChunks: readonly Uint8Array[];
  readonly stdoutIdentity: string;
  readonly stderrIdentity: string;
  readonly startedAtMs: number;
  readonly finishedAtMs: number;
  readonly timedOut: boolean;
  readonly outputLimitExceeded: boolean;
}
export interface TlcCellBinding {
  readonly fixtureId: string;
  readonly baselineSha: string;
  readonly armSha: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly evidencePaths: readonly string[];
}

export interface TlcNormalizationInput {
  readonly prepared: PreparedTlcRun;
  readonly outcome: RawTlcOutcome;
  readonly binding: TlcCellBinding;
}

export interface TlcExecutionPort {
  run(prepared: PreparedTlcRun): Promise<Result<RawTlcOutcome, TlcToolchainError>>;
}

export interface TlcSandboxProvider {
  readonly providerIdentity: string;
  preflight(deadlineMs: number): Promise<Result<VerifiedSandbox, TlcToolchainError>>;
}

export interface TlcToolchainFacade {
  acquire(): Promise<Result<VerifiedTlcArtifact, TlcToolchainError>>;
  verifyOffline(): Result<VerifiedTlcArtifact, TlcToolchainError>;
  prepare(input: TlcPrepareInput): Promise<Result<PreparedTlcRun, TlcToolchainError>>;
  run(prepared: PreparedTlcRun): Promise<Result<RawTlcOutcome, TlcToolchainError>>;
  normalize(input: TlcNormalizationInput): Result<CellResult, TlcToolchainError>;
}

function hasPlainJsonArray(value: unknown[]): boolean {
  if (Object.getPrototypeOf(value) !== Array.prototype) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== value.length + 1 || keys[value.length] !== "length") return false;
  return value.every((item, index) => keys[index] === String(index) && hasPlainJsonShape(item));
}

function hasPlainJsonRecord(value: object): boolean {
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") return false;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor) || !hasPlainJsonShape(descriptor.value)) return false;
  }
  return true;
}

function hasPlainJsonShape(value: unknown): boolean {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return hasPlainJsonArray(value);
  return typeof value === "object" && hasPlainJsonRecord(value);
}

function validateExact<T>(
  value: unknown,
  expected: T,
  expectedIdentity: string,
  domain: string,
  kind: ToolchainDomainError["kind"],
): Result<T, ToolchainDomainError> {
  if (!hasPlainJsonShape(value) || canonicalIdentity(value, domain).sha256 !== expectedIdentity) {
    return { ok: false, error: { kind, message: "value does not match the closed toolchain profile" } };
  }
  return { ok: true, value: expected };
}

export function validateFixedTlcArtifactDescriptor(
  value: unknown,
): Result<TlcArtifactDescriptor, ToolchainDomainError> {
  return validateExact(
    value,
    FIXED_TLC_ARTIFACT_DESCRIPTOR,
    FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
    ARTIFACT_DOMAIN,
    "ArtifactDescriptorError",
  );
}

export function validateFixedTlcProfile(value: unknown): Result<TlcProfile, ToolchainDomainError> {
  return validateExact(value, FIXED_TLC_PROFILE, FIXED_TLC_PROFILE_IDENTITY, PROFILE_DOMAIN, "TlcProfileError");
}

export function validateFixedJdkRunProfile(value: unknown): Result<JdkRunProfile, ToolchainDomainError> {
  return validateExact(
    value,
    FIXED_JDK_RUN_PROFILE,
    FIXED_JDK_RUN_PROFILE_IDENTITY,
    JDK_DOMAIN,
    "JdkRunProfileError",
  );
}
