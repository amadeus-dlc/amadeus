// amadeus-mirror-state-codec.ts — S1 Mirror State Document Codec (C3 internal).
//
// Owns the versioned Mirror state block inside `amadeus-state.md`: a
// duplicate-key-aware JSON tokenizer, entity validation, canonical rendering,
// and byte-preserving splice. It NEVER re-serialises bytes outside the Mirror
// block, and it parses only the Mirror JSON (the surrounding document is kept
// as substrings). Imports C0 types + the C2 canonical event-key function only;
// no filesystem, process, GitHub, reducer, or store dependency.
//
// Wire contract (business-logic-model.md:27) — a single block:
//   <!-- amadeus:mirror-state:v1:start -->
//   {"schema":1,"revision":0,"issueNumber":null,"provenance":null,"receipts":{},"warnings":[],"repairChallenges":{},"expectedPrompt":null,"auditOutbox":null}
//   <!-- amadeus:mirror-state:v1:end -->
// Root key order is fixed; each entity renders in its domain-entities.md order;
// no whitespace; LF newlines; the block ends with LF.

import type {
  MirrorAuditOutbox,
  MirrorBoundary,
  MirrorCreateIdentity,
  MirrorEventIdentity,
  MirrorExpectedPrompt,
  MirrorFailureClass,
  MirrorMutationEffect,
  MirrorOperation,
  MirrorOperationReceipt,
  MirrorProvenance,
  MirrorReceiptStatus,
  MirrorRepairChallenge,
  MirrorStateSnapshot,
  MirrorWarning,
  RepositoryIdentity,
} from "./amadeus-mirror-types.ts";
import { mirrorEventKey } from "./amadeus-mirror-policy.ts";

export const MIRROR_STATE_SENTINEL_START =
  "<!-- amadeus:mirror-state:v1:start -->";
export const MIRROR_STATE_SENTINEL_END = "<!-- amadeus:mirror-state:v1:end -->";

// Parser resource bounds (security-requirements.md / security-design.md).
export const MIRROR_CODEC_LIMITS = {
  maxDepth: 16,
  maxStringBytes: 256 * 1024,
  maxKeyBytes: 128,
  maxAggregateBytes: 2 * 1024 * 1024,
} as const;

const RECEIPT_STATUSES: ReadonlySet<MirrorReceiptStatus> = new Set([
  "prepared",
  "attempted",
  "succeeded",
  "skipped-for-event",
  "pending",
  "safety-blocked",
  "abandoned",
]);

const FAILURE_CLASSES: ReadonlySet<MirrorFailureClass> = new Set([
  "configuration",
  "not-installed",
  "unauthenticated",
  "permission",
  "rate-limit",
  "network",
  "api",
  "command",
  "invalid-response",
  "state-write",
  "state-parse",
  "provenance",
  "landing",
  "ambiguous-create",
]);

const MUTATION_EFFECTS: ReadonlySet<MirrorMutationEffect> = new Set([
  "not-started",
  "no-effect-confirmed",
  "outcome-unknown",
]);

const OPERATIONS: ReadonlySet<MirrorOperation> = new Set([
  "create",
  "sync",
  "close",
]);

const BOUNDARY_KINDS: ReadonlySet<MirrorBoundary["kind"]> = new Set([
  "intent-capture-approved",
  "phase-verified",
  "parked",
  "workflow-completed",
  "manual",
]);

const WARNING_SOURCES: ReadonlySet<MirrorWarning["source"]> = new Set([
  "persisted-receipt",
  "persisted-warning",
  "current-invocation",
]);

export type MirrorBlockRange = { readonly start: number; readonly end: number };

export type MirrorStateParse =
  | {
      kind: "ok";
      snapshot: MirrorStateSnapshot;
      block: MirrorBlockRange | null;
    }
  | { kind: "invalid"; issues: readonly string[] };

// ---------------------------------------------------------------------------
// Strict JSON tokenizer: rejects duplicate keys, enforces depth/size bounds,
// and never uses the prototype chain (null-proto accumulators) so a
// "__proto__" key is a plain data key, not prototype pollution.
// ---------------------------------------------------------------------------

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [k: string]: JsonValue };

class JsonParseError extends Error {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(message);
  }
}

const SIMPLE_ESCAPES: Readonly<Record<string, string>> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

function parseJsonStrict(text: string): JsonValue {
  let i = 0;
  const n = text.length;
  let depth = 0;

  const isWs = (c: string): boolean =>
    c === " " || c === "\t" || c === "\n" || c === "\r";
  const skipWs = (): void => {
    while (i < n && isWs(text[i])) i++;
  };

  const parseString = (path: string): string => {
    // assumes text[i] === '"'
    i++;
    let out = "";
    while (i < n) {
      const c = text[i];
      if (c === '"') {
        i++;
        if (Buffer.byteLength(out, "utf-8") > MIRROR_CODEC_LIMITS.maxStringBytes) {
          throw new JsonParseError(path, "string exceeds byte limit");
        }
        return out;
      }
      if (c === "\\") {
        const esc = text[i + 1];
        if (esc === undefined) throw new JsonParseError(path, "truncated escape");
        if (esc === "u") {
          const hex = text.slice(i + 2, i + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex))
            throw new JsonParseError(path, "invalid unicode escape");
          out += String.fromCharCode(Number.parseInt(hex, 16));
          i += 4;
        } else {
          const decoded = SIMPLE_ESCAPES[esc];
          if (decoded === undefined)
            throw new JsonParseError(path, `invalid escape '\\${esc}'`);
          out += decoded;
        }
        i += 2;
        // Guard growth mid-string so an adversarial input cannot balloon before
        // the closing quote is seen.
        if (Buffer.byteLength(out, "utf-8") > MIRROR_CODEC_LIMITS.maxStringBytes) {
          throw new JsonParseError(path, "string exceeds byte limit");
        }
        continue;
      }
      if (c === "\n" || c === "\r")
        throw new JsonParseError(path, "unescaped control character");
      out += c;
      i++;
    }
    throw new JsonParseError(path, "unterminated string");
  };

  const scanDigits = (): boolean => {
    const s = i;
    while (i < n && text[i] >= "0" && text[i] <= "9") i++;
    return i > s;
  };

  const parseNumber = (path: string): number => {
    const start = i;
    if (text[i] === "-") i++;
    if (text[i] === "0") i++;
    else if (!scanDigits()) throw new JsonParseError(path, "invalid number");
    if (text[i] === "." && (i++, !scanDigits()))
      throw new JsonParseError(path, "invalid fraction");
    if (text[i] === "e" || text[i] === "E") {
      i++;
      if (text[i] === "+" || text[i] === "-") i++;
      if (!scanDigits()) throw new JsonParseError(path, "invalid exponent");
    }
    return Number(text.slice(start, i));
  };

  const parseValue = (path: string): JsonValue => {
    skipWs();
    if (i >= n) throw new JsonParseError(path, "unexpected end of input");
    const c = text[i];
    if (c === "{") return parseObject(path);
    if (c === "[") return parseArray(path);
    if (c === '"') return parseString(path);
    if (c === "-" || (c >= "0" && c <= "9")) return parseNumber(path);
    if (text.startsWith("true", i)) {
      i += 4;
      return true;
    }
    if (text.startsWith("false", i)) {
      i += 5;
      return false;
    }
    if (text.startsWith("null", i)) {
      i += 4;
      return null;
    }
    throw new JsonParseError(path, `unexpected token '${c}'`);
  };

  const parseArray = (path: string): JsonValue[] => {
    depth++;
    if (depth > MIRROR_CODEC_LIMITS.maxDepth)
      throw new JsonParseError(path, "max depth exceeded");
    i++;
    const arr: JsonValue[] = [];
    skipWs();
    if (text[i] === "]") {
      i++;
      depth--;
      return arr;
    }
    for (let idx = 0; ; idx++) {
      arr.push(parseValue(`${path}[${idx}]`));
      skipWs();
      if (text[i] === ",") {
        i++;
        continue;
      }
      if (text[i] === "]") {
        i++;
        depth--;
        return arr;
      }
      throw new JsonParseError(path, "expected ',' or ']'");
    }
  };

  const parseObject = (path: string): { [k: string]: JsonValue } => {
    depth++;
    if (depth > MIRROR_CODEC_LIMITS.maxDepth)
      throw new JsonParseError(path, "max depth exceeded");
    i++;
    const obj = Object.create(null) as { [k: string]: JsonValue };
    const seen = new Set<string>();
    skipWs();
    if (text[i] === "}") {
      i++;
      depth--;
      return obj;
    }
    while (true) {
      skipWs();
      if (text[i] !== '"') throw new JsonParseError(path, "expected object key");
      const key = parseString(path);
      if (Buffer.byteLength(key, "utf-8") > MIRROR_CODEC_LIMITS.maxKeyBytes)
        throw new JsonParseError(`${path}.${key}`, "key exceeds byte limit");
      if (seen.has(key))
        throw new JsonParseError(`${path}.${key}`, "duplicate key");
      seen.add(key);
      skipWs();
      if (text[i] !== ":")
        throw new JsonParseError(`${path}.${key}`, "expected ':'");
      i++;
      obj[key] = parseValue(`${path}.${key}`);
      skipWs();
      if (text[i] === ",") {
        i++;
        continue;
      }
      if (text[i] === "}") {
        i++;
        depth--;
        return obj;
      }
      throw new JsonParseError(path, "expected ',' or '}'");
    }
  };

  const value = parseValue("$");
  skipWs();
  if (i !== n) throw new JsonParseError("$", "trailing content after JSON value");
  return value;
}

// ---------------------------------------------------------------------------
// Semantic validation: JsonValue -> MirrorStateSnapshot, collecting ALL issues.
// ---------------------------------------------------------------------------

function isObject(v: JsonValue): v is { [k: string]: JsonValue } {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isPositiveInt(v: JsonValue): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v > 0;
}

function isNonNegativeInt(v: JsonValue): v is number {
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
}

function isNonEmptyString(v: JsonValue): v is string {
  return typeof v === "string" && v.length > 0;
}

const RFC3339_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function isTimestamp(v: JsonValue): v is string {
  return typeof v === "string" && RFC3339_RE.test(v);
}

// Typed field extractors: push a path-scoped issue on failure and return
// undefined, so validators stay flat (one guard on the required set narrows
// the locals). These keep each validator's cognitive complexity low.
function reqNonEmptyString(
  obj: { [k: string]: JsonValue },
  key: string,
  path: string,
  issues: string[],
): string | undefined {
  const v = obj[key];
  if (isNonEmptyString(v)) return v;
  issues.push(`${path}.${key}: required non-empty string`);
  return undefined;
}

function reqTimestamp(
  obj: { [k: string]: JsonValue },
  key: string,
  path: string,
  issues: string[],
): string | undefined {
  const v = obj[key];
  if (isTimestamp(v)) return v;
  issues.push(`${path}.${key}: required RFC 3339 UTC timestamp`);
  return undefined;
}

function optTimestamp(
  obj: { [k: string]: JsonValue },
  key: string,
  path: string,
  issues: string[],
): string | undefined {
  const v = key in obj ? obj[key] : undefined;
  if (v === undefined) return undefined;
  if (isTimestamp(v)) return v;
  issues.push(`${path}.${key}: must be RFC 3339 UTC timestamp`);
  return undefined;
}

function reqEnum<T extends string>(
  obj: { [k: string]: JsonValue },
  key: string,
  set: ReadonlySet<T>,
  label: string,
  path: string,
  issues: string[],
): T | undefined {
  const v = obj[key];
  if (typeof v === "string" && set.has(v as T)) return v as T;
  issues.push(`${path}.${key}: unknown ${label}`);
  return undefined;
}

function reqHexDigest(
  obj: { [k: string]: JsonValue },
  key: string,
  path: string,
  issues: string[],
): string | undefined {
  const v = obj[key];
  if (typeof v === "string" && /^[0-9a-f]{64}$/.test(v)) return v;
  issues.push(`${path}.${key}: required 64-char lowercase hex`);
  return undefined;
}

function optEnum<T extends string>(
  obj: { [k: string]: JsonValue },
  key: string,
  set: ReadonlySet<T>,
  label: string,
  path: string,
  issues: string[],
): T | undefined {
  const v = key in obj ? obj[key] : undefined;
  if (v === undefined) return undefined;
  if (typeof v === "string" && set.has(v as T)) return v as T;
  issues.push(`${path}.${key}: unknown ${label}`);
  return undefined;
}

const ROOT_KEYS: ReadonlySet<string> = new Set([
  "schema",
  "revision",
  "issueNumber",
  "provenance",
  "receipts",
  "warnings",
  "repairChallenges",
  "expectedPrompt",
  "auditOutbox",
]);

const REPOSITORY_KEYS: ReadonlySet<string> = new Set(["owner", "name", "canonical"]);
const CREATE_IDENTITY_KEYS: ReadonlySet<string> = new Set([
  "schema",
  "intentUuid",
  "intentDir",
  "repository",
  "operationId",
  "preparedAt",
]);
const EVENT_KEYS: ReadonlySet<string> = new Set([
  "intentUuid",
  "boundary",
  "operation",
]);
const RECEIPT_KEYS: ReadonlySet<string> = new Set([
  "key",
  "event",
  "operationId",
  "status",
  "preparedAt",
  "attemptedAt",
  "completedAt",
  "failureClass",
  "lastEffect",
  "createIdentity",
]);
const WARNING_KEYS: ReadonlySet<string> = new Set([
  "operationId",
  "operation",
  "classification",
  "summary",
  "occurredAt",
  "retryable",
  "effect",
  "source",
]);
const PROVENANCE_KEYS: ReadonlySet<string> = new Set([
  "schema",
  "createIdentity",
  "issueNumber",
  "createdAt",
]);
const CHALLENGE_KEYS: ReadonlySet<string> = new Set([
  "challengeId",
  "intentUuid",
  "repository",
  "planDigest",
  "operationId",
  "expectedPhrase",
  "issuedAt",
  "consumedAt",
]);
const AUDIT_OUTBOX_KEYS: ReadonlySet<string> = new Set([
  "transactionId",
  "digest",
  "fields",
]);
const EXPECTED_PROMPT_KEYS: ReadonlySet<string> = new Set([
  "event",
  "operation",
  "issuedAt",
  "retryOf",
]);

function checkUnknownKeys(
  obj: { [k: string]: JsonValue },
  allowed: ReadonlySet<string>,
  path: string,
  issues: string[],
): void {
  for (const k of Object.keys(obj)) {
    if (!allowed.has(k)) issues.push(`${path}: unknown field '${k}'`);
  }
}

function validateRepository(
  v: JsonValue,
  path: string,
  issues: string[],
): RepositoryIdentity | null {
  if (!isObject(v)) {
    issues.push(`${path}: repository must be an object`);
    return null;
  }
  checkUnknownKeys(v, REPOSITORY_KEYS, path, issues);
  const owner = v.owner;
  const name = v.name;
  const canonical = v.canonical;
  if (!isNonEmptyString(owner)) issues.push(`${path}.owner: required non-empty string`);
  if (!isNonEmptyString(name)) issues.push(`${path}.name: required non-empty string`);
  if (typeof canonical !== "string")
    issues.push(`${path}.canonical: required string`);
  if (
    isNonEmptyString(owner) &&
    isNonEmptyString(name) &&
    typeof canonical === "string"
  ) {
    const expected = `${owner.toLowerCase()}/${name.toLowerCase()}`;
    if (canonical !== expected)
      issues.push(
        `${path}.canonical: must equal lowercase '${expected}' but was '${canonical}'`,
      );
    return { owner, name, canonical: canonical as `${string}/${string}` };
  }
  return null;
}

function validateBoundary(
  v: JsonValue,
  path: string,
  issues: string[],
): MirrorBoundary | null {
  if (!isObject(v)) {
    issues.push(`${path}: boundary must be an object`);
    return null;
  }
  const kind = v.kind;
  if (typeof kind !== "string" || !BOUNDARY_KINDS.has(kind as MirrorBoundary["kind"])) {
    issues.push(`${path}.kind: unknown boundary kind`);
    return null;
  }
  if (!isNonEmptyString(v.instance)) {
    issues.push(`${path}.instance: required non-empty string`);
    return null;
  }
  const instance = v.instance;
  if (kind === "phase-verified") {
    if (!isNonEmptyString(v.phase)) {
      issues.push(`${path}.phase: required for phase-verified`);
      return null;
    }
    return { kind, phase: v.phase, instance };
  }
  if (kind === "parked") {
    if (!isNonEmptyString(v.stage)) {
      issues.push(`${path}.stage: required for parked`);
      return null;
    }
    return { kind, stage: v.stage, instance };
  }
  return { kind, instance } as MirrorBoundary;
}

function validateEvent(
  v: JsonValue,
  path: string,
  issues: string[],
): MirrorEventIdentity | null {
  if (!isObject(v)) {
    issues.push(`${path}: event must be an object`);
    return null;
  }
  checkUnknownKeys(v, EVENT_KEYS, path, issues);
  const intentUuid = v.intentUuid;
  const operation = v.operation;
  if (!isNonEmptyString(intentUuid))
    issues.push(`${path}.intentUuid: required non-empty string`);
  if (typeof operation !== "string" || !OPERATIONS.has(operation as MirrorOperation))
    issues.push(`${path}.operation: unknown operation`);
  const boundary = validateBoundary(v.boundary, `${path}.boundary`, issues);
  if (isNonEmptyString(intentUuid) && OPERATIONS.has(operation as MirrorOperation) && boundary) {
    return { intentUuid, boundary, operation: operation as MirrorOperation };
  }
  return null;
}

function validateCreateIdentity(
  v: JsonValue,
  path: string,
  issues: string[],
): MirrorCreateIdentity | null {
  if (!isObject(v)) {
    issues.push(`${path}: createIdentity must be an object`);
    return null;
  }
  checkUnknownKeys(v, CREATE_IDENTITY_KEYS, path, issues);
  if (v.schema !== 1) issues.push(`${path}.schema: must be 1`);
  const intentUuid = v.intentUuid;
  const intentDir = v.intentDir;
  const operationId = v.operationId;
  const preparedAt = v.preparedAt;
  if (!isNonEmptyString(intentUuid))
    issues.push(`${path}.intentUuid: required non-empty string`);
  if (!isNonEmptyString(intentDir))
    issues.push(`${path}.intentDir: required non-empty string`);
  if (!isNonEmptyString(operationId))
    issues.push(`${path}.operationId: required non-empty string`);
  if (!isTimestamp(preparedAt))
    issues.push(`${path}.preparedAt: required RFC 3339 UTC timestamp`);
  const repository = validateRepository(v.repository, `${path}.repository`, issues);
  if (
    v.schema === 1 &&
    isNonEmptyString(intentUuid) &&
    isNonEmptyString(intentDir) &&
    isNonEmptyString(operationId) &&
    isTimestamp(preparedAt) &&
    repository
  ) {
    return {
      schema: 1,
      intentUuid,
      intentDir,
      repository,
      operationId,
      preparedAt,
    };
  }
  return null;
}

type ReceiptOptionals = {
  attemptedAt: string | undefined;
  completedAt: string | undefined;
  failureClass: MirrorFailureClass | undefined;
  lastEffect: MirrorMutationEffect | undefined;
};

function checkReceiptKey(
  event: MirrorEventIdentity | null,
  key: string | undefined,
  mapKey: string,
  path: string,
  issues: string[],
): void {
  if (!event) return;
  const canonical = mirrorEventKey(event);
  if (canonical !== mapKey)
    issues.push(`${path}: map key '${mapKey}' does not match canonical event key`);
  if (key !== undefined && key !== canonical)
    issues.push(`${path}.key: does not match canonical event key`);
}

function checkReceiptStatusInvariants(
  status: MirrorReceiptStatus,
  o: ReceiptOptionals,
  path: string,
  issues: string[],
): void {
  const needsAttempt = status === "attempted" || status === "pending" || status === "succeeded";
  if (needsAttempt && o.attemptedAt === undefined)
    issues.push(`${path}.attemptedAt: required for status '${status}'`);
  const needsCompleted =
    status === "succeeded" || status === "skipped-for-event" || status === "abandoned";
  if (needsCompleted && o.completedAt === undefined)
    issues.push(`${path}.completedAt: required for status '${status}'`);
  if ((status === "pending" || status === "safety-blocked") && o.failureClass === undefined)
    issues.push(`${path}.failureClass: required for status '${status}'`);
  if (status === "pending" && o.lastEffect === undefined)
    issues.push(`${path}.lastEffect: required for status 'pending'`);
}

function validateReceipt(
  v: JsonValue,
  mapKey: string,
  path: string,
  issues: string[],
): MirrorOperationReceipt | null {
  if (!isObject(v)) {
    issues.push(`${path}: receipt must be an object`);
    return null;
  }
  checkUnknownKeys(v, RECEIPT_KEYS, path, issues);
  const key = reqNonEmptyString(v, "key", path, issues);
  const operationId = reqNonEmptyString(v, "operationId", path, issues);
  const status = reqEnum(v, "status", RECEIPT_STATUSES, "receipt status", path, issues);
  const preparedAt = reqTimestamp(v, "preparedAt", path, issues);
  const event = validateEvent(v.event, `${path}.event`, issues);
  checkReceiptKey(event, key, mapKey, path, issues);
  const o: ReceiptOptionals = {
    attemptedAt: optTimestamp(v, "attemptedAt", path, issues),
    completedAt: optTimestamp(v, "completedAt", path, issues),
    failureClass: optEnum(v, "failureClass", FAILURE_CLASSES, "failure class", path, issues),
    lastEffect: optEnum(v, "lastEffect", MUTATION_EFFECTS, "mutation effect", path, issues),
  };
  const createIdentity =
    "createIdentity" in v
      ? validateCreateIdentity(v.createIdentity, `${path}.createIdentity`, issues)
      : undefined;
  if (status !== undefined) checkReceiptStatusInvariants(status, o, path, issues);

  if (
    key === undefined ||
    operationId === undefined ||
    status === undefined ||
    preparedAt === undefined ||
    event === null ||
    createIdentity === null
  ) {
    return null;
  }
  const receipt: {
    key: string;
    event: MirrorEventIdentity;
    operationId: string;
    status: MirrorReceiptStatus;
    preparedAt: string;
    attemptedAt?: string;
    completedAt?: string;
    failureClass?: MirrorFailureClass;
    lastEffect?: MirrorMutationEffect;
    createIdentity?: MirrorCreateIdentity;
  } = { key, event, operationId, status, preparedAt };
  if (o.attemptedAt !== undefined) receipt.attemptedAt = o.attemptedAt;
  if (o.completedAt !== undefined) receipt.completedAt = o.completedAt;
  if (o.failureClass !== undefined) receipt.failureClass = o.failureClass;
  if (o.lastEffect !== undefined) receipt.lastEffect = o.lastEffect;
  if (createIdentity) receipt.createIdentity = createIdentity;
  return receipt;
}

function nullableString(
  v: JsonValue,
  key: string,
  path: string,
  issues: string[],
): string | null | undefined {
  if (v === null) return null;
  if (isNonEmptyString(v)) return v;
  issues.push(`${path}.${key}: must be null or non-empty string`);
  return undefined;
}

function nullableOperation(
  v: JsonValue,
  path: string,
  issues: string[],
): MirrorOperation | null | undefined {
  if (v === null) return null;
  if (typeof v === "string" && OPERATIONS.has(v as MirrorOperation)) return v as MirrorOperation;
  issues.push(`${path}.operation: must be null or a known operation`);
  return undefined;
}

function validateWarning(
  v: JsonValue,
  path: string,
  issues: string[],
): MirrorWarning | null {
  if (!isObject(v)) {
    issues.push(`${path}: warning must be an object`);
    return null;
  }
  checkUnknownKeys(v, WARNING_KEYS, path, issues);
  const operationId = nullableString(v.operationId, "operationId", path, issues);
  const operation = nullableOperation(v.operation, path, issues);
  const classification = reqEnum(v, "classification", FAILURE_CLASSES, "failure class", path, issues);
  const summary = typeof v.summary === "string" ? v.summary : undefined;
  if (summary === undefined) issues.push(`${path}.summary: required string`);
  const occurredAt = reqTimestamp(v, "occurredAt", path, issues);
  const retryable = typeof v.retryable === "boolean" ? v.retryable : undefined;
  if (retryable === undefined) issues.push(`${path}.retryable: required boolean`);
  const effect = reqEnum(v, "effect", MUTATION_EFFECTS, "mutation effect", path, issues);
  const source = reqEnum(v, "source", WARNING_SOURCES, "warning source", path, issues);
  if (
    operationId === undefined ||
    operation === undefined ||
    classification === undefined ||
    summary === undefined ||
    occurredAt === undefined ||
    retryable === undefined ||
    effect === undefined ||
    source === undefined
  ) {
    return null;
  }
  return {
    operationId,
    operation,
    classification,
    summary,
    occurredAt,
    retryable,
    effect,
    source,
  };
}

function validateProvenance(
  v: JsonValue,
  path: string,
  issues: string[],
): MirrorProvenance | null {
  if (!isObject(v)) {
    issues.push(`${path}: provenance must be an object`);
    return null;
  }
  checkUnknownKeys(v, PROVENANCE_KEYS, path, issues);
  if (v.schema !== 1) issues.push(`${path}.schema: must be 1`);
  const issueNumber = v.issueNumber;
  const createdAt = v.createdAt;
  if (!isPositiveInt(issueNumber))
    issues.push(`${path}.issueNumber: required positive integer`);
  if (!isTimestamp(createdAt))
    issues.push(`${path}.createdAt: required RFC 3339 UTC timestamp`);
  const createIdentity = validateCreateIdentity(
    v.createIdentity,
    `${path}.createIdentity`,
    issues,
  );
  if (v.schema === 1 && isPositiveInt(issueNumber) && isTimestamp(createdAt) && createIdentity) {
    return { schema: 1, createIdentity, issueNumber, createdAt };
  }
  return null;
}

function validateChallenge(
  v: JsonValue,
  mapKey: string,
  path: string,
  issues: string[],
): MirrorRepairChallenge | null {
  if (!isObject(v)) {
    issues.push(`${path}: challenge must be an object`);
    return null;
  }
  checkUnknownKeys(v, CHALLENGE_KEYS, path, issues);
  const challengeId = reqNonEmptyString(v, "challengeId", path, issues);
  if (challengeId !== undefined && challengeId !== mapKey)
    issues.push(`${path}: map key '${mapKey}' must equal challengeId`);
  const intentUuid = reqNonEmptyString(v, "intentUuid", path, issues);
  const planDigest = reqHexDigest(v, "planDigest", path, issues);
  const operationId = reqNonEmptyString(v, "operationId", path, issues);
  const expectedPhrase = reqNonEmptyString(v, "expectedPhrase", path, issues);
  const issuedAt = reqTimestamp(v, "issuedAt", path, issues);
  const consumedAt = optTimestamp(v, "consumedAt", path, issues);
  const repository = validateRepository(v.repository, `${path}.repository`, issues);
  if (
    challengeId === undefined ||
    intentUuid === undefined ||
    planDigest === undefined ||
    operationId === undefined ||
    expectedPhrase === undefined ||
    issuedAt === undefined ||
    repository === null
  ) {
    return null;
  }
  const challenge: {
    challengeId: string;
    intentUuid: string;
    repository: RepositoryIdentity;
    planDigest: string;
    operationId: string;
    expectedPhrase: string;
    issuedAt: string;
    consumedAt?: string;
  } = { challengeId, intentUuid, repository, planDigest, operationId, expectedPhrase, issuedAt };
  if (consumedAt !== undefined) challenge.consumedAt = consumedAt;
  return challenge;
}

function validateAuditOutbox(
  v: JsonValue,
  path: string,
  issues: string[],
): MirrorAuditOutbox | null {
  if (!isObject(v)) {
    issues.push(`${path}: auditOutbox must be an object or null`);
    return null;
  }
  checkUnknownKeys(v, AUDIT_OUTBOX_KEYS, path, issues);
  const transactionId = v.transactionId;
  const digest = v.digest;
  const fields = v.fields;
  if (!isNonEmptyString(transactionId))
    issues.push(`${path}.transactionId: required non-empty string`);
  if (typeof digest !== "string") issues.push(`${path}.digest: required string`);
  const fieldRecord: Record<string, string> = {};
  if (!isObject(fields)) {
    issues.push(`${path}.fields: required object`);
  } else {
    for (const k of Object.keys(fields)) {
      const fv = fields[k];
      if (typeof fv !== "string") {
        issues.push(`${path}.fields.${k}: must be string`);
      } else {
        fieldRecord[k] = fv;
      }
    }
  }
  if (isNonEmptyString(transactionId) && typeof digest === "string" && isObject(fields)) {
    return { transactionId, digest, fields: fieldRecord };
  }
  return null;
}

function validateExpectedPrompt(
  v: JsonValue,
  path: string,
  issues: string[],
): MirrorExpectedPrompt | null {
  if (!isObject(v)) {
    issues.push(`${path}: expectedPrompt must be an object or null`);
    return null;
  }
  checkUnknownKeys(v, EXPECTED_PROMPT_KEYS, path, issues);
  const operation = reqEnum(v, "operation", OPERATIONS, "operation", path, issues);
  const issuedAt = reqTimestamp(v, "issuedAt", path, issues);
  const event = validateEvent(v.event, `${path}.event`, issues);
  const retryOf = validateRetryOf(v, path, issues);
  if (event === null || operation === undefined || issuedAt === undefined) return null;
  const prompt: {
    event: MirrorEventIdentity;
    operation: MirrorOperation;
    issuedAt: string;
    retryOf?: MirrorExpectedPrompt["retryOf"];
  } = { event, operation, issuedAt };
  if (retryOf) prompt.retryOf = retryOf;
  return prompt;
}

function validateRetryOf(
  v: { [k: string]: JsonValue },
  path: string,
  issues: string[],
): MirrorExpectedPrompt["retryOf"] | undefined {
  if (!("retryOf" in v) || v.retryOf === undefined) return undefined;
  const r = v.retryOf;
  if (!isObject(r)) {
    issues.push(`${path}.retryOf: must be an object`);
    return undefined;
  }
  const rEvent = validateEvent(r.event, `${path}.retryOf.event`, issues);
  const operationId = reqNonEmptyString(r, "operationId", `${path}.retryOf`, issues);
  if (rEvent && operationId !== undefined) return { event: rEvent, operationId };
  return undefined;
}

function validateReceiptMap(
  raw: JsonValue,
  issues: string[],
): Record<string, MirrorOperationReceipt> {
  const receipts: Record<string, MirrorOperationReceipt> = {};
  if (raw === undefined) return receipts;
  if (!isObject(raw)) {
    issues.push("$.receipts: must be an object");
    return receipts;
  }
  const keys = Object.keys(raw);
  if (keys.length > 1000) issues.push("$.receipts: exceeds 1000 entries");
  for (const k of keys) {
    const r = validateReceipt(raw[k], k, `$.receipts["${k}"]`, issues);
    if (r) receipts[k] = r;
  }
  return receipts;
}

function validateWarningList(raw: JsonValue, issues: string[]): MirrorWarning[] {
  const warnings: MirrorWarning[] = [];
  if (raw === undefined) return warnings;
  if (!Array.isArray(raw)) {
    issues.push("$.warnings: must be an array");
    return warnings;
  }
  if (raw.length > 1000) issues.push("$.warnings: exceeds 1000 entries");
  raw.forEach((w, idx) => {
    const parsed = validateWarning(w, `$.warnings[${idx}]`, issues);
    if (parsed) warnings.push(parsed);
  });
  return warnings;
}

function validateChallengeMap(
  raw: JsonValue,
  issues: string[],
): Record<string, MirrorRepairChallenge> {
  const challenges: Record<string, MirrorRepairChallenge> = {};
  if (raw === undefined) return challenges;
  if (!isObject(raw)) {
    issues.push("$.repairChallenges: must be an object");
    return challenges;
  }
  const keys = Object.keys(raw);
  if (keys.length > 100) issues.push("$.repairChallenges: exceeds 100 active entries");
  for (const k of keys) {
    const c = validateChallenge(raw[k], k, `$.repairChallenges["${k}"]`, issues);
    if (c) challenges[k] = c;
  }
  return challenges;
}

// SP-C06: issueNumber and provenance.issueNumber both null or same positive int.
function checkIssueNumberConsistency(
  root: { [k: string]: JsonValue },
  issueNumber: number | null,
  provenance: MirrorProvenance | null,
  issues: string[],
): void {
  if (provenance) {
    if (issueNumber === null)
      issues.push("$.issueNumber: must be set when provenance is present");
    else if (provenance.issueNumber !== issueNumber)
      issues.push("$.issueNumber: must equal provenance.issueNumber");
  } else if (root.provenance === null && issueNumber !== null) {
    issues.push("$.issueNumber: must be null when provenance is null");
  }
}

function parseRootIssueNumber(v: JsonValue, issues: string[]): number | null | undefined {
  if (v === null) return null;
  if (isPositiveInt(v)) return v;
  issues.push("$.issueNumber: must be null or positive integer");
  return undefined;
}

function parseOptionalPrompt(
  v: JsonValue,
  issues: string[],
): MirrorExpectedPrompt | undefined {
  if (v === null || v === undefined) return undefined;
  return validateExpectedPrompt(v, "$.expectedPrompt", issues) ?? undefined;
}

function parseOptionalOutbox(v: JsonValue, issues: string[]): MirrorAuditOutbox | null {
  if (v === null || v === undefined) return null;
  return validateAuditOutbox(v, "$.auditOutbox", issues);
}

function validateSnapshot(root: JsonValue, issues: string[]): MirrorStateSnapshot | null {
  if (!isObject(root)) {
    issues.push("$: Mirror block must be a JSON object");
    return null;
  }
  checkUnknownKeys(root, ROOT_KEYS, "$", issues);
  if (root.schema !== 1) issues.push("$.schema: must be 1");
  const revision = isNonNegativeInt(root.revision) ? root.revision : undefined;
  if (revision === undefined) issues.push("$.revision: required non-negative integer");

  const issueNumber = parseRootIssueNumber(root.issueNumber, issues);
  const provenance =
    root.provenance === null || root.provenance === undefined
      ? null
      : validateProvenance(root.provenance, "$.provenance", issues);
  checkIssueNumberConsistency(root, issueNumber ?? null, provenance, issues);

  const receipts = validateReceiptMap(root.receipts, issues);
  const warnings = validateWarningList(root.warnings, issues);
  const repairChallenges = validateChallengeMap(root.repairChallenges, issues);
  const expectedPrompt = parseOptionalPrompt(root.expectedPrompt, issues);
  const auditOutbox = parseOptionalOutbox(root.auditOutbox, issues);

  if (revision === undefined || issues.length > 0) return null;

  const snapshot: {
    revision: number;
    issueNumber: number | null;
    provenance: MirrorProvenance | null;
    receipts: Record<string, MirrorOperationReceipt>;
    warnings: MirrorWarning[];
    repairChallenges: Record<string, MirrorRepairChallenge>;
    expectedPrompt?: MirrorExpectedPrompt;
    auditOutbox?: MirrorAuditOutbox | null;
  } = {
    revision,
    issueNumber: issueNumber ?? null,
    provenance,
    receipts,
    warnings,
    repairChallenges,
    auditOutbox,
  };
  if (expectedPrompt) snapshot.expectedPrompt = expectedPrompt;
  return snapshot;
}

// ---------------------------------------------------------------------------
// Sentinel location + document parse.
// ---------------------------------------------------------------------------

export const EMPTY_MIRROR_STATE: MirrorStateSnapshot = {
  revision: 0,
  issueNumber: null,
  provenance: null,
  receipts: {},
  warnings: [],
  repairChallenges: {},
  auditOutbox: null,
};

function allIndexesOf(haystack: string, needle: string): number[] {
  const out: number[] = [];
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) break;
    out.push(at);
    from = at + needle.length;
  }
  return out;
}

export function parseMirrorStateDocument(document: string): MirrorStateParse {
  const starts = allIndexesOf(document, MIRROR_STATE_SENTINEL_START);
  const ends = allIndexesOf(document, MIRROR_STATE_SENTINEL_END);
  if (starts.length === 0 && ends.length === 0) {
    return { kind: "ok", snapshot: EMPTY_MIRROR_STATE, block: null };
  }
  if (starts.length !== 1 || ends.length !== 1) {
    return {
      kind: "invalid",
      issues: [
        `Mirror state block must appear exactly once (found ${starts.length} start / ${ends.length} end sentinels)`,
      ],
    };
  }
  const start = starts[0];
  const endSentinel = ends[0];
  if (endSentinel < start) {
    return { kind: "invalid", issues: ["Mirror end sentinel precedes start sentinel"] };
  }
  const jsonStart = start + MIRROR_STATE_SENTINEL_START.length;
  const json = document.slice(jsonStart, endSentinel);
  if (Buffer.byteLength(json, "utf-8") > MIRROR_CODEC_LIMITS.maxAggregateBytes) {
    return {
      kind: "invalid",
      issues: ["Mirror block exceeds aggregate byte limit"],
    };
  }
  let value: JsonValue;
  try {
    value = parseJsonStrict(json);
  } catch (err) {
    const e = err as JsonParseError;
    return {
      kind: "invalid",
      issues: [`Mirror JSON parse error at ${e.path ?? "$"}: ${e.message}`],
    };
  }
  const issues: string[] = [];
  const snapshot = validateSnapshot(value, issues);
  if (!snapshot || issues.length > 0) {
    return { kind: "invalid", issues };
  }
  return {
    kind: "ok",
    snapshot,
    block: { start, end: endSentinel + MIRROR_STATE_SENTINEL_END.length },
  };
}

// ---------------------------------------------------------------------------
// Canonical rendering (ordered objects -> whitespace-free JSON).
// ---------------------------------------------------------------------------

function renderRepository(r: RepositoryIdentity): unknown {
  return { owner: r.owner, name: r.name, canonical: r.canonical };
}

function renderBoundary(b: MirrorBoundary): unknown {
  if (b.kind === "phase-verified")
    return { kind: b.kind, phase: b.phase, instance: b.instance };
  if (b.kind === "parked")
    return { kind: b.kind, stage: b.stage, instance: b.instance };
  return { kind: b.kind, instance: b.instance };
}

function renderEvent(e: MirrorEventIdentity): unknown {
  return {
    intentUuid: e.intentUuid,
    boundary: renderBoundary(e.boundary),
    operation: e.operation,
  };
}

function renderCreateIdentity(c: MirrorCreateIdentity): unknown {
  return {
    schema: c.schema,
    intentUuid: c.intentUuid,
    intentDir: c.intentDir,
    repository: renderRepository(c.repository),
    operationId: c.operationId,
    preparedAt: c.preparedAt,
  };
}

function renderReceipt(r: MirrorOperationReceipt): unknown {
  const out: Record<string, unknown> = {
    key: r.key,
    event: renderEvent(r.event),
    operationId: r.operationId,
    status: r.status,
    preparedAt: r.preparedAt,
  };
  if (r.attemptedAt !== undefined) out.attemptedAt = r.attemptedAt;
  if (r.completedAt !== undefined) out.completedAt = r.completedAt;
  if (r.failureClass !== undefined) out.failureClass = r.failureClass;
  if (r.lastEffect !== undefined) out.lastEffect = r.lastEffect;
  if (r.createIdentity !== undefined)
    out.createIdentity = renderCreateIdentity(r.createIdentity);
  return out;
}

function renderWarning(w: MirrorWarning): unknown {
  return {
    operationId: w.operationId,
    operation: w.operation,
    classification: w.classification,
    summary: w.summary,
    occurredAt: w.occurredAt,
    retryable: w.retryable,
    effect: w.effect,
    source: w.source,
  };
}

function renderProvenance(p: MirrorProvenance): unknown {
  return {
    schema: p.schema,
    createIdentity: renderCreateIdentity(p.createIdentity),
    issueNumber: p.issueNumber,
    createdAt: p.createdAt,
  };
}

function renderChallenge(c: MirrorRepairChallenge): unknown {
  const out: Record<string, unknown> = {
    challengeId: c.challengeId,
    intentUuid: c.intentUuid,
    repository: renderRepository(c.repository),
    planDigest: c.planDigest,
    operationId: c.operationId,
    expectedPhrase: c.expectedPhrase,
    issuedAt: c.issuedAt,
  };
  if (c.consumedAt !== undefined) out.consumedAt = c.consumedAt;
  return out;
}

function renderExpectedPrompt(p: MirrorExpectedPrompt): unknown {
  const out: Record<string, unknown> = {
    event: renderEvent(p.event),
    operation: p.operation,
    issuedAt: p.issuedAt,
  };
  if (p.retryOf !== undefined)
    out.retryOf = {
      event: renderEvent(p.retryOf.event),
      operationId: p.retryOf.operationId,
    };
  return out;
}

function renderAuditOutbox(o: MirrorAuditOutbox): unknown {
  // fields render in insertion order; the reducer/store control field order.
  return { transactionId: o.transactionId, digest: o.digest, fields: o.fields };
}

export function renderMirrorStateJson(snapshot: MirrorStateSnapshot): string {
  const receipts: Record<string, unknown> = {};
  for (const k of Object.keys(snapshot.receipts)) {
    receipts[k] = renderReceipt(snapshot.receipts[k]);
  }
  const challenges: Record<string, unknown> = {};
  for (const k of Object.keys(snapshot.repairChallenges)) {
    challenges[k] = renderChallenge(snapshot.repairChallenges[k]);
  }
  const root = {
    schema: 1,
    revision: snapshot.revision,
    issueNumber: snapshot.issueNumber,
    provenance: snapshot.provenance ? renderProvenance(snapshot.provenance) : null,
    receipts,
    warnings: snapshot.warnings.map(renderWarning),
    repairChallenges: challenges,
    expectedPrompt: snapshot.expectedPrompt
      ? renderExpectedPrompt(snapshot.expectedPrompt)
      : null,
    auditOutbox: snapshot.auditOutbox ? renderAuditOutbox(snapshot.auditOutbox) : null,
  };
  return JSON.stringify(root);
}

export function renderMirrorStateBlock(snapshot: MirrorStateSnapshot): string {
  return `${MIRROR_STATE_SENTINEL_START}\n${renderMirrorStateJson(snapshot)}\n${MIRROR_STATE_SENTINEL_END}`;
}

// Splice a snapshot into the document, preserving every byte outside the block.
// `block` from parseMirrorStateDocument marks the existing block extent; null
// means append (blank line + block) after ensuring a trailing newline.
export function writeMirrorStateDocument(
  document: string,
  block: MirrorBlockRange | null,
  snapshot: MirrorStateSnapshot,
): string {
  const blockText = renderMirrorStateBlock(snapshot);
  if (block) {
    return document.slice(0, block.start) + blockText + document.slice(block.end);
  }
  if (document.length === 0) return `${blockText}\n`;
  const base = document.endsWith("\n") ? document : `${document}\n`;
  return `${base}\n${blockText}\n`;
}
